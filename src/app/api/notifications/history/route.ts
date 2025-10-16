import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const userToken = request.nextUrl.searchParams.get('user_token');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    // Validazione input
    if (!userToken) {
      return NextResponse.json({ 
        error: "Token utente richiesto" 
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: userToken },
      select: { id: true, role: true, name: true, surname: true }
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Utente non autorizzato" 
      }, { status: 401 });
    }

    const skip = (page - 1) * limit;

    // Recupera le notifiche inviate dall'utente (query semplificata)
    const sentNotifications = await prisma.notifications.findMany({
      where: { 
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] } // Solo notifiche sociali
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        category: true,
        created_at: true,
        receiver_id: true
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limit
    });

    // Conta il totale per la paginazione
    const totalCount = await prisma.notifications.count({
      where: { 
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] }
      }
    });

    // Raggruppa le notifiche per tipo e data (versione semplificata)
    const processedNotifications = sentNotifications.map(notification => ({
      id: notification.id,
      title: notification.title || 'Notifica senza titolo',
      message: notification.message || '',
      type: notification.type || 'general',
      category: notification.category || 'general',
      created_at: notification.created_at,
      recipients: [], // Semplificato - potremmo recuperare i destinatari in una query separata se necessario
      recipients_count: 1 // Placeholder - ogni notifica ha almeno 1 destinatario
    }));

    console.log(`📋 Retrieved ${processedNotifications.length} notifications for user ${user.id}`);

    return NextResponse.json({
      success: true,
      notifications: processedNotifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error("❌ Error retrieving notification history:", error);
    
    return NextResponse.json({ 
      error: "Errore nel recupero della cronologia notifiche",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}
