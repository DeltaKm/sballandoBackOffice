import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { product_id, transfers, user_token } = await request.json();

    // Validazione
    if (!product_id || !transfers || !Array.isArray(transfers) || !user_token) {
      return NextResponse.json(
        { error: "Product ID, Transfers array e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🛍️ Richiesta trasferimento prodotti:', { 
      product_id, 
      transfers: transfers.length,
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

    // Verifica prodotto
    const product = await prisma.products.findUnique({
      where: { id: parseInt(product_id) },
      include: { event: true }
    });

    if (!product) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 }
      );
    }

    console.log('🛍️ Prodotto trovato:', product.label, 'Evento:', product.event.title);

    // Verifica autorizzazione
    if (product.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non autorizzato a trasferire questo prodotto" },
        { status: 403 }
      );
    }

    // Calcola totale da trasferire
    const totalToTransfer = transfers.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);
    
    if (totalToTransfer > (product.stock || 0)) {
      return NextResponse.json(
        { error: "Quantità da trasferire supera lo stock disponibile" },
        { status: 400 }
      );
    }

    console.log('📦 Totale da trasferire:', totalToTransfer, 'Stock disponibile:', product.stock);

    // Esegui trasferimenti in transazione
    await prisma.$transaction(async (tx) => {
      // Riduci stock del prodotto originale
      await tx.products.update({
        where: { id: parseInt(product_id) },
        data: {
          stock: (product.stock || 0) - totalToTransfer
        }
      });

      console.log('✅ Stock prodotto originale ridotto');

      // Per ogni trasferimento
      for (const transfer of transfers) {
        const { collaborator_id, quantity } = transfer;
        
        if (quantity <= 0) continue;

        console.log(`🔄 Trasferendo ${quantity} a collaboratore ${collaborator_id}`);

        // Trova o crea prodotto compatibile per il collaboratore
        let targetProduct = await tx.products.findFirst({
          where: {
            event_id: product.event_id,
            user_id: collaborator_id,
            label: product.label
          }
        });

        if (targetProduct) {
          // Aggiorna stock esistente
          await tx.products.update({
            where: { id: targetProduct.id },
            data: {
              stock: (targetProduct.stock || 0) + quantity
            }
          });
          console.log(`✅ Aggiornato stock prodotto esistente per collaboratore ${collaborator_id}`);
        } else {
          // Crea nuovo prodotto per il collaboratore
          await tx.products.create({
            data: {
              event_id: product.event_id,
              user_id: collaborator_id,
              label: product.label,
              price: product.price,
              description: product.description,
              category: product.category,
              stock: quantity,
              transfer_qnt: quantity,
              created_qnt: 0
            }
          });
          console.log(`✅ Creato nuovo prodotto per collaboratore ${collaborator_id}`);
        }
      }
    });

    console.log('✅ Trasferimento completato');

    // Ritorna evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: product.event_id },
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
        entry_types: true,
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

    console.log('✅ Evento aggiornato recuperato con', updatedEvent?.products?.length, 'prodotti');

    return NextResponse.json(updatedEvent);

  } catch (error) {
    console.error("❌ Errore trasferimento prodotti:", error);
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