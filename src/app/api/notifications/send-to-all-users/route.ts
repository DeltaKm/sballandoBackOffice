import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2);
  console.log(`🔔 [${requestId}] Starting notification send to ALL USERS...`);

  try {
    const { title, message, user_token, notification_type = 'announcement' } = await request.json();

    // Validazione input
    if (!title || !message || !user_token) {
      console.log(`❌ [${requestId}] Missing required fields`);
      return NextResponse.json({ 
        error: "Campi obbligatori mancanti (title, message, user_token)" 
      }, { status: 400 });
    }

    // Verifica utente mittente e che sia SUPERADMIN
    const sender = await prisma.users.findFirst({
      where: { token: user_token },
      select: { 
        id: true, 
        role: true, 
        name: true, 
        surname: true,
        nickname: true
      }
    });

    if (!sender) {
      console.log(`❌ [${requestId}] Sender not found`);
      return NextResponse.json({ 
        error: "Utente non autorizzato" 
      }, { status: 401 });
    }

    // Verifica che l'utente sia SUPERADMIN
    if (sender.role !== 'SUPERADMIN') {
      console.log(`❌ [${requestId}] User is not SUPERADMIN. Role: ${sender.role}`);
      return NextResponse.json({ 
        error: "Solo i SUPERADMIN possono inviare notifiche a tutti gli utenti" 
      }, { status: 403 });
    }

    console.log(`✅ [${requestId}] SUPERADMIN verified:`, { 
      id: sender.id, 
      name: `${sender.name} ${sender.surname}` 
    });

    // Recupera TUTTI gli utenti attivi della piattaforma
    const allActiveUsers = await prisma.users.findMany({
      where: { 
        enabled: true,
        id: { not: sender.id } // Escludi il mittente
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        fcm_token: true
      }
    });

    console.log(`👥 [${requestId}] Found ${allActiveUsers.length} active users to notify`);

    if (allActiveUsers.length === 0) {
      console.log(`ℹ️ [${requestId}] No active users found to notify`);
      return NextResponse.json({
        success: true,
        message: "Nessun utente attivo trovato per l'invio",
        sent_count: 0,
        push_sent_count: 0
      });
    }

    // Prepara le notifiche da inserire nel database
    const notificationsToCreate = allActiveUsers.map(recipient => ({
      receiver_id: recipient.id,
      sender_id: sender.id, // ✅ CORRETTO: L'utente che invia la notifica
      title: title.trim(),
      message: message.trim(),
      long_message: message.trim(),
      type: notification_type,
      category: 'acceptances' as const, // ✅ CORRETTO: usa enum valido
      status: 'unread' as const,
      redirect: 'user' as const,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Inserisci tutte le notifiche nel database
    const createdNotifications = await prisma.notifications.createMany({
      data: notificationsToCreate,
      skipDuplicates: true
    });

    console.log(`✅ [${requestId}] Created ${createdNotifications.count} notifications in database`);

    // ✅ INVIO NOTIFICHE PUSH FCM
    const usersWithFcmToken = allActiveUsers.filter(user => user.fcm_token);
    console.log(`📱 [${requestId}] Users with FCM token: ${usersWithFcmToken.length}`);
    
    let pushNotificationsSent = 0;
    
    if (usersWithFcmToken.length > 0) {
      try {
        const notificationData = {
          title: title.trim(),
          body: message.trim().substring(0, 200),
          type: 'platform_announcement',
          redirect: 'user',
          sender_name: `${sender.name} ${sender.surname}`,
          sender_id: sender.id.toString(),
          is_admin_notification: 'true',
          timestamp: new Date().toISOString()
        };

        const fcmPayload = {
          topics: [],
          tokens: usersWithFcmToken.map(user => user.fcm_token).filter(Boolean),
          title: title.trim(),
          body: message.trim().substring(0, 200),
          data: notificationData,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        };

        console.log(`📱 [${requestId}] Sending FCM to ${fcmPayload.tokens.length} devices...`);

        const fcmResponse = await fetch('https://webservice.sballando.it/firebaseMessaging/src/send_notification.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fcmPayload)
        });

        let fcmResult;
        const responseText = await fcmResponse.text();
        
        try {
          fcmResult = JSON.parse(responseText);
          pushNotificationsSent = fcmResult.success_count || 0;
          console.log(`📱 [${requestId}] FCM Response:`, fcmResult);
        } catch (parseError) {
          console.log(`📱 [${requestId}] FCM Response (text):`, responseText);
          pushNotificationsSent = responseText.includes('success') ? usersWithFcmToken.length : 0;
        }

      } catch (fcmError) {
        console.error(`❌ [${requestId}] FCM Error:`, fcmError);
        // Non bloccare l'operazione se FCM fallisce
      }
    }

    // Log dell'operazione per tracciabilità
    console.log(`📢 [${requestId}] PLATFORM NOTIFICATION sent successfully:`, {
      sender: `${sender.name} ${sender.surname}`,
      recipients_count: allActiveUsers.length,
      push_notifications_sent: pushNotificationsSent,
      title: title.trim(),
      message_preview: message.trim().substring(0, 50) + (message.length > 50 ? '...' : ''),
      type: notification_type
    });

    return NextResponse.json({
      success: true,
      message: `Notifica inviata con successo a TUTTI gli utenti della piattaforma (${allActiveUsers.length} utenti)`,
      sent_count: allActiveUsers.length,
      push_sent_count: pushNotificationsSent
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error sending notification to all users:`, error);
    return NextResponse.json({
      success: false,
      error: "Errore interno del server",
      details: error.message
    }, { status: 500 });
    
  } finally {
    console.log(`🔚 [${requestId}] Disconnecting Prisma...`);
    await prisma.$disconnect();
  }
}