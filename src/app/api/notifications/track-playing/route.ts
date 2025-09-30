import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NotificationRequest {
  event_id: number;
  track_title: string;
  track_artist: string;
  user_id: number;
  user_name: string;
  dedication?: string;
  event_title: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: NotificationRequest = await request.json();
    
    console.log('🔔 Notification request received:', data);

    // ✅ VALIDAZIONE DATI
    if (!data.event_id || !data.track_title || !data.user_id) {
      return NextResponse.json({
        success: false,
        error: 'Dati mancanti: event_id, track_title e user_id sono richiesti'
      }, { status: 400 });
    }

    // ✅ CORREGGI LA QUERY - RIMUOVI INCLUDE SE fcm_token È UN CAMPO DIRETTO
    const user = await prisma.users.findUnique({
      where: { id: data.user_id }
      // ❌ Rimuovi questo se fcm_token è un campo della tabella users
      // include: { fcm_token: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utente non trovato'
      }, { status: 404 });
    }

    console.log('👤 User found:', { 
      id: user.id, 
      email: user.email,
      fcm_token: user.fcm_token ? 'Present' : 'Missing'
    });

    // ✅ VERIFICA CHE L'EVENTO ESISTA
    const event = await prisma.events.findUnique({
      where: { id: data.event_id }
    });

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Evento non trovato'
      }, { status: 404 });
    }

    console.log('✅ User and event validation passed');

    // ✅ CONTROLLA SE ESISTE GIÀ UNA NOTIFICA PER QUESTA CANZONE/UTENTE/EVENTO
    try {
      // ✅ CONTROLLO 1: Stessa canzone esatta (titolo + artista + evento)
      const exactTrackNotification = await prisma.notifications.findFirst({
        where: {
          receiver_id: data.user_id,
          type: 'track_playing',
          // Controlla nelle ultime 24 ore
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      if (exactTrackNotification) {
        // Controlla se i metadati contengono la stessa canzone
        let notificationMetadata;
        try {
          notificationMetadata = JSON.parse(exactTrackNotification.message || '{}');
        } catch {
          notificationMetadata = {};
        }

        // ✅ VERIFICA SE È LA STESSA CANZONE (titolo + artista + evento)
        const isSameTrack = notificationMetadata.track_title === data.track_title && 
                           notificationMetadata.track_artist === data.track_artist &&
                           notificationMetadata.event_id === data.event_id.toString();

        if (isSameTrack) {
          console.log('🔄 Same track notification already sent for this user/event:', {
            notification_id: exactTrackNotification.id,
            sent_at: exactTrackNotification.created_at,
            track: `${data.track_title} - ${data.track_artist}`,
            user: data.user_id,
            event: data.event_id
          });

          let timeSinceLastNotification = 0;
          if (exactTrackNotification.created_at) {
            timeSinceLastNotification = Date.now() - new Date(exactTrackNotification.created_at).getTime();
          }
          const cooldownRemaining = Math.max(0, 2 * 60 * 60 * 1000 - timeSinceLastNotification); // 2 ore cooldown

          return NextResponse.json({
            success: false,
            error: 'Notifica già inviata per questa canzone',
            existing_notification: {
              id: exactTrackNotification.id,
              sent_at: exactTrackNotification.created_at,
              track_title: notificationMetadata.track_title,
              track_artist: notificationMetadata.track_artist
            },
            user_id: data.user_id,
            track: `${data.track_title} - ${data.track_artist}`,
            event_id: data.event_id,
            cooldown_remaining_ms: cooldownRemaining,
            cooldown_remaining_minutes: Math.ceil(cooldownRemaining / (60 * 1000))
          }, { status: 409 }); // 409 Conflict
        } else {
          console.log('✅ Different track detected, notification allowed:', {
            previous_track: `${notificationMetadata.track_title} - ${notificationMetadata.track_artist}`,
            new_track: `${data.track_title} - ${data.track_artist}`,
            user: data.user_id,
            event: data.event_id
          });
        }
      }

      console.log('✅ No duplicate track notification found, proceeding...');

    } catch (checkError) {
      console.error('⚠️ Error checking for existing notifications:', checkError);
      // Non bloccare l'invio se la verifica fallisce, solo logga l'errore
    }

    // ✅ CONTROLLO AGGIUNTIVO: Prevenzione spam generale per utente/evento
    try {
      // Controlla se l'utente ha ricevuto troppe notifiche di recente per questo evento
      const recentNotifications = await prisma.notifications.findMany({
        where: {
          receiver_id: data.user_id,
          type: 'track_playing',
          created_at: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Ultima ora
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      // Filtra per questo evento specifico
      const eventNotifications = recentNotifications.filter(notification => {
        try {
          const metadata = JSON.parse(notification.message || '{}');
          return metadata.event_id === data.event_id.toString();
        } catch {
          return false;
        }
      });

      // ✅ LIMITE: Massimo 5 notifiche per evento per ora
      if (eventNotifications.length >= 5) {
        console.log('⚠️ Rate limit exceeded for user/event:', {
          user_id: data.user_id,
          event_id: data.event_id,
          notifications_last_hour: eventNotifications.length
        });

        return NextResponse.json({
          success: false,
          error: 'Limite notifiche raggiunto per questo evento',
          user_id: data.user_id,
          event_id: data.event_id,
          notifications_last_hour: eventNotifications.length,
          limit: 5,
          try_again_after: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }, { status: 429 }); // 429 Too Many Requests
      }

      console.log('✅ Rate limit check passed:', {
        user_id: data.user_id,
        event_id: data.event_id,
        notifications_last_hour: eventNotifications.length,
        limit: 5
      });

    } catch (rateLimitError) {
      console.error('⚠️ Error in rate limit check:', rateLimitError);
      // Non bloccare se il controllo fallisce
    }

    // ✅ CONTROLLO FINALE: Log della decisione
    console.log('🎵 New track notification approved:', {
      user_id: data.user_id,
      event_id: data.event_id,
      track: `${data.track_title} - ${data.track_artist}`,
      has_dedication: !!data.dedication,
      timestamp: data.timestamp
    });

    // ✅ PREPARA IL MESSAGGIO DELLA NOTIFICA
    const notificationTitle = `🎵 La tua canzone sta suonando!`;
    const notificationBody = data.dedication 
      ? `"${data.track_title}" di ${data.track_artist} con la tua dedica: "${data.dedication}"`
      : `"${data.track_title}" di ${data.track_artist} sta suonando all'evento ${data.event_title}`;

    // ✅ RECUPERA I TOKEN FCM DELL'UTENTE - VERSIONE CORRETTA
    let deviceTokens: string[] = [];

    // ✅ OPZIONE 1: Se fcm_token è un campo diretto della tabella users
    if (user.fcm_token) {
      deviceTokens.push(user.fcm_token);
      console.log('📱 Using direct FCM token from user table');
    }

    // ✅ OPZIONE 2: Se hai una tabella separata per i device tokens
    try {
      const userDevices = await prisma.users.findMany({
        where: { 
          id: data.user_id,
          fcm_token: { not: null },
        }
      });

      const additionalTokens = userDevices
        .map(device => device.fcm_token)
        .filter((token): token is string => typeof token === 'string');

      deviceTokens = [...deviceTokens, ...additionalTokens];
      console.log('📱 Additional tokens from user_devices:', additionalTokens.length);

    } catch (deviceError) {
      console.log('⚠️ user_devices table not found or error:', deviceError);
      // Non è un errore critico, continua con il token principale
    }

    // ✅ RIMUOVI DUPLICATI
    deviceTokens = [...new Set(deviceTokens)];

    if (deviceTokens.length === 0) {
      console.log('⚠️ No FCM tokens found for user:', data.user_id);
      return NextResponse.json({
        success: false,
        error: 'Nessun token FCM trovato per l\'utente',
        user_id: data.user_id,
        user_email: user.email
      }, { status: 404 });
    }

    console.log('📱 Total FCM Tokens found:', deviceTokens.length);

    // ✅ SALVA LA NOTIFICA NEL DATABASE CON METADATI DETTAGLIATI
    let savedNotification;
    try {
      savedNotification = await prisma.notifications.create({
        data: {
          receiver_id: data.user_id,
          title: notificationTitle,
          message: notificationBody,
          type: 'track_playing',
          status: 'unread',

          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log('✅ Notification saved to database with ID:', savedNotification.id);
    } catch (dbError) {
      console.error('⚠️ Failed to save notification to DB:', dbError);
      // Non bloccare l'invio anche se il salvataggio fallisce
    }

    // ✅ INVIA NOTIFICA PUSH
    try {
      const notificationData = {
        event_id: data.event_id.toString(),
        track_title: data.track_title,
        track_artist: data.track_artist,
        user_id: data.user_id.toString(),
        dedication: data.dedication || '',
        event_title: data.event_title,
        timestamp: data.timestamp,
        type: 'track_playing',
        notification_id: savedNotification?.id?.toString() || 'unknown'
      };

      // Converti tutti i valori in stringhe
      const dataStringified: Record<string, string> = {};
      Object.entries(notificationData).forEach(([key, value]) => {
        dataStringified[key] = String(value);
      });

      dataStringified.title = notificationTitle;
      dataStringified.body = notificationBody;

      const pushPayload = {
        topics: [],
        tokens: deviceTokens,
        title: notificationTitle,
        body: notificationBody,
        data: dataStringified,
        clickAction: "FCM_PLUGIN_ACTIVITY"
      };

      console.log('📤 Sending push notification to tokens:', deviceTokens.length);

      const pushResponse = await fetch('https://webservice.sballando.it/firebaseMessaging/src/send_notification.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushPayload)
      });

      console.log('📡 Push response status:', pushResponse.status);

      // ✅ GESTISCI RESPONSE COME TESTO PRIMA DI PARSARE JSON
      const responseText = await pushResponse.text();
      console.log('📡 Raw response:', responseText);

      let pushResult;
      try {
        pushResult = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('❌ Response is not valid JSON:', responseText);
        
        if (pushResponse.ok) {
          // ✅ AGGIORNA LO STATUS DELLA NOTIFICA NEL DB
          if (savedNotification) {
            try {
              await prisma.notifications.update({
                where: { id: savedNotification.id },
                data: { 
                  updated_at: new Date()
                }
              });
            } catch (updateError) {
              console.error('⚠️ Failed to update notification status:', updateError);
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Notifica push inviata (risposta non-JSON)',
            tokens_sent: deviceTokens.length,
            notification_id: savedNotification?.id,
            raw_response: responseText.substring(0, 200),
            sent_at: new Date().toISOString()
          });
        }
        
        // ✅ MARCA COME FALLITA NEL DB
        if (savedNotification) {
          try {
            await prisma.notifications.update({
              where: { id: savedNotification.id },
              data: { 
                updated_at: new Date()
              }
            });
          } catch (updateError) {
            console.error('⚠️ Failed to update notification status:', updateError);
          }
        }

        return NextResponse.json({
          success: false,
          error: 'Risposta del server non valida',
          status: pushResponse.status,
          raw_response: responseText.substring(0, 500),
          tokens_attempted: deviceTokens.length
        }, { status: 500 });
      }

      if (pushResponse.ok) {
        // ✅ AGGIORNA LO STATUS DELLA NOTIFICA COME INVIATA
        if (savedNotification) {
          try {
            await prisma.notifications.update({
              where: { id: savedNotification.id },
              data: { 

                updated_at: new Date()
              }
            });
          } catch (updateError) {
            console.error('⚠️ Failed to update notification status:', updateError);
          }
        }

        console.log('✅ Push notification sent successfully:', pushResult);
        
        return NextResponse.json({
          success: true,
          message: 'Notifica push inviata con successo',
          tokens_sent: deviceTokens.length,
          notification_id: savedNotification?.id,
          push_result: pushResult,
          sent_at: new Date().toISOString()
        });
      } else {
        // ✅ MARCA COME FALLITA
        if (savedNotification) {
          try {
            await prisma.notifications.update({
              where: { id: savedNotification.id },
              data: { 
                updated_at: new Date()
              }
            });
          } catch (updateError) {
            console.error('⚠️ Failed to update notification status:', updateError);
          }
        }

        console.error('❌ Push notification failed:', pushResult);
        
        return NextResponse.json({
          success: false,
          error: 'Errore nell\'invio della notifica push',
          details: pushResult,
          tokens_attempted: deviceTokens.length
        }, { status: 500 });
      }

    } catch (pushError) {
      console.error('❌ Push notification service error:', pushError);
      
      // ✅ MARCA COME FALLITA NEL DB
      if (savedNotification) {
        try {
          await prisma.notifications.update({
            where: { id: savedNotification.id },
            data: { 
              updated_at: new Date()
            }
          });
        } catch (updateError) {
          console.error('⚠️ Failed to update notification status:', updateError);
        }
      }
      
      return NextResponse.json({
        success: false,
        error: 'Servizio di notifiche temporaneamente non disponibile',
        details: pushError instanceof Error ? pushError.message : 'Errore sconosciuto',
        tokens_attempted: deviceTokens.length
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Notification API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server',
      details: error instanceof Error ? error.message : 'Errore sconosciuto'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}