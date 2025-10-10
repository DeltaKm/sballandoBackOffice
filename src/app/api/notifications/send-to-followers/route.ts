import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2);
  console.log(`🔔 [${requestId}] Starting notification send to followers...`);

  try {
    const { title, message, user_token, notification_type = 'general' } = await request.json();

    // Validazione input
    if (!title || !message || !user_token) {
      console.log(`❌ [${requestId}] Missing required fields`);
      return NextResponse.json({ 
        error: "Campi obbligatori mancanti (title, message, user_token)" 
      }, { status: 400 });
    }

    // Verifica utente mittente
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

    // Calcola followers count (solo per il logging)
    let followersCount = 0;
    try {
      const followersResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followed_id = ${sender.id}
          AND u.enabled = 1
      `;
      
      if (Array.isArray(followersResult) && followersResult.length > 0) {
        followersCount = Number((followersResult[0] as any).count);
      }
    } catch (followersError) {
      console.log('Followers table not found, followers count will be 0');
      followersCount = 0;
    }

    console.log(`✅ [${requestId}] Sender found:`, { 
      id: sender.id, 
      role: sender.role,
      name: `${sender.name} ${sender.surname}`,
      followers_count: followersCount
    });

    // Recupera i followers dell'utente
    let followers: any[] = [];
    try {
      const rawFollowers = await prisma.$queryRaw`
        SELECT f.follower_id, u.name, u.surname, u.email, u.fcm_token
        FROM followers f
        JOIN users u ON f.follower_id = u.id
        WHERE f.followed_id = ${sender.id}
          AND u.enabled = 1
      `;
      
      // Converti BigInt a Number per evitare errori con Prisma
      followers = (rawFollowers as any[]).map(follower => ({
        ...follower,
        follower_id: Number(follower.follower_id)
      }));
      
      console.log(`📊 [${requestId}] Found ${followers.length} real followers`);
    } catch (followersError) {
      console.log(`❌ [${requestId}] Followers table not found or error accessing it:`, followersError);
      return NextResponse.json({ 
        error: "Sistema followers non configurato. Impossibile inviare notifiche ai follower.",
        details: "La tabella followers non esiste o non è accessibile"
      }, { status: 500 });
    }

    if (followers.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: "Nessun follower trovato. La notifica non è stata inviata a nessuno.",
        sent_count: 0,
        recipients_count: 0
      });
    }

    // Prepara le notifiche da inserire nel database
    const notificationsToCreate = followers.map((follower: any) => ({
      receiver_id: follower.follower_id,
      sender_id: sender.id,
      title: title.trim(),
      message: message.trim(),
      long_message: message.trim(),
      type: notification_type,
      category: 'acceptances' as const,
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

    // ✅ IMPLEMENTAZIONE FCM PER NOTIFICHE PUSH
    const followersWithFcmToken = followers.filter((follower: any) => follower.fcm_token);
    console.log(`📱 [${requestId}] Followers with FCM token: ${followersWithFcmToken.length}`);
    
    let pushNotificationsSent = 0;

    if (followersWithFcmToken.length > 0) {
      try {
        // Raccogli tutti i token FCM
        const fcmTokens = followersWithFcmToken
          .map((follower: any) => follower.fcm_token)
          .filter((token: any): token is string => typeof token === 'string');

        if (fcmTokens.length === 0) {
          console.log(`⚠️ [${requestId}] No valid FCM tokens found`);
        } else {
          // Prepara i dati per la notifica (tutti come stringhe)
          const notificationData: Record<string, string> = {
            type: notification_type,
            redirect: 'user',
            sender_name: sender.nickname || `${sender.name} ${sender.surname}`,
            sender_id: sender.id.toString(),
            title: title.trim(),
            body: message.trim().substring(0, 200) + (message.length > 200 ? '...' : ''),
            timestamp: new Date().toISOString()
          };

          // Payload per il servizio FCM esterno
          const pushPayload = {
            topics: [],
            tokens: fcmTokens,
            title: title.trim(),
            body: message.trim().substring(0, 200) + (message.length > 200 ? '...' : ''),
            data: notificationData,
            clickAction: "FCM_PLUGIN_ACTIVITY"
          };

          console.log(`📤 [${requestId}] Sending push notification to ${fcmTokens.length} tokens via external service`);

          // Usa lo stesso servizio FCM del sistema esistente
          const pushResponse = await fetch('https://webservice.sballando.it/firebaseMessaging/src/send_notification.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pushPayload)
          });

          console.log(`📡 [${requestId}] Push response status:`, pushResponse.status);

          // Gestisci la risposta
          const responseText = await pushResponse.text();
          console.log(`📡 [${requestId}] Raw response:`, responseText.substring(0, 200));

          if (pushResponse.ok) {
            // Prova a parsare come JSON, altrimenti considera come successo
            let pushResult;
            try {
              pushResult = JSON.parse(responseText);
              pushNotificationsSent = pushResult.success_count || fcmTokens.length;
            } catch (jsonError) {
              // Se non è JSON valido ma la response è ok, considera come successo
              pushNotificationsSent = fcmTokens.length;
              console.log(`✅ [${requestId}] Push sent successfully (non-JSON response)`);
            }
            
            console.log(`✅ [${requestId}] Push notifications sent successfully to ${pushNotificationsSent} devices`);
          } else {
            console.error(`❌ [${requestId}] Push notification failed:`, responseText);
          }
        }
        
      } catch (fcmError: any) {
        console.error(`❌ [${requestId}] FCM Error:`, fcmError.message);
        // Non bloccare l'operazione se FCM fallisce
      }
    }

    // Log dell'operazione per tracciabilità
    console.log(`📢 [${requestId}] Notification sent successfully:`, {
      sender: `${sender.name} ${sender.surname}`,
      recipients_count: followers.length,
      push_notifications_sent: pushNotificationsSent,
      title: title.trim(),
      message_preview: message.trim().substring(0, 50) + (message.length > 50 ? '...' : ''),
      notification_type
    });

    return NextResponse.json({
      success: true,
      message: `Notifica inviata con successo a ${followers.length} follower${followers.length !== 1 ? 's' : ''}`,
      sent_count: followers.length,
      push_sent_count: pushNotificationsSent,
      sender_name: `${sender.name} ${sender.surname}`
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in send notification to followers API:`, {
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
      if (error.code === 'P2002') {
        return NextResponse.json({ 
          error: "Notifica duplicata" 
        }, { status: 409 });
      }
    }

    return NextResponse.json({ 
      error: "Errore interno del server durante l'invio della notifica",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });

  } finally {
    console.log(`🔚 [${requestId}] Disconnecting Prisma...`);
    await prisma.$disconnect();
  }
}
