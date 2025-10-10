import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import type { location_ } from "~/types";
import getSFTPService from "~/lib/sftpService.server";

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let requestId = '';
  
  try {
    const resolvedParams = await params;
    const locationId = parseInt(resolvedParams.id);
    
    // Genera un ID unico per la richiesta
    requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 [${requestId}] Location UPDATE API called:`, { 
      locationId,
      userAgent: request.headers.get('user-agent')?.slice(0, 50),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    if (!locationId) {
      console.log(`❌ [${requestId}] Missing location ID`);
      return NextResponse.json({ error: "ID locale mancante" }, { status: 400 });
    }

    // Parse FormData
    const formData = await request.formData();
    const user_token = formData.get('user_token') as string;
    const name = formData.get('name') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const province = formData.get('province') as string;
    const postal_code = formData.get('postal_code') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const description = formData.get('description') as string;
    const logo = formData.get('logo') as File | null;

    if (!user_token) {
      console.log(`❌ [${requestId}] Missing user token`);
      return NextResponse.json({ error: "Token utente mancante" }, { status: 400 });
    }

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

    // Verifica se il locale esiste e l'autorizzazione
    const existingLocation = await prisma.locations.findUnique({
      where: { id: locationId },
      select: { id: true, user_id: true, name: true, logo: true, token: true }
    });

    if (!existingLocation) {
      console.log(`❌ [${requestId}] Location not found:`, locationId);
      return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
    }

    // Verifica proprietà
    if (existingLocation.user_id !== user.id && user.role !== 'SUPERADMIN') {
      console.log(`❌ [${requestId}] User not authorized:`, { 
        userId: user.id, 
        locationOwnerId: existingLocation.user_id 
      });
      return NextResponse.json({ error: "Non sei autorizzato a modificare questo locale" }, { status: 403 });
    }

    console.log(`✅ [${requestId}] Authorization passed, updating location...`);

    // Prepara i dati per l'aggiornamento
    const updateData: any = {
      name,
      address,
      comune: city, // Map city to comune
      provincia: province, // Map province to provincia
      cap: postal_code, // Map postal_code to cap
      phone,
      email,
      description,
      updated_at: new Date()
    };

    // Gestione upload logo se presente
    if (logo && logo.size > 0) {
      console.log(`📷 [${requestId}] Processing logo upload:`, {
        fileName: logo.name,
        size: logo.size,
        type: logo.type
      });

      // Verifica che il locale abbia un token
      if (!existingLocation.token) {
        console.log(`❌ [${requestId}] Location has no token, cannot upload logo`);
        return NextResponse.json({ 
          error: "Questo locale non ha un token valido per l'upload. Contatta l'amministratore." 
        }, { status: 400 });
      }

      const sftpService = getSFTPService();
      
      try {
        // Upload del nuovo logo usando il token
        const uploadResult = await sftpService.uploadLocationLogo(existingLocation.token, logo);
        
        if (uploadResult.success) {
          console.log(`✅ [${requestId}] Logo uploaded successfully:`, uploadResult.publicUrl);
          
          // Elimina il vecchio logo se esiste
          if (existingLocation.logo) {
            try {
              // Estrai il nome del file dal percorso esistente
              const oldFileName = existingLocation.logo.split('/').pop();
              if (oldFileName && oldFileName !== uploadResult.fileName) {
                await sftpService.deleteLocationLogo(existingLocation.token, oldFileName);
                console.log(`🗑️ [${requestId}] Old logo deleted:`, oldFileName);
              }
            } catch (deleteError) {
              console.warn(`⚠️ [${requestId}] Failed to delete old logo:`, deleteError);
              // Non bloccare l'aggiornamento se la cancellazione fallisce
            }
          }
          
          // Costruisci il percorso relativo per il database
          const relativePath = `images/locations/${existingLocation.token}/${uploadResult.fileName}`;
          updateData.logo = relativePath;
        } else {
          console.error(`❌ [${requestId}] Logo upload failed:`, uploadResult.error);
          return NextResponse.json({ 
            error: "Errore durante l'upload del logo: " + uploadResult.error 
          }, { status: 500 });
        }
      } catch (uploadError: any) {
        console.error(`❌ [${requestId}] Logo upload error:`, uploadError);
        return NextResponse.json({ 
          error: "Errore durante l'upload del logo: " + uploadError.message 
        }, { status: 500 });
      }
    }

    // Aggiorna il locale nel database
    const updatedLocation = await prisma.locations.update({
      where: { id: locationId },
      data: updateData,
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

    console.log(`✅ [${requestId}] Location updated successfully:`, {
      locationId: updatedLocation.id,
      name: updatedLocation.name,
      hasLogo: !!updatedLocation.logo
    });

    return NextResponse.json(updatedLocation, { status: 200 });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in location UPDATE API:`, {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Errori specifici
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
      error: "Errore nell'aggiornamento del locale",
      requestId: requestId
    }, { status: 500 });

  } finally {
    console.log(`🔚 [${requestId}] Disconnecting Prisma...`);
    await prisma.$disconnect();
  }
}