import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('user_token');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Recupera le notifiche inviate dall'utente
    const sentNotifications = await prisma.notifications.findMany({
      where: { 
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] } // Solo notifiche sociali
      },
      include: {
         users_notifications_receiver_idTousers: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            nickname: true
          }
        }
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

    // Raggruppa le notifiche per invio (stesso titolo e timestamp)
    const groupedNotifications = sentNotifications.reduce((acc, notification) => {
      const createdAt = notification.created_at || new Date();
      const key = `${notification.title}-${new Date(createdAt).getTime()}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          category: notification.category,
          created_at: notification.created_at,
          recipients: [],
          recipients_count: 0
        };
      }
      
      const receiver = notification.users_notifications_receiver_idTousers;
      if (receiver) {
        acc[key].recipients.push({
          id: receiver.id,
          name: receiver.name,
          surname: receiver.surname,
          email: receiver.email,
          nickname: receiver.nickname
        });
      }
      
      acc[key].recipients_count++;
      
      return acc;
    }, {} as Record<string, any>);

    const notifications = Object.values(groupedNotifications);

    console.log(`📋 Retrieved ${notifications.length} notification groups for user ${user.id}`);

    return NextResponse.json({
      success: true,
      notifications,
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
