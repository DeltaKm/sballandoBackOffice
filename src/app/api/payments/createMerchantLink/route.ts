import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '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');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_token, location_id }   = body;

    // Validazione input
    if (!user_token || !location_id) {
      return NextResponse.json({
        status: false,
        error: 'Parametri mancanti: user_token e location_id sono richiesti'
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
      return NextResponse.json({
        status: false,
        error: 'Utente non trovato'
      }, { status: 404 });
    }


    // Verifica locale
    const location_ = await prisma.locations.findFirst({
      where: { id: parseInt(location_id) },
      select: {
        id: true,
        name: true,
        user_id: true,
        stripe_account: true,
        address: true,
      }
    });

    if (!location_) {
      return NextResponse.json({
        status: false,
        error: 'Locale non trovato',
      }, { status: 404 });
    }
    // Ciao123456!!!!!@@@

    // Verifica proprietà del locale
    if (location_.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({
        status: false,
        error: 'Non sei il proprietario del locale'
      }, { status: 403 });
    }

    // Verifica se account Stripe già attivo
    let stripeAccount = location_.stripe_account as any || {};
    
    if (stripeAccount && stripeAccount.active === true) {
      return NextResponse.json({
        status: false,
        error: 'Account Stripe già attivo'
      }, { status: 400 });
    }

    // Crea account Stripe
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: {
        location_id: location_.id.toString(),
        location_name: location_.name,
        user_id: user.id.toString(),
        user_name: `${user.name} ${user.surname}`,
        created_via: 'sballando_backoffice'
      }
    });


    // Crea link per onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://backoffice.sballando.it'}/locations?stripe_refresh=true`,
      return_url: `${process.env.STRIPE_RETURN_URL || 'https://webservice.sballando.it/api/payments/stripe_account_verify'}/${location_.id}`,
      type: 'account_onboarding',
    });

    // Aggiorna il locale con l'account Stripe
    stripeAccount.id = account.id;
    stripeAccount.active = false;
    stripeAccount.created_at = new Date().toISOString();
    stripeAccount.onboarding_url = accountLink.url;

    const updatedlocation = await prisma.locations.update({
      where: { id: location_.id },
      data: {
        stripe_account: stripeAccount,
        updated_at: new Date()
      },
      select: {
        id: true,
        name: true,
        stripe_account: true
      }
    });



    return NextResponse.json({
      status: true,
      link_stripe_created: accountLink.url,
      stripe_account_id: account.id,
      location_: {
        id: updatedlocation.id,
        name: updatedlocation.name,
        stripe_account: updatedlocation.stripe_account
      },
      metadata: {
        created_at: new Date().toISOString(),
        created_by: {
          id: user.id,
          name: `${user.name} ${user.surname}`
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error creating merchant link:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Errori specifici di Stripe
    if (error.type === 'StripeCardError') {
      return NextResponse.json({
        status: false,
        error: 'Errore Stripe: ' + error.message
      }, { status: 400 });
    }

    if (error.type === 'StripeRateLimitError') {
      return NextResponse.json({
        status: false,
        error: 'Troppi tentativi. Riprova più tardi.'
      }, { status: 429 });
    }

    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json({
        status: false,
        error: 'Richiesta non valida: ' + error.message
      }, { status: 400 });
    }

    if (error.type === 'StripeAPIError') {
      return NextResponse.json({
        status: false,
        error: 'Errore API Stripe. Riprova più tardi.'
      }, { status: 503 });
    }

    if (error.type === 'StripeConnectionError') {
      return NextResponse.json({
        status: false,
        error: 'Errore di connessione a Stripe. Riprova più tardi.'
      }, { status: 503 });
    }

    if (error.type === 'StripeAuthenticationError') {
      return NextResponse.json({
        status: false,
        error: 'Errore di autenticazione Stripe.'
      }, { status: 401 });
    }

    // Errore generico
    return NextResponse.json({
      status: false,
      error: 'Errore interno del server: ' + error.message
    }, { status: 500 });

  } finally {
    await prisma.$disconnect();
  }
}