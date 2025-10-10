import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('user_token');

    // Validazione input
    if (!userToken) {
      return NextResponse.json({ 
        error: "Token utente richiesto" 
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: userToken },
      select: { 
        id: true, 
        name: true, 
        surname: true, 
        nickname: true
      }
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Utente non autorizzato" 
      }, { status: 401 });
    }

    // Calcola followers e following counts
    let followersCount = 0;
    let followingCount = 0;

    try {
      // Prova a ottenere i followers reali dalla tabella followers
      const followersResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followed_id = ${user.id}
          AND u.enabled = 1
      `;
      
      if (Array.isArray(followersResult) && followersResult.length > 0) {
        followersCount = Number((followersResult[0] as any).count);
      }

      // Prova a ottenere i following dalla tabella followers
      const followingResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM followers f
        JOIN users u ON f.followed_id = u.id
        WHERE f.follower_id = ${user.id}
          AND u.enabled = 1
      `;
      
      if (Array.isArray(followingResult) && followingResult.length > 0) {
        followingCount = Number((followingResult[0] as any).count);
      }
    } catch (followersError) {
      console.log('Followers table not found or error accessing it');
      // Non facciamo fallback - se non c'è la tabella followers, il count rimane 0
      followersCount = 0;
      followingCount = 0;
    }

    // Statistiche notifiche inviate
    const notificationStats = await prisma.notifications.groupBy({
      by: ['type'],
      where: {
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] }
      },
      _count: {
        id: true
      }
    });

    // Totale notifiche inviate
    const totalNotificationsSent = await prisma.notifications.count({
      where: {
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] }
      }
    });

    // Notifiche inviate negli ultimi 30 giorni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentNotifications = await prisma.notifications.count({
      where: {
        sender_id: user.id,
        type: { in: ['general', 'announcement', 'update'] },
        created_at: {
          gte: thirtyDaysAgo
        }
      }
    });

    const stats = {
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        nickname: user.nickname,
        display_name: user.nickname || `${user.name} ${user.surname}`,
        followers_count: followersCount,
        following_count: followingCount
      },
      notifications: {
        total_sent: totalNotificationsSent,
        recent_sent: recentNotifications,
        by_type: notificationStats.reduce((acc, stat) => {
          if (stat.type) {
            acc[stat.type] = stat._count.id;
          }
          return acc;
        }, {} as Record<string, number>)
      }
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error("❌ Error retrieving notification stats:", error);
    
    return NextResponse.json({ 
      error: "Errore nel recupero delle statistiche",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}
