import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { event_id, user_token } = await request.json();

    console.log('🚫 Disable QR Request:', { event_id, user_token: user_token ? 'PROVIDED' : 'MISSING' });

    // Validazione dati con errori specifici
    const missingFields = [];
    
    if (!event_id) missingFields.push('event_id');
    if (!user_token) missingFields.push('user_token');

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: `Dati mancanti: ${missingFields.join(', ')}`,
        code: "MISSING_REQUIRED_FIELDS",
        missing_fields: missingFields,
        received_data: {
          event_id: event_id || 'NON FORNITO',
          user_token: user_token ? 'FORNITO' : 'NON FORNITO'
        }
      }, { status: 400 });
    }

    // Validazione tipo event_id
    const eventIdNum = parseInt(event_id);
    if (isNaN(eventIdNum) || eventIdNum <= 0) {
      return NextResponse.json({
        error: "event_id deve essere un numero intero valido maggiore di 0",
        code: "INVALID_EVENT_ID",
        received_event_id: event_id
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true, name: true, surname: true }
    });

    if (!user) {
      return NextResponse.json({
        error: "Accesso non autorizzato: token utente non valido",
        code: "INVALID_USER_TOKEN"
      }, { status: 401 });
    }

    console.log('👤 User verified:', { userId: user.id, role: user.role });

    // Verifica evento e permessi
    const event = await prisma.events.findUnique({
      where: { id: eventIdNum },
      select: {
        id: true,
        title: true,
        user_id: true,
        qr_enter: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!event) {
      return NextResponse.json({
        error: `Evento non trovato con ID: ${event_id}`,
        code: "EVENT_NOT_FOUND",
        event_id: event_id
      }, { status: 404 });
    }

    console.log('🎉 Event found:', { 
      eventId: event.id, 
      eventTitle: event.title,
      ownerId: event.user_id,
      hasQrCode: !!event.qr_enter 
    });

    // Verifica che l'utente sia il creatore dell'evento o admin
    if (event.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({
        error: "Non autorizzato: solo il creatore dell'evento può disattivare il QR code",
        code: "NOT_EVENT_OWNER",
        event_owner_id: event.user_id,
        your_id: user.id,
        your_role: user.role
      }, { status: 403 });
    }

    // Verifica che esista un QR code da disattivare
    if (!event.qr_enter) {
      return NextResponse.json({
        error: "Nessun QR code da disattivare: l'evento non ha un QR code attivo",
        code: "NO_QR_CODE_TO_DISABLE",
        event_id: eventIdNum
      }, { status: 400 });
    }

    console.log(`🚫 Disabling QR code for event ${eventIdNum}:`, {
      eventTitle: event.title,
      currentQr: event.qr_enter,
      userId: user.id,
      userName: `${user.name} ${user.surname}`
    });

    // Disattiva il QR code (imposta a null)
    const updatedEvent = await prisma.events.update({
      where: { id: eventIdNum },
      data: { 
        qr_enter: null,
        updated_at: new Date()
      },
      include: {
        entry_types: true,
        event_music_genres: {
          include: {
            music_genre: true,
          },
        },
        collaborators: {
          include: {
            user: true, // include l'utente per ogni collaboratore
          },
        },
        products: true,
        location_: true,
      },
    });

    console.log(`✅ QR code disabled successfully for event "${event.title}"`);

    // Log dell'operazione per audit
    console.log('📝 QR Disable Audit:', {
      timestamp: new Date().toISOString(),
      action: 'QR_CODE_DISABLED',
      event_id: eventIdNum,
      event_title: event.title,
      user_id: user.id,
      user_name: `${user.name} ${user.surname}`,
      disabled_qr: event.qr_enter,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: 'QR code disattivato con successo',
      disabled_qr_code: event.qr_enter,
      event: updatedEvent,
      metadata: {
        disabled_at: new Date().toISOString(),
        disabled_by: {
          id: user.id,
          name: `${user.name} ${user.surname}`
        }
      }
    }, { status: 200 });

  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    let errorStack = undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    }

    console.error('❌ Error disabling QR code:', {
      error: errorMessage,
      stack: errorStack,
      details: process.env.NODE_ENV === 'development' ? {
        message: errorMessage,
        timestamp: new Date().toISOString()
      } : undefined
    });

    return NextResponse.json({
      error: "Si è verificato un errore durante la disattivazione del QR code. Riprova.",
      code: "INTERNAL_SERVER_ERROR",
      details: process.env.NODE_ENV === 'development' ? {
        message: errorMessage,
        timestamp: new Date().toISOString()
      } : undefined
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}