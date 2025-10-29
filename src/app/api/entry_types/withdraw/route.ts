import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { entry_type_id, user_token } = await request.json();

    // Validazione
    if (!entry_type_id || !user_token) {
      return NextResponse.json(
        { error: "Entry Type ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🔄 Richiesta ritiro ingressi collaboratori:', { 
      entry_type_id,
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        surname: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', user.email, 'Role:', user.role);

    // Verifica entry type originale
    const originalEntry = await prisma.entry_types.findUnique({
      where: { id: parseInt(entry_type_id) },
      include: { events: true }
    });

    if (!originalEntry) {
      return NextResponse.json(
        { error: "Ingresso non trovato" },
        { status: 404 }
      );
    }

    console.log('🎫 Ingresso originale trovato:', originalEntry.label, 'Evento:', originalEntry.events!.title);

    // Verifica autorizzazione (deve essere il proprietario dell'ingresso originale o SUPERADMIN)
    if (originalEntry.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non autorizzato a ritirare questi ingressi" },
        { status: 403 }
      );
    }

    // MODIFICA PRINCIPALE: Trova solo gli ingressi dei collaboratori
    // Recupera prima i collaboratori dell'evento
    const collaborators = await prisma.collaborators.findMany({
      where: {
        event_id: originalEntry.event_id || 0,
        user_id: {
          not: user.id // Esclude il proprietario dell'evento
        }
      },
      select: {
        user_id: true,
        users: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true
          }
        }
      }
    });

    if (collaborators.length === 0) {
      return NextResponse.json(
        { error: "Nessun collaboratore trovato per questo evento" },
        { status: 400 }
      );
    }

    const collaboratorUserIds = collaborators.map(c => c.user_id);
    console.log('👥 Collaboratori trovati:', collaborators.length, 'IDs:', collaboratorUserIds);

    // AGGIUNGI DEBUG: Trova tutti gli ingressi dell'evento per debugging
    const allEventEntries = await prisma.entry_types.findMany({
      where: {
        event_id: originalEntry.event_id
      },
      select: {
        id: true,
        label: true,
        user_id: true,
        stock: true
      }
    });
    
    console.log('🔍 DEBUG - Tutti gli ingressi dell\'evento:', allEventEntries);

    // Trova gli ingressi SOLO dei collaboratori con stesso label
    const collaboratorEntries = await prisma.entry_types.findMany({
      where: {
        event_id: originalEntry.event_id,
        label: originalEntry.label,
        user_id: {
          in: collaboratorUserIds.filter(id => id !== null) as number[] // Filtra i null
        },
        stock: {
          gt: 0 // Solo quelli con stock > 0
        }
      }
    });

    console.log('📦 DEBUG - Query collaboratori:', {
      event_id: originalEntry.event_id,
      label: originalEntry.label,
      user_ids: collaboratorUserIds.filter(id => id !== null),
      found: collaboratorEntries.length
    });

    if (collaboratorEntries.length === 0) {
      // AGGIUNGI DEBUG: Cerca senza filtro stock per vedere se esistono
      const allCollabEntries = await prisma.entry_types.findMany({
        where: {
          event_id: originalEntry.event_id,
          label: originalEntry.label,
          user_id: {
            in: collaboratorUserIds.filter(id => id !== null) as number[]
          }
        }
      });
      
      console.log('🔍 DEBUG - Ingressi collaboratori senza filtro stock:', allCollabEntries);
      
      return NextResponse.json(
        { 
          error: "Nessun ingresso da ritirare dai collaboratori",
          debug: {
            total_event_entries: allEventEntries.length,
            collaborator_entries_all: allCollabEntries.length,
            collaborator_entries_with_stock: collaboratorEntries.length,
            original_label: originalEntry.label,
            collaborator_ids: collaboratorUserIds.filter(id => id !== null)
          }
        },
        { status: 400 }
      );
    }

    console.log('📦 Trovati', collaboratorEntries.length, 'ingressi da ritirare dai collaboratori');

    // Mappa collaboratori per ID per facile accesso (FIX: gestisci user_id nullable)
    const collaboratorsMap = collaborators.reduce((acc, collab) => {
      if (collab.user_id && collab.users) {
        acc[collab.user_id] = collab.users;
      }
      return acc;
    }, {} as Record<number, any>);

    // Calcola totale da ritirare
    const totalToWithdraw = collaboratorEntries.reduce((sum, entry) => sum + (entry.stock ?? 0), 0);
    
    console.log('📊 Totale da ritirare dai collaboratori:', totalToWithdraw);

    // Verifica che ci siano effettivamente ingressi da ritirare
    if (totalToWithdraw === 0) {
      return NextResponse.json(
        { error: "Nessun ingresso disponibile da ritirare dai collaboratori" },
        { status: 400 }
      );
    }

    // Esegui il ritiro in transazione
    const result = await prisma.$transaction(async (tx) => {
      let totalWithdrawn = 0;
      const deletedEntries = [];

      // Per ogni ingresso dei collaboratori
      for (const collabEntry of collaboratorEntries) {
        const stockToWithdraw = collabEntry.stock ?? 0;
        
        if (stockToWithdraw > 0 && collabEntry.user_id) {
          const collabInfo = collaboratorsMap[collabEntry.user_id];
          console.log(`🔄 Ritirando ${stockToWithdraw} dal collaboratore ${collabInfo?.email ?? `User ${collabEntry.user_id}`} e cancellando il record`);

          // Cancella completamente il record del collaboratore
          await tx.entry_types.delete({
            where: { id: collabEntry.id }
          });

          deletedEntries.push({
            id: collabEntry.id,
            collaborator_email: collabInfo?.email,
            collaborator_name: `${collabInfo?.name ?? ''} ${collabInfo?.surname ?? ''}`,
            stock: stockToWithdraw
          });

          totalWithdrawn += stockToWithdraw;
        }
      }

      // Aggiungi lo stock ritirato all'ingresso originale
      await tx.entry_types.update({
        where: { id: parseInt(entry_type_id) },
        data: {
          stock: (originalEntry.stock ?? 0) + totalWithdrawn
        }
      });

      console.log(`✅ Ritirato totale di ${totalWithdrawn} ingressi dai collaboratori e cancellati ${deletedEntries.length} record`);
      console.log('🗑️ Record collaboratori cancellati:', deletedEntries);
      
      return { totalWithdrawn, deletedEntries };
    });

    // Recupera l'evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: originalEntry.event_id || 0 },
      include: {
        entry_types: {
          orderBy: {
            created_at: 'desc'
          }
        },
        collaborators: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                nickname: true,
                picture: true,
                role: true
              }
            }
          }
        },
        products: {
          orderBy: {
            created_at: 'desc'
          }
        },
        event_music_genres: {
          include: {
            music_genres: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        locations: true
      }
    });

    console.log('✅ Evento aggiornato recuperato con ingressi ritirati dai collaboratori');

    return NextResponse.json({
      ...updatedEvent,
      withdraw_result: {
        total_withdrawn: result.totalWithdrawn,
        deleted_entries: result.deletedEntries,
        message: `Ritirati ${result.totalWithdrawn} ingressi da ${result.deletedEntries.length} collaboratori`
      }
    });

  } catch (error) {
    console.error("❌ Errore ritiro ingressi collaboratori:", error);
    return NextResponse.json(
      { 
        error: "Errore interno del server: " + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}