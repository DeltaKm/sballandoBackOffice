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
      include: { event: true }
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
        } else {
          // Crea nuovo ingresso per il collaboratore
          await tx.entry_types.create({
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
        products: true,
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
        location_: true
      }
    });

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