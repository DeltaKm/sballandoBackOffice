import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { product_id, user_token } = await request.json();

    // Validazione
    if (!product_id || !user_token) {
      return NextResponse.json(
        { error: "Product ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🔄 Richiesta ritiro prodotti:', { 
      product_id,
      user_token: user_token.substring(0, 8) + '...' 
    });

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
        surname: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    console.log('🔐 Utente che fa la richiesta:', user.email, 'Role:', user.role);

    // Verifica prodotto originale
    const originalProduct = await prisma.products.findUnique({
      where: { id: parseInt(product_id) },
      include: { event: true }
    });

    if (!originalProduct) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 }
      );
    }

    console.log('🛍️ Prodotto originale trovato:', originalProduct.label, 'Evento:', originalProduct.event.title);

    // Verifica autorizzazione
    if (originalProduct.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non autorizzato a ritirare questi prodotti" },
        { status: 403 }
      );
    }

    // Trova tutti i prodotti dei collaboratori con stesso label
    const collaboratorProducts = await prisma.products.findMany({
      where: {
        event_id: originalProduct.event_id,
        label: originalProduct.label,
        user_id: {
          not: user.id
        },
        stock: {
          gt: 0
        }
      }
    });

    if (collaboratorProducts.length === 0) {
      return NextResponse.json(
        { error: "Nessun prodotto da ritirare dai collaboratori" },
        { status: 400 }
      );
    }

    console.log('📦 Trovati', collaboratorProducts.length, 'prodotti da ritirare');

    // Calcola totale da ritirare
    const totalToWithdraw = collaboratorProducts.reduce((sum, product) => sum + (product.stock || 0), 0);
    
    console.log('📊 Totale da ritirare:', totalToWithdraw);

    // Esegui il ritiro in transazione
    const result = await prisma.$transaction(async (tx) => {
      let totalWithdrawn = 0;
      const deletedProducts = [];

      // Per ogni prodotto dei collaboratori
      for (const collabProduct of collaboratorProducts) {
        const stockToWithdraw = collabProduct.stock || 0;
        
        if (stockToWithdraw > 0) {
          console.log(`🔄 Ritirando ${stockToWithdraw} prodotti da user ${collabProduct.user_id} e cancellando il record`);

          // Cancella completamente il record del collaboratore
          await tx.products.delete({
            where: { id: collabProduct.id }
          });

          deletedProducts.push({
            id: collabProduct.id,
            user_id: collabProduct.user_id,
            stock: stockToWithdraw
          });

          totalWithdrawn += stockToWithdraw;
        }
      }

      // Aggiungi lo stock ritirato al prodotto originale
      await tx.products.update({
        where: { id: parseInt(product_id) },
        data: {
          stock: (originalProduct.stock || 0) + totalWithdrawn
        }
      });

      console.log(`✅ Ritirato totale di ${totalWithdrawn} prodotti e cancellati ${deletedProducts.length} record`);
      
      return { totalWithdrawn, deletedProducts };
    });

    // Recupera l'evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: originalProduct.event_id },
      include: {
        products: {
          orderBy: {
            created_at: 'desc'
          }
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
        entry_types: {
          orderBy: {
            created_at: 'desc'
          }
        },
        event_music_genres: {
          include: {
            music_genre: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        location: true
      }
    });

    console.log('✅ Evento aggiornato recuperato');

    return NextResponse.json(updatedEvent);

  } catch (error) {
    console.error("❌ Errore ritiro prodotti:", error);
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