import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { user_id, title, body, tokens } = await request.json();

    const testPayload = {
      topics: [],
      tokens: tokens || ["test_token_123"], // Token di test
      title: title || "🔔 Test Notifica",
      body: body || "Questa è una notifica di test da Sballando!",
      data: {
        user_id: String(user_id || 0),
        type: "test",
        timestamp: new Date().toISOString()
      },
      clickAction: "FCM_PLUGIN_ACTIVITY"
    };

    console.log('🧪 Testing push notification:', testPayload);

    const response = await fetch('https://webservice.sballando.it/firebaseMessaging/src/send_notification.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      payload: testPayload,
      response: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Errore test'
    }, { status: 500 });
  }
}