import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const { 
      user_token, 
      collaborator_id, 
      vidimate_enabled_entry, 
      vidimate_enabled_product, 
      guest_enabled 
    } = await request.json();

    // Validazione
    if (!user_token || !collaborator_id) {
      return NextResponse.json(
        { error: "User token e collaborator ID sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🔄 Richiesta aggiornamento ruoli collaboratore:', { 
      collaborator_id,
      vidimate_enabled_entry,
      vidimate_enabled_product,
      guest_enabled,
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica utente che fa la richiesta
    const requestingUser = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true
      }
    });

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', requestingUser.email, 'Role:', requestingUser.role);

    // Trova il collaboratore e verifica autorizzazioni
    const collaborator = await prisma.collaborators.findUnique({
      where: { id: parseInt(collaborator_id) },
      include: {
        events: {
          select: {
            id: true,
            title: true,
            user_id: true
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

    console.log('👤 Collaboratore trovato per evento:', collaborator.events.title);

    // Verifica autorizzazione: deve essere il proprietario dell'evento o SUPERADMIN
    const isEventOwner = collaborator.events.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';

    if (!isEventOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Non sei autorizzato a modificare i ruoli di questo collaboratore" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata');

    // Prepara i dati da aggiornare (solo i campi forniti)
    const updateData: any = {};
    
    if (vidimate_enabled_entry !== undefined) {
      updateData.vidimate_enabled_entry = vidimate_enabled_entry;
    }
    
    if (vidimate_enabled_product !== undefined) {
      updateData.vidimate_enabled_product = vidimate_enabled_product;
    }
    
    if (guest_enabled !== undefined) {
      updateData.guest_enabled = guest_enabled;
    }

    console.log('📝 Dati da aggiornare:', updateData);

    // Aggiorna il collaboratore
    const updatedCollaborator = await prisma.collaborators.update({
      where: { id: parseInt(collaborator_id) },
      data: updateData
    });

    console.log('✅ Collaboratore aggiornato:', updatedCollaborator.id);

    // Recupera l'evento aggiornato con tutte le relazioni
    const updatedEvent = await prisma.events.findUnique({
      where: { id: collaborator.events.id },
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
        entry_types: {
          orderBy: {
            created_at: 'desc'
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

    console.log('✅ Evento aggiornato recuperato con', updatedEvent?.collaborators?.length, 'collaboratori');

    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error("❌ Errore aggiornamento ruoli collaboratore:", error);
    
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