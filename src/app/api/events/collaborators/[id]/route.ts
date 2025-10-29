import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: collaboratorId } = await params;

  try {
    const { user_token } = await request.json();

    // Validazione input
    if (!user_token || !collaboratorId) {
      return NextResponse.json(
        { error: "Token utente e ID collaboratore sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🗑️ Richiesta rimozione collaboratore:', { collaboratorId, user_token: user_token.substring(0, 8) + '...' });

    // Verifica utente che fa la richiesta
    const requestingUser = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', requestingUser.email, 'Role:', requestingUser.role);

    // Trova il collaboratore e l'evento associato
    const collaborator = await prisma.collaborators.findUnique({
      where: { id: parseInt(collaboratorId) },
      include: {
        events: {
          select: {
            id: true,
            title: true,
            user_id: true
          }
        },
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

    if (!collaborator) {
      return NextResponse.json(
        { error: "Collaboratore non trovato" },
        { status: 404 }
      );
    }

    console.log('👤 Collaboratore trovato:', collaborator.users?.email, 'per evento:', collaborator.events.title);

    // Verifica autorizzazione: deve essere il proprietario dell'evento o SUPERADMIN
    const isEventOwner = collaborator.events.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';

    if (!isEventOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Non sei autorizzato a rimuovere questo collaboratore" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata per rimozione');

    // Esegui la rimozione in transazione per garantire consistenza
    const result = await prisma.$transaction(async (tx) => {
      const eventId = collaborator.events.id;
      const userId = collaborator.users?.id;

      if (!userId) {
        throw new Error("ID utente del collaboratore non trovato");
      }

      // 1. Elimina tutti i prodotti assegnati al collaboratore per questo evento
      const deletedProducts = await tx.products.deleteMany({
        where: {
          event_id: eventId,
          user_id: userId
        }
      });

      console.log(`🗑️ Eliminati ${deletedProducts.count} prodotti del collaboratore`);

      // 2. Elimina tutti gli ingressi assegnati al collaboratore per questo evento
      const deletedEntries = await tx.entry_types.deleteMany({
        where: {
          event_id: eventId,
          user_id: userId
        }
      });

      console.log(`🗑️ Eliminati ${deletedEntries.count} ingressi del collaboratore`);

      // 3. Elimina il record del collaboratore
      await tx.collaborators.delete({
        where: { id: parseInt(collaboratorId) }
      });

      console.log(`✅ Collaboratore rimosso dall'evento`);

      return {
        deletedProducts: deletedProducts.count,
        deletedEntries: deletedEntries.count
      };
    });

    // Recupera l'evento aggiornato con tutti i collaboratori rimanenti
    const updatedEvent = await prisma.events.findUnique({
      where: { id: collaborator.event_id },
      include: {
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
        products: true,
        entry_types: true,
        event_music_genres: {
          include: {
            music_genres: true
          }
        },
        locations: true
      }
    });


    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error("❌ Errore nella rimozione del collaboratore:", error);
    
    return NextResponse.json(
      { 
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}