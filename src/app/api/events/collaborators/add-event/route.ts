import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { event_id, collaborator_user_id, role, user_token } = await request.json();

    // Validazione dei dati richiesti
    if (!event_id || !collaborator_user_id || !user_token) {
      return NextResponse.json(
        { error: "Event ID, Collaborator User ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    // Verifica il token e ottieni l'utente che fa la richiesta
    const requestingUser = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        surname: true
      }
    });

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', requestingUser.email, 'Role:', requestingUser.role);

    // Verifica che l'evento esista
    const event = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: {
        id: true,
        title: true,
        user_id: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento non trovato" },
        { status: 404 }
      );
    }

    console.log('🎟️ Evento trovato:', event.title, 'Proprietario ID:', event.user_id);

    // Verifica autorizzazione: deve essere il proprietario dell'evento o SUPERADMIN
    const isEventOwner = event.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';

    console.log('🔐 Verifica autorizzazione:', {
      isEventOwner,
      isSuperAdmin,
      eventOwnerId: event.user_id,
      requestingUserId: requestingUser.id
    });

    if (!isEventOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Non sei autorizzato ad aggiungere collaboratori a questo evento" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata');

    // Verifica che l'utente da aggiungere esista
    const userToAdd = await prisma.users.findUnique({
      where: { id: parseInt(collaborator_user_id) },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        nickname: true,
        picture: true
      }
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: "Utente da aggiungere non trovato" },
        { status: 404 }
      );
    }

    console.log('👤 Utente da aggiungere:', userToAdd.email);

    // Verifica che il collaboratore non sia già stato aggiunto
    const existingCollaborator = await prisma.collaborators.findFirst({
      where: {
        event_id: parseInt(event_id),
        user_id: parseInt(collaborator_user_id)
      }
    });

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "Questo utente è già un collaboratore di questo evento" },
        { status: 409 }
      );
    }

    // Verifica che non stia aggiungendo se stesso come collaboratore (se è il proprietario)
    if (isEventOwner && requestingUser.id === parseInt(collaborator_user_id)) {
      return NextResponse.json(
        { error: "Non puoi aggiungere te stesso come collaboratore del tuo evento" },
        { status: 400 }
      );
    }

    console.log('🚀 Creazione collaboratore...');

    // Aggiungi il collaboratore (senza il campo role se non esiste nella tabella collaborators)
    const newCollaborator = await prisma.collaborators.create({
      data: {
        event_id: parseInt(event_id),
        user_id: parseInt(collaborator_user_id),
        // Rimuovi il campo role se non esiste nella tabella collaborators
        // Il ruolo viene preso dalla tabella users
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            nickname: true,
            picture: true,
            role: true // Includi il role dalla tabella users
          }
        }
      }
    });

    console.log('✅ Collaboratore creato:', newCollaborator.id);

    // Recupera l'evento aggiornato con tutti i collaboratori
    const updatedEvent = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      include: {
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
                role: true // Includi il role dalla tabella users
              }
            }
          }
        },
        products: true,
        entry_types: true,
        event_music_genres: {
          include: {
            music_genre: true
          }
        },
        location: true
      }
    });

    console.log('✅ Evento aggiornato recuperato con', updatedEvent?.collaborators?.length, 'collaboratori');

    return NextResponse.json(updatedEvent, { status: 201 });

  } catch (error) {
    console.error("❌ Errore aggiungendo collaboratore:", error);
    
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