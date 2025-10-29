import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { event_id, user_token } = await request.json();

    console.log('🎯 Generate QR Request:', { event_id, user_token: user_token ? 'PROVIDED' : 'MISSING' });

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
        title: true,        // Corretto: era 'name'
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


    // Verifica che l'utente sia il creatore dell'evento o admin
    if (event.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({
        error: "Non autorizzato: solo il creatore dell'evento può generare il QR code",
        code: "NOT_EVENT_OWNER",
        event_owner_id: event.user_id,
        your_id: user.id,
        your_role: user.role
      }, { status: 403 });
    }

    // Genera codice QR univoco
    const generateUniqueQrCode = async (): Promise<string> => {
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Genera una stringa random di 32 caratteri (16 bytes in hex)
        const randomToken = crypto.randomBytes(16).toString('hex').toUpperCase();
        // Aggiunge il prefisso qr_enter@ prima del token
        const qrCodeWithPrefix = `qr_enter@${randomToken}`;
        
        console.log(`🔄 Attempt ${attempts}: Generated QR code: ${qrCodeWithPrefix}`);
        
        // Verifica che sia univoca nel database
        const existingEvent = await prisma.events.findFirst({
          where: { 
            qr_enter: qrCodeWithPrefix,
            id: { not: eventIdNum } // Escludi l'evento corrente
          },
          select: { id: true, title: true }
        });
        
        if (!existingEvent) {
          console.log(`✅ Unique QR code generated: ${qrCodeWithPrefix}`);
          return qrCodeWithPrefix; // Ritorna il codice completo con prefisso
        } else {
          console.log(`⚠️ QR code ${qrCodeWithPrefix} already exists for event ${existingEvent.id} (${existingEvent.title})`);
        }
      }
      
      throw new Error(`Impossibile generare codice univoco dopo ${maxAttempts} tentativi`);
    };

    console.log('🔄 Starting QR code generation...');
    const newQrCode = await generateUniqueQrCode(); // Ora contiene già qr_enter@XXXXX

    console.log(`🎯 Generating QR code for event ${eventIdNum}:`, {
      eventTitle: event.title,
      previousQr: event.qr_enter ? 'EXISTED' : 'NEW',
      newQrCode: newQrCode, // Ora mostra il codice completo
      userId: user.id,
      userName: `${user.name} ${user.surname}`
    });

    // Aggiorna l'evento con il nuovo QR code
    const updatedEvent = await prisma.events.update({
      where: { id: eventIdNum },
      data: { 
        qr_enter: newQrCode, // Ora salva direttamente il codice completo
        updated_at: new Date()
      },
      include: {
        entry_types: true,
        event_music_genres: {
          include: {
            music_genres: true,
          },
        },
        collaborators: {
          include: {
            users: true, // include l'utente per ogni collaboratore
          },
        },
        products: true,
        locations: true,
      },
    });

    console.log(`✅ QR code generated successfully for event "${event.title}": ${newQrCode}`);

    // Log dell'operazione per audit
    console.log('📝 QR Generation Audit:', {
      timestamp: new Date().toISOString(),
      action: 'QR_CODE_GENERATED',
      event_id: eventIdNum,
      event_title: event.title,     // Corretto: era 'event_name'
      user_id: user.id,
      user_name: `${user.name} ${user.surname}`,
      previous_qr: event.qr_enter || null,
      new_qr: newQrCode, // Ora logga il codice completo
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      message: event.qr_enter ? 'QR code rigenerato con successo' : 'QR code generato con successo',
      qr_code: newQrCode, // CORRETTO: Ora restituisce il codice completo con prefisso
      event: updatedEvent,
      metadata: {
        generated_at: new Date().toISOString(),
        generated_by: {
          id: user.id,
          name: `${user.name} ${user.surname}`
        },
        was_regeneration: !!event.qr_enter
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('❌ Error generating QR code:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack available',
      timestamp: new Date().toISOString()
    });

    // Errori specifici
    if (error instanceof Error && error.message.includes('Impossibile generare codice univoco')) {
      return NextResponse.json({
        error: "Impossibile generare un codice QR univoco. Riprova tra qualche minuto.",
        code: "QR_GENERATION_FAILED",
        details: "Troppi codici già esistenti nel sistema"
      }, { status: 500 });
    }

    return NextResponse.json({
      error: "Si è verificato un errore durante la generazione del QR code. Riprova.",
      code: "INTERNAL_SERVER_ERROR",
      details: process.env.NODE_ENV === 'development' ? {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      } : undefined
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}

// Endpoint per verificare lo stato del QR code (opzionale)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const user_token = searchParams.get('user_token');

    if (!event_id || !user_token) {
      return NextResponse.json({
        error: "Parametri mancanti: event_id e user_token sono richiesti",
        code: "MISSING_PARAMETERS"
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({
        error: "Token utente non valido",
        code: "INVALID_USER_TOKEN"
      }, { status: 401 });
    }

    // Verifica evento
    const event = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: {
        id: true,
        title: true,        // Corretto: era 'name'
        user_id: true,
        qr_enter: true,
        updated_at: true
      }
    });

    if (!event) {
      return NextResponse.json({
        error: "Evento non trovato",
        code: "EVENT_NOT_FOUND"
      }, { status: 404 });
    }

    if (event.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({
        error: "Non autorizzato",
        code: "NOT_AUTHORIZED"
      }, { status: 403 });
    }

    return NextResponse.json({
      event_id: event.id,
      event_title: event.title,
      has_qr_code: !!event.qr_enter, // CORRETTO: Rimosso il prefisso extra
      qr_code: event.qr_enter,
      last_updated: event.updated_at
    });

  } catch (error) {
    console.error('Error checking QR status:', error);
    return NextResponse.json({
      error: "Errore del server",
      code: "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}