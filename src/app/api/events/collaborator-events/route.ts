import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2);
  console.log(`👥 [${requestId}] Starting collaborator events fetch...`);

  try {
    const { user_token } = await request.json();

    // Validazione input
    if (!user_token) {
      console.log(`❌ [${requestId}] Missing user_token`);
      return NextResponse.json({ 
        error: "Token utente mancante" 
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true, name: true, surname: true, email: true }
    });

    if (!user) {
      console.log(`❌ [${requestId}] User not found`);
      return NextResponse.json({ 
        error: "Utente non autorizzato" 
      }, { status: 401 });
    }

    console.log(`✅ [${requestId}] User found:`, { id: user.id, role: user.role });

    // Recupera tutti gli eventi dove l'utente è collaboratore
    const collaboratorEvents = await prisma.events.findMany({
      where: {
        collaborators: {
          some: {
            user_id: user.id
          }
        }
      },
      include: {
        location_: {
          select: {
            id: true,
            name: true,
            address: true,
            comune: true,
            provincia: true
          }
        },
        collaborators: {
          where: {
            user_id: user.id
          },
          select: {
            id: true,
            label: true,
            role: true,
            guest_enabled: true,
            vidimate_enabled_product: true,
            vidimate_enabled_entry: true
          }
        },
        products: {
          select: {
            id: true,
            label: true,
            price: true,
            category: true
          }
        },
        entry_types: {
          select: {
            id: true,
            label: true,
            price: true,
            type: true,
            category: true
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
        }
      },
      orderBy: {
        datetime_start: 'desc'
      }
    });

    console.log(`📊 [${requestId}] Found ${collaboratorEvents.length} events where user is collaborator`);

    // Aggiungi informazioni aggiuntive per ogni evento
    const eventsWithDetails = collaboratorEvents.map(event => {
      const now = new Date();
      const eventDate = event.datetime_start ? new Date(event.datetime_start) : null;
      const isUpcoming = eventDate && eventDate > now;
      const isPast = eventDate && eventDate <= now;

      return {
        ...event,
        // Informazioni aggiuntive
        is_upcoming: isUpcoming,
        is_past: isPast,
        collaborator_role: event.collaborators[0]?.role || 'collaborator',
        collaborator_label: event.collaborators[0]?.label || 'Collaboratore',
        permissions: {
          guest_enabled: event.collaborators[0]?.guest_enabled || false,
          vidimate_enabled_product: event.collaborators[0]?.vidimate_enabled_product || false,
          vidimate_enabled_entry: event.collaborators[0]?.vidimate_enabled_entry || false
        },
        products_count: event.products.length,
        entry_types_count: event.entry_types.length,
        music_genres_count: event.event_music_genres.length
      };
    });

    // Statistiche
    const stats = {
      total_events: eventsWithDetails.length,
      upcoming_events: eventsWithDetails.filter(e => e.is_upcoming).length,
      past_events: eventsWithDetails.filter(e => e.is_past).length,
      published_events: eventsWithDetails.filter(e => e.state === 'published').length,
      draft_events: eventsWithDetails.filter(e => e.state === 'draft').length
    };

    console.log(`📈 [${requestId}] Collaborator events stats:`, stats);

    return NextResponse.json({
      success: true,
      events: eventsWithDetails,
      stats,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in collaborator events API:`, {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Errori specifici
    if (error.name === 'PrismaClientValidationError') {
      return NextResponse.json({ 
        error: "Errore di validazione dei dati",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 400 });
    }

    if (error.name === 'PrismaClientKnownRequestError') {
      return NextResponse.json({ 
        error: "Errore del database",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: "Errore interno del server",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });

  } finally {
    console.log(`🔚 [${requestId}] Disconnecting Prisma...`);
    await prisma.$disconnect();
  }
}
