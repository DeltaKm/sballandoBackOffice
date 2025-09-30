import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { location_ } from "~/types";

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let requestId = '';
  
  try {
    const body = await request.json();
    const { user_token } = body;
    const resolvedParams = await params;
    const locationId = parseInt(resolvedParams.id);

    // Genera un ID unico per la richiesta per tracciare le chiamate duplicate
    requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 [${requestId}] location_ API called:`, { 
      locationId, 
      hasToken: !!user_token, 
      userAgent: request.headers.get('user-agent')?.slice(0, 50),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    if (!user_token || !locationId) {
      console.log(`❌ [${requestId}] Missing parameters`);
      return NextResponse.json({ error: "Token utente o ID locale mancante" }, { status: 400 });
    }

    // Aggiungi un piccolo delay casuale per evitare race conditions
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    console.log(`🔍 [${requestId}] Verifying user...`);

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true, name: true, surname: true }
    });

    if (!user) {
      console.log(`❌ [${requestId}] User not found`);
      return NextResponse.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    console.log(`✅ [${requestId}] User found:`, { id: user.id, role: user.role });

    // Prima verifica se il locale esiste (query veloce)
    console.log(`🔍 [${requestId}] Checking location_ exists...`);
    
    const locationCheck = await prisma.locations.findUnique({
      where: { id: locationId },
      select: { id: true, user_id: true, name: true }
    });

    if (!locationCheck) {
      console.log(`❌ [${requestId}] location_ not found:`, locationId);
      return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
    }

    // Verifica proprietà
    if (locationCheck.user_id !== user.id && user.role !== 'SUPERADMIN') {
      console.log(`❌ [${requestId}] User not authorized:`, { 
        userId: user.id, 
        locationOwnerId: locationCheck.user_id 
      });
      return NextResponse.json({ error: "Non sei autorizzato a visualizzare questo locale" }, { status: 403 });
    }

    console.log(`✅ [${requestId}] Authorization passed, fetching full data...`);

    // Ora recupera i dati completi con timeout
    const locationPromise = prisma.locations.findUnique({
      where: { id: locationId },
      include: {
        events: {
          include: {
            entry_types: {
              orderBy: { created_at: "desc" }
            },
            products: {
              orderBy: { created_at: "desc" }
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true,
                    nickname: true,
                    picture: true,
                    role: true
                  }
                }
              }
            },
            event_music_genres: {
              include: {
                music_genre: {
                  select: { id: true, label: true }
                }
              }
            }
          }
        }
      }
    });

    // Aggiungi timeout di 10 secondi
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000);
    });

    const location_ = await Promise.race([locationPromise, timeoutPromise]) as location_;

    console.log(`✅ [${requestId}] location_ data retrieved:`, { 
      locationId: location_.id, 
      eventsCount: location_.events?.length || 0 
    });

    return NextResponse.json(location_, { status: 200 });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in location_ API:`, {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Errori specifici
    if (error.message === 'Database query timeout') {
      return NextResponse.json({ 
        error: "Timeout nella richiesta. Riprova." 
      }, { status: 408 });
    }

    if (error.name === 'PrismaClientUnknownRequestError') {
      return NextResponse.json({ 
        error: "Errore di connessione al database. Riprova." 
      }, { status: 503 });
    }

    if (error.code === 'P1001') {
      return NextResponse.json({ 
        error: "Impossibile connettersi al database" 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: "Errore nel recupero dati",
      requestId: requestId
    }, { status: 500 });

  } finally {
    console.log(`🔚 [${requestId}] Disconnecting Prisma...`);
    await prisma.$disconnect();
  }
}