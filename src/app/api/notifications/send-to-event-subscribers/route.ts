import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const requestId = Date.now() + '-' + Math.random().toString(36).substring(2);
  console.log(`🔔 [${requestId}] Starting notification send to event subscribers...`);

  try {
    const { event_id, title, message, user_token } = await request.json();

    // Validazione input
    if (!event_id || !title || !message || !user_token) {
      console.log(`❌ [${requestId}] Missing required fields`);
      return NextResponse.json({ 
        error: "Campi obbligatori mancanti" 
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true, name: true, surname: true }
    });

    if (!user) {
      console.log(`❌ [${requestId}] User not found`);
      return NextResponse.json({ 
        error: "Utente non autorizzato" 
      }, { status: 401 });
    }

    console.log(`✅ [${requestId}] User found:`, { id: user.id, role: user.role });

    // Verifica che l'evento esista e che l'utente sia autorizzato
    const event = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: { 
        id: true, 
        title: true, 
        user_id: true,
        locations: {
          select: {
            user_id: true
          }
        }
      }
    });

    if (!event) {
      console.log(`❌ [${requestId}] Event not found:`, event_id);
      return NextResponse.json({ 
        error: "Evento non trovato" 
      }, { status: 404 });
    }

    // Verifica autorizzazione: solo il creatore dell'evento, il proprietario del locale o super admin
    const isAuthorized = 
      user.id === event.user_id || 
      user.id === event.locations?.user_id || 
      user.role === 'SUPERADMIN';

    if (!isAuthorized) {
      console.log(`❌ [${requestId}] User not authorized:`, { 
        userId: user.id, 
        eventCreatorId: event.user_id,
        locationOwnerId: event.locations?.user_id 
      });
      return NextResponse.json({ 
        error: "Non sei autorizzato ad inviare notifiche per questo evento" 
      }, { status: 403 });
    }

    console.log(`✅ [${requestId}] Authorization passed`);

    // Per ora, dato che non esiste una tabella di iscrizioni agli eventi,
    // invieremo la notifica a tutti gli utenti attivi del sistema
    // In futuro si potrà creare una tabella event_subscriptions
    const allActiveUsers = await prisma.users.findMany({
      where: { 
        enabled: true // Solo utenti attivi
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        fcm_token: true
      }
    });

    console.log(`📊 [${requestId}] Found ${allActiveUsers.length} active users`);

    if (allActiveUsers.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: "Nessun utente attivo trovato",
        sent_count: 0
      });
    }

    // Prepara le notifiche da inserire nel database
    const notificationsToCreate = allActiveUsers.map(recipient => ({
      receiver_id: recipient.id,
      sender_id: user.id, // ✅ CORRETTO: L'utente che invia la notifica
      event_id: parseInt(event_id),
      title: title.trim(),
      message: message.trim(),
      long_message: message.trim(),
      type: 'event_notification',
      category: 'acceptances' as const,
      status: 'unread' as const,
      redirect: 'event' as const,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Inserisci tutte le notifiche nel database
    const createdNotifications = await prisma.notifications.createMany({
      data: notificationsToCreate,
      skipDuplicates: true
    });

    console.log(`✅ [${requestId}] Created ${createdNotifications.count} notifications in database`);

    // ✅ IMPLEMENTAZIONE FCM PER NOTIFICHE PUSH - STESSO SISTEMA DEL JUKEBOX
    const usersWithFcmToken = allActiveUsers.filter(recipient => recipient.fcm_token);
    console.log(`📱 [${requestId}] Users with FCM token: ${usersWithFcmToken.length}`);
    
    let pushNotificationsSent = 0;
    
    if (usersWithFcmToken.length > 0) {
      try {
        // Raccogli tutti i token FCM
        const fcmTokens = usersWithFcmToken
          .map(recipient => recipient.fcm_token)
          .filter((token): token is string => typeof token === 'string');

        if (fcmTokens.length === 0) {
          console.log(`⚠️ [${requestId}] No valid FCM tokens found`);
        } else {
          // Prepara i dati per la notifica (tutti come stringhe)
          const notificationData: Record<string, string> = {
            event_id: event_id.toString(),
            type: 'event_notification',
            redirect: 'event',
            sender_name: `${user.name} ${user.surname}`,
            sender_id: user.id.toString(),
            event_title: event.title || '',
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

          // Usa lo stesso servizio FCM del jukebox
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
      event_id: event.id,
      event_title: event.title,
      sender: `${user.name} ${user.surname}`,
      recipients_count: allActiveUsers.length,
      push_notifications_sent: pushNotificationsSent,
      title: title.trim(),
      message_preview: message.trim().substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    return NextResponse.json({
      success: true,
      message: `Notifica inviata con successo a ${allActiveUsers.length} utenti`,
      sent_count: allActiveUsers.length,
      push_sent_count: pushNotificationsSent,
      event_title: event.title
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in send notification API:`, {
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
