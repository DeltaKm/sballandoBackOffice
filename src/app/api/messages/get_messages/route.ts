import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_token, event_id } = body;

    console.log('🔍 Get messages API called:', { 
      hasToken: !!user_token, 
      event_id 
    });

    // Validazione input
    if (!user_token || !event_id) {
      return NextResponse.json({
        success: false,
        error: 'Parametri mancanti: user_token e event_id sono richiesti'
      }, { status: 400 });
    }

    const eventIdNum = parseInt(event_id.toString());
    if (isNaN(eventIdNum)) {
      return NextResponse.json({
        success: false,
        error: 'ID evento non valido'
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { 
        id: true, 
        name: true, 
        surname: true, 
        email: true,
        role: true 
      }
    });

    if (!user) {
      console.log('❌ User not found with token');
      return NextResponse.json({
        success: false,
        error: 'Token utente non valido'
      }, { status: 401 });
    }

    console.log('✅ User found:', { id: user.id, name: `${user.name} ${user.surname}` });

    // Verifica evento
    const event = await prisma.events.findUnique({
      where: { id: eventIdNum },
      select: {
        id: true,
        title: true,
        user_id: true,
        collaborators: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!event) {
      console.log('❌ Event not found:', eventIdNum);
      return NextResponse.json({
        success: false,
        error: 'Evento non trovato'
      }, { status: 404 });
    }

    // Verifica accesso (proprietario, collaboratore o superadmin)
    const isOwner = event.user_id === user.id;
    const isCollaborator = event.collaborators.some(collab => collab.user_id === user.id);
    const isSuperAdmin = user.role === 'SUPERADMIN';

    if (!isOwner && !isCollaborator && !isSuperAdmin) {
      console.log('❌ User not authorized for event:', { 
        userId: user.id, 
        eventOwnerId: event.user_id,
        isCollaborator,
        role: user.role 
      });
      return NextResponse.json({
        success: false,
        error: 'Non sei autorizzato ad accedere ai messaggi di questo evento'
      }, { status: 403 });
    }

    console.log('✅ Authorization passed, fetching messages...');

    // ✅ AGGIUNGI DEBUG: Verifica connessione e tabella
    try {
      // Test connessione database
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection OK');
      
      // Verifica se la tabella messages esiste
      const tableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'messages'
      `;
      console.log('📋 Messages table exists:', tableExists);
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Errore di connessione al database'
      }, { status: 503 });
    }

    // ✅ PROVA QUERY SEMPLIFICATA PRIMA
    console.log('🔍 Trying simplified query first...');
    
    const messageCount = await prisma.messages.count({
      where: {
        event_id: eventIdNum
      }
    });
    
    console.log('📊 Message count for event:', messageCount);

    // Se il count funziona, prova la query completa
    const messages = await prisma.messages.findMany({
      where: {
        event_id: eventIdNum,
        receiver_id: null // Solo messaggi pubblici
      },
      include: {
        spotify_playlist:{
          select: {
            title: true,
            subtitle: true,
            cover: true
          }
        },
        sender: {
          select: {
            id: true,
            name: true,
            surname: true,
            nickname: true,
            email: true,
            picture: true
          }
        }
      },
      orderBy: {
        created_at: 'asc' // Ordina dal più vecchio al più nuovo
      },
      take: 100 // ✅ Limita i risultati per test
    });

    console.log('✅ Messages retrieved:', { 
      eventId: eventIdNum,
      messagesCount: messages.length 
    });

    // Formatta i messaggi per il frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      message: msg.message,
      created_at: msg.created_at!.toISOString(),
      sender: {
        id: msg.sender!.id,
        name: msg.sender!.name,
        surname: msg.sender!.surname,
        nickname: msg.sender!.nickname,
        email: msg.sender!.email,
        picture: msg.sender!.picture
      },
      // Se il messaggio ha dati Spotify, includili
      spotify_playlist: msg.spotify_playlist ? {
        title: (msg.spotify_playlist as any)?.title,
        subtitle: (msg.spotify_playlist as any)?.subtitle,
        cover: (msg.spotify_playlist as any)?.cover
      } : undefined
    }));

    // Log audit
    console.log('📝 Messages Retrieved Audit:', {
      timestamp: new Date().toISOString(),
      action: 'MESSAGES_RETRIEVED',
      event_id: eventIdNum,
      event_title: event.title,
      user_id: user.id,
      user_name: `${user.name} ${user.surname}`,
      messages_count: messages.length,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      metadata: {
        event_id: eventIdNum,
        event_title: event.title,
        total_messages: messages.length,
        retrieved_at: new Date().toISOString(),
        retrieved_by: {
          id: user.id,
          name: `${user.name} ${user.surname}`
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error retrieving messages:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Errori specifici di Prisma
    if (error.code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'Record non trovato'
      }, { status: 404 });
    }

    if (error.code === 'P1001') {
      return NextResponse.json({
        success: false,
        error: 'Impossibile connettersi al database'
      }, { status: 503 });
    }

    // Errore generico
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei messaggi'
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}