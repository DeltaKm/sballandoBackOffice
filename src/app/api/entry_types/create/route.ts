import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Parse del body
    const body = await request.json();
    const {
      user_token,
      event_id,
      label,
      description,
      category,
      type,
      quantity,
      price,
      seats,
      fairplay_min,
      gender_min_enabled,
      gender_min_type,
      gender_min_quantity,
      consumations
    } = body;

    console.log('📝 Dati ricevuti:', { event_id, label, user_token });

    // Verifica che il token sia presente
    if (!user_token) {
      return NextResponse.json(
        { error: 'Token utente mancante' }, 
        { status: 401 }
      );
    }

    // Verifica il token e ottieni l'utente
    const user = await prisma.users.findFirst({
      where: {
        token: user_token
      },
      select: {
        id: true,
        token: true,
        email: true,
        name: true,
        surname: true,
        role: true,
      }
    });

    console.log('👤 Utente trovato:', user ? 'Sì' : 'No', user?.id);

    if (!user) {
      return NextResponse.json(
        { error: 'Token non valido o utente non trovato' }, 
        { status: 401 }
      );
    }

    // Validazione campi obbligatori
    if (!event_id || !label) {
      return NextResponse.json(
        { error: 'event_id e label sono obbligatori' }, 
        { status: 400 }
      );
    }

    // Verifica che l'evento esista
    const eventExists = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: { id: true, user_id: true }
    });

    console.log('🎪 Evento trovato:', eventExists ? 'Sì' : 'No', eventExists?.id);

    if (!eventExists) {
      return NextResponse.json(
        { error: 'Evento non trovato' }, 
        { status: 404 }
      );
    }

    // Verifica che l'utente abbia accesso all'evento
    const hasAccess = await prisma.events.findFirst({
      where: {
        id: parseInt(event_id),
        OR: [
          { user_id: user.id }, // Proprietario
          {
            collaborators: {
              some: {
                user_id: user.id
                // Rimosso il campo status che non esiste
              }
            }
          }
        ]
      }
    });

    console.log('🔐 Ha accesso:', hasAccess ? 'Sì' : 'No', 'Role:', user.role);

    // Controllo accesso: deve essere proprietario, collaboratore o SUPERADMIN
    if (!hasAccess && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Accesso negato all\'evento' }, 
        { status: 403 }
      );
    }

    // Creazione del tipo di ingresso con dati semplificati
    console.log('💾 Creando entry type...');
    
    const entryType = await prisma.entry_types.create({
      data: {
        event: {
          connect: { id: parseInt(event_id) }
        },
        user_id: user.id,
        label: label.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        type: type || 'free',
        price: price ? parseFloat(price) : 0,
        seats: seats ? parseInt(seats) : 1,
        fairplay_min: fairplay_min ? parseInt(fairplay_min) : 0,
        stock: quantity ? parseInt(quantity) : null,
        created_qnt: quantity ? parseInt(quantity) : null,
      }
    });

    console.log('✅ Entry type creato:', entryType.id);

    // Creazione dei prodotti per le consumazioni
    if (consumations && Array.isArray(consumations) && consumations.length > 0) {
      console.log('🍸 Creando prodotti per le consumazioni...');
      
      for (const consumation of consumations) {
        try {
          const product = await prisma.products.create({
            data: {
              event_id: parseInt(event_id),
              entry_type_id: entryType.id,
              user_id: user.id,
              label: consumation.label.trim(),
              description: consumation.description?.trim() || null,
              category: consumation.category?.trim() || null,
              price: 0, // Le consumazioni incluse sono gratuite
              stock: quantity ? parseInt(quantity) : null,
              created_qnt: quantity ? parseInt(quantity) : null,
              // Altri campi opzionali se necessari
              created_at: new Date(),
              updated_at: new Date()
            }
          });
          
          console.log(`✅ Prodotto consumazione creato: ${product.id} - ${product.label}`);
        } catch (productError) {
          console.error(`❌ Errore creando prodotto per consumazione "${consumation.label}":`, productError);
          // Continua con le altre consumazioni anche se una fallisce
        }
      }
    }

    // Recupera l'evento aggiornato con relazioni semplificate
    const updatedEvent = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      include: {
        entry_types: true, // Rimuovi l'include di products se non esiste la relazione
        location: true,
        collaborators: true,
        event_music_genres: true,
        products: true // I prodotti sono collegati direttamente all'evento
      }
    });

    console.log('🔄 Evento aggiornato recuperato');

    return NextResponse.json(updatedEvent, { status: 201 });

  } catch (error) {
    console.error('❌ Errore completo:', error);
    if (error instanceof Error) {
      console.error('❌ Stack trace:', error.stack);
    }
    return NextResponse.json(
      { error: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error)) }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}