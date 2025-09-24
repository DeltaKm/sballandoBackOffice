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

    console.log('🔄 Richiesta ritiro ingressi:', { 
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
      include: { event: true }
    });

    if (!originalEntry) {
      return NextResponse.json(
        { error: "Ingresso non trovato" },
        { status: 404 }
      );
    }

    console.log('🎫 Ingresso originale trovato:', originalEntry.label, 'Evento:', originalEntry.event.title);

    // Verifica autorizzazione (deve essere il proprietario dell'ingresso originale o SUPERADMIN)
    if (originalEntry.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non autorizzato a ritirare questi ingressi" },
        { status: 403 }
      );
    }

    // Trova tutti gli ingressi dei collaboratori con stesso label
    const collaboratorEntries = await prisma.entry_types.findMany({
      where: {
        event_id: originalEntry.event_id,
        label: originalEntry.label,
        user_id: {
          not: user.id // Esclude gli ingressi dell'utente che fa la richiesta
        },
        stock: {
          gt: 0 // Solo quelli con stock > 0
        }
      }
    });

    if (collaboratorEntries.length === 0) {
      return NextResponse.json(
        { error: "Nessun ingresso da ritirare dai collaboratori" },
        { status: 400 }
      );
    }

    console.log('📦 Trovati', collaboratorEntries.length, 'ingressi da ritirare');

    // Recupera informazioni degli utenti separatamente
    const userIds = collaboratorEntries.map(entry => entry.user_id).filter(Boolean);
    const users = await prisma.users.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true
      }
    });

    // Mappa utenti per ID per facile accesso
    const usersMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<number, typeof users[0]>);

    // Calcola totale da ritirare
    const totalToWithdraw = collaboratorEntries.reduce((sum, entry) => sum + (entry.stock || 0), 0);
    
    console.log('📊 Totale da ritirare:', totalToWithdraw);

    // Esegui il ritiro in transazione
    const result = await prisma.$transaction(async (tx) => {
      let totalWithdrawn = 0;
      const deletedEntries = [];

      // Per ogni ingresso dei collaboratori
      for (const collabEntry of collaboratorEntries) {
        const stockToWithdraw = collabEntry.stock || 0;
        
        if (stockToWithdraw > 0) {
          const userInfo = usersMap[collabEntry.user_id];
          console.log(`🔄 Ritirando ${stockToWithdraw} da ${userInfo?.email || `User ${collabEntry.user_id}`} e cancellando il record`);

          // Cancella completamente il record del collaboratore
          await tx.entry_types.delete({
            where: { id: collabEntry.id }
          });

          deletedEntries.push({
            id: collabEntry.id,
            user_email: userInfo?.email,
            stock: stockToWithdraw
          });

          totalWithdrawn += stockToWithdraw;
        }
      }

      // Aggiungi lo stock ritirato all'ingresso originale
      await tx.entry_types.update({
        where: { id: parseInt(entry_type_id) },
        data: {
          stock: (originalEntry.stock || 0) + totalWithdrawn
        }
      });

      console.log(`✅ Ritirato totale di ${totalWithdrawn} ingressi e cancellati ${deletedEntries.length} record`);
      console.log('🗑️ Record cancellati:', deletedEntries);
      
      return { totalWithdrawn, deletedEntries };
    });

    // Recupera l'evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: originalEntry.event_id },
      include: {
        entry_types: {
          orderBy: {
            created_at: 'desc'
          }
        },
        collaborators: {
          include: {
            user: {
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
            music_genre: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        location: true
      }
    });

    console.log('✅ Evento aggiornato recuperato');

    return NextResponse.json(updatedEvent);

  } catch (error) {
    console.error("❌ Errore ritiro ingressi:", error);
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