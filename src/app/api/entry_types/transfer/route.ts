import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { entry_type_id, transfers, user_token } = await request.json();

    // Validazione
    if (!entry_type_id || !transfers || !Array.isArray(transfers) || !user_token) {
      return NextResponse.json(
        { error: "Entry Type ID, Transfers array e User Token sono richiesti" },
        { status: 400 }
      );
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    // Verifica entry type
    const entryType = await prisma.entry_types.findUnique({
      where: { id: parseInt(entry_type_id) },
      include: { events: true }
    });

    if (!entryType) {
      return NextResponse.json(
        { error: "Ingresso non trovato" },
        { status: 404 }
      );
    }

    // Verifica autorizzazione
    if (entryType.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 403 }
      );
    }

    // Calcola totale da trasferire
    const totalToTransfer = transfers.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0);
    
    if (totalToTransfer > (entryType.stock || 0)) {
      return NextResponse.json(
        { error: "Quantità da trasferire supera lo stock disponibile" },
        { status: 400 }
      );
    }

    // Esegui trasferimenti in transazione
    await prisma.$transaction(async (tx) => {
      // Riduci stock dell'ingresso originale
      await tx.entry_types.update({
        where: { id: parseInt(entry_type_id) },
        data: {
          stock: (entryType.stock || 0) - totalToTransfer
        }
      });

      // Per ogni trasferimento
      for (const transfer of transfers) {
        const { collaborator_id, quantity } = transfer;
        
        if (quantity <= 0) continue;

        // Trova o crea ingresso compatibile per il collaboratore
        let targetEntry = await tx.entry_types.findFirst({
          where: {
            event_id: entryType.event_id,
            user_id: collaborator_id,
            label: entryType.label
          }
        });

        if (targetEntry) {
          // Aggiorna stock esistente
          await tx.entry_types.update({
            where: { id: targetEntry.id },
            data: {
              stock: (targetEntry.stock || 0) + quantity
            }
          });

          // Aggiorna anche i prodotti associati se esistono
          const sourceProducts = await tx.products.findMany({
            where: { entry_type_id: entryType.id }
          });

          console.log(`📦 Trovati ${sourceProducts.length} prodotti da aggiornare per l'ingresso esistente`);

          for (const product of sourceProducts) {
            const productQuantity = Math.floor((quantity * (product.stock || 0) / (entryType.stock || 1)));
            
            const existingProduct = await tx.products.findFirst({
              where: {
                entry_type_id: targetEntry.id,
                label: product.label
              }
            });

            if (existingProduct) {
              // Aumenta lo stock del prodotto del collaboratore
              const newCollabStock = (existingProduct.stock || 0) + productQuantity;
              await tx.products.update({
                where: { id: existingProduct.id },
                data: {
                  stock: newCollabStock
                }
              });
              console.log(`📈 Aumentato stock prodotto collaboratore "${product.label}" da ${existingProduct.stock} a ${newCollabStock}`);

              // Diminuisci lo stock del prodotto del proprietario
              const newOwnerStock = (product.stock || 0) - productQuantity;
              await tx.products.update({
                where: { id: product.id },
                data: {
                  stock: newOwnerStock
                }
              });
              console.log(`📉 Diminuito stock prodotto proprietario "${product.label}" da ${product.stock} a ${newOwnerStock}`);
            }
          }
        } else {
          // Crea nuovo ingresso per il collaboratore
          const newEntry = await tx.entry_types.create({
            data: {
              event_id: entryType.event_id,
              user_id: collaborator_id,
              label: entryType.label,
              price: entryType.price,
              description: entryType.description,
              category: entryType.category,
              stock: quantity,
              transfer_qnt: quantity,
              created_qnt: 0,
              type: entryType.type
            }
          });

          // Copia anche i prodotti associati
          const sourceProducts = await tx.products.findMany({
            where: { entry_type_id: entryType.id }
          });

          console.log(`🍹 Trovati ${sourceProducts.length} prodotti da copiare per il nuovo ingresso`);

          for (const product of sourceProducts) {
            const productQuantity = Math.floor((quantity * (product.stock || 0) / (entryType.stock || 1)));
            
            // Crea il prodotto per il collaboratore
            await tx.products.create({
              data: {
                label: product.label,
                description: product.description,
                category: product.category,
                price: product.price,
                stock: productQuantity,
                entry_type_id: newEntry.id,
                event_id: product.event_id,
                user_id: collaborator_id,
                created_qnt: productQuantity,
                transfer_qnt: 0
              }
            });
            console.log(`✨ Creato prodotto "${product.label}" per il collaboratore con stock ${productQuantity}`);

            // Diminuisci lo stock del prodotto del proprietario
            const newOwnerStock = (product.stock || 0) - productQuantity;
            await tx.products.update({
              where: { id: product.id },
              data: {
                stock: newOwnerStock
              }
            });
            console.log(`📉 Diminuito stock prodotto proprietario "${product.label}" da ${product.stock} a ${newOwnerStock}`);
          }
        }
      }
    });

    // Ritorna evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: entryType.event_id || 0 },
      include: {
        entry_types: true,
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
        products: true,
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

    // Aggiungi manualmente i prodotti a ciascun entry_type
    if (updatedEvent && updatedEvent.entry_types && updatedEvent.entry_types.length > 0) {
      for (const entryType of updatedEvent.entry_types) {
        const associatedProducts = await prisma.products.findMany({
          where: {
            entry_type_id: entryType.id,
          },
        });
        (entryType as any).products = associatedProducts;
      }
    }

    return NextResponse.json(updatedEvent);

  } catch (error) {
    console.error("Errore trasferimento:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}