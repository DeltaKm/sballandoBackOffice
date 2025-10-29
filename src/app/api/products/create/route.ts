import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { event_id, label, price, description, stock, category, user_token } = await request.json();

    // Validazione dei dati richiesti
    if (!event_id || !label || price === undefined || !user_token) {
      return NextResponse.json(
        { error: "Event ID, Label, Price e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🛍️ Richiesta creazione prodotto:', { 
      event_id, 
      label, 
      price, 
      category: category || 'Senza categoria',
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica il token e ottieni l'utente che fa la richiesta
    const requestingUser = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        surname: true
      }
    });

    if (!requestingUser) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', requestingUser.email, 'Role:', requestingUser.role);

    // Verifica che l'evento esista
    const event = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: {
        id: true,
        title: true,
        user_id: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento non trovato" },
        { status: 404 }
      );
    }

    console.log('🎟️ Evento trovato:', event.title, 'Proprietario ID:', event.user_id);

    // Verifica autorizzazione: deve essere il proprietario dell'evento, collaboratore o SUPERADMIN
    const isEventOwner = event.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';
    
    // Verifica se è collaboratore dell'evento
    let isCollaborator = false;
    try {
      const collaborator = await prisma.collaborators.findFirst({
        where: {
          event_id: parseInt(event_id),
          user_id: requestingUser.id
        }
      });
      isCollaborator = !!collaborator;
    } catch (collaboratorError) {
      console.log('⚠️ Errore verifica collaboratore (continuo):', collaboratorError);
    }

    console.log('🔐 Verifica autorizzazione:', {
      isEventOwner,
      isSuperAdmin,
      isCollaborator
    });

    if (!isEventOwner && !isSuperAdmin && !isCollaborator) {
      return NextResponse.json(
        { error: "Non sei autorizzato a creare prodotti per questo evento" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata');

    // Validazione prezzo
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Il prezzo deve essere un numero valido maggiore o uguale a 0" },
        { status: 400 }
      );
    }

    // Validazione stock (se fornito)
    let parsedStock = null;
    if (stock !== null && stock !== undefined && stock !== '') {
      parsedStock = parseInt(stock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json(
          { error: "Lo stock deve essere un numero intero maggiore o uguale a 0" },
          { status: 400 }
        );
      }
    }

    console.log('🚀 Creazione prodotto...');

    // Crea il prodotto
    const newProduct = await prisma.products.create({
      data: {
        event_id: parseInt(event_id),
        user_id: requestingUser.id,
        label: label.trim(),
        price: parsedPrice,
        description: description ? description.trim() : null,
        stock: stock,
        created_qnt: stock,
        category: category ? category.trim() : null,
      }
    });

    console.log('✅ Prodotto creato:', newProduct.id);

    // Recupera l'evento aggiornato con tutti i prodotti
    const updatedEvent = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      include: {
        products: {
          orderBy: {
            created_at: 'desc'
          }
        },
        collaborators: {
          include: {
            users: {
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
        entry_types: true,
        event_music_genres: {
          include: {
            music_genres: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        locations: true
      }
    });

    console.log('✅ Evento aggiornato recuperato con', updatedEvent?.products?.length, 'prodotti');

    return NextResponse.json(updatedEvent, { status: 201 });

  } catch (error) {
    console.error("❌ Errore creando prodotto:", error);
    
    return NextResponse.json(
      { 
        error: "Errore interno del server: " + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}