import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { event_id, music_genre_id, user_token } = await request.json();

    // Validazione dei dati richiesti
    if (!event_id || !music_genre_id || !user_token) {
      return NextResponse.json(
        { error: "Event ID, Music Genre ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🎵 Richiesta aggiunta genere musicale:', { 
      event_id, 
      music_genre_id, 
      user_token: user_token.substring(0, 8) + '...' 
    });

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

    // Verifica autorizzazione: deve essere il proprietario dell'evento, collaboratore o SUPERADMIN
    const isEventOwner = event.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';
    
    // Verifica se è collaboratore dell'evento
    let isCollaborator = false;
    try {
      const collaborator = await prisma.collaborators.findFirst({
        where: {
          event_id: parseInt(event_id),
          user_id: requestingUser.id
        }
      });
      isCollaborator = !!collaborator;
    } catch (collaboratorError) {
      console.log('⚠️ Errore verifica collaboratore (continuo):', collaboratorError);
    }

    console.log('🔐 Verifica autorizzazione:', {
      isEventOwner,
      isSuperAdmin,
      isCollaborator
    });

    if (!isEventOwner && !isSuperAdmin && !isCollaborator) {
      return NextResponse.json(
        { error: "Non sei autorizzato a modificare i generi musicali di questo evento" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata');

    // Verifica che il genere musicale esista
    const musicGenre = await prisma.music_genres.findUnique({
      where: { id: parseInt(music_genre_id) },
      select: {
        id: true,
        label: true
      }
    });

    if (!musicGenre) {
      return NextResponse.json(
        { error: "Genere musicale non trovato" },
        { status: 404 }
      );
    }

    console.log('🎵 Genere musicale trovato:', musicGenre.label);

    // Verifica che il genere non sia già stato aggiunto all'evento
    const existingEventGenre = await prisma.event_music_genres.findFirst({
      where: {
        event_id: parseInt(event_id),
        music_genre_id: parseInt(music_genre_id)
      }
    });

    if (existingEventGenre) {
      return NextResponse.json(
        { error: "Questo genere musicale è già stato aggiunto all'evento" },
        { status: 409 }
      );
    }

    console.log('🚀 Aggiunta genere musicale all\'evento...');

    // Aggiungi il genere musicale all'evento
    const newEventGenre = await prisma.event_music_genres.create({
      data: {
        event_id: parseInt(event_id),
        music_genre_id: parseInt(music_genre_id)
      },
      include: {
        music_genre: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });

    console.log('✅ Genere musicale aggiunto:', newEventGenre.id);

    // Recupera l'evento aggiornato con tutti i generi musicali
    const updatedEvent = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      include: {
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
        entry_types: true,
        products: true,
        location: true
      }
    });

    console.log('✅ Evento aggiornato recuperato con', updatedEvent?.event_music_genres?.length, 'generi musicali');

    return NextResponse.json(updatedEvent, { status: 201 });

  } catch (error) {
    console.error("❌ Errore aggiungendo genere musicale:", error);
    
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

export async function DELETE(request: NextRequest) {
  try {
    const { event_id, music_genre_id, user_token } = await request.json();

    // Validazione dei dati richiesti
    if (!event_id || !music_genre_id || !user_token) {
      return NextResponse.json(
        { error: "Event ID, Music Genre ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🗑️ Richiesta rimozione genere musicale:', { 
      event_id, 
      music_genre_id, 
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica il token e ottieni l'utente che fa la richiesta
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

    // Verifica autorizzazione
    const isEventOwner = event.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';
    
    let isCollaborator = false;
    try {
      const collaborator = await prisma.collaborators.findFirst({
        where: {
          event_id: parseInt(event_id),
          user_id: requestingUser.id
        }
      });
      isCollaborator = !!collaborator;
    } catch (e) {
      console.log('⚠️ Errore verifica collaboratore:', e);
    }

    if (!isEventOwner && !isSuperAdmin && !isCollaborator) {
      return NextResponse.json(
        { error: "Non sei autorizzato a modificare i generi musicali di questo evento" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata per rimozione');

    // Verifica che l'associazione evento-genere esista
    const eventGenre = await prisma.event_music_genres.findFirst({
      where: {
        event_id: parseInt(event_id),
        music_genre_id: parseInt(music_genre_id)
      }
    });

    if (!eventGenre) {
      return NextResponse.json(
        { error: "Questo genere musicale non è associato all'evento" },
        { status: 404 }
      );
    }

    console.log('🗑️ Rimozione genere musicale...');

    // Rimuovi il genere musicale dall'evento
    await prisma.event_music_genres.delete({
      where: { id: eventGenre.id }
    });

    console.log('✅ Genere musicale rimosso');

    // Recupera l'evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      include: {
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
        entry_types: true,
        products: true,
        location: true
      }
    });

    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error("❌ Errore rimuovendo genere musicale:", error);
    
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

const handleToggleGenre = async (genreId: number, isRemoving: boolean = false) => {
  if (!user?.token) {
    alert('Devi essere loggato per modificare i generi musicali');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`/api/music-genres/add-event`, {
      method: isRemoving ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event_id: event.id,
        music_genre_id: genreId,
        user_token: user.token 
      }),
    });

    if (res.ok) {
      const updatedEvent = await res.json();
      onUpdate?.(updatedEvent);
      
      // Se abbiamo aggiunto un genere, aggiorna i risultati di ricerca
      if (!isRemoving) {
        searchGenres();
      }
    } else {
      const error = await res.json();
      alert(error.error || 'Errore durante l\'operazione');
    }
  } catch (err) {
    console.error('Error updating genre:', err);
    alert('Errore di connessione');
  } finally {
    setLoading(false);
  }
};