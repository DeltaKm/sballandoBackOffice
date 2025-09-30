import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const {
      product_id,
      user_token,
      label,
      price,
      description,
      category,
      stock,
    } = await request.json();

    // Validazione iniziale
    if (
      !product_id ||
      !user_token ||
      !label ||
      price === undefined ||
      price === null
    ) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Accesso non autorizzato" },
        { status: 401 }
      );
    }

    // Verifica prodotto
    const existingProduct = await prisma.products.findUnique({
      where: { id: parseInt(product_id) },
      include: { event: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 }
      );
    }

    // Autorizzazione
    if (existingProduct.user_id !== user.id && user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Non autorizzato a modificare questo prodotto" },
        { status: 403 }
      );
    }

    // Controllo modifiche reali
    const isChangingLabel = label.trim() !== existingProduct.label;
    const isChangingPrice =
      Number(price) !== Number(existingProduct.price);
    const isChangingCategory =
      (category || "") !== (existingProduct.category || "");
    const isChangingDescription =
      (description || "") !== (existingProduct.description || "");
    const isChangingStock =
      stock !== undefined &&
      stock !== null &&
      stock !== "" &&
      Number(stock) !== Number(existingProduct.stock || 0);

    // Se non ci sono modifiche ritorna evento
    if (
      !isChangingLabel &&
      !isChangingPrice &&
      !isChangingCategory &&
      !isChangingDescription &&
      !isChangingStock
    ) {
      const currentEvent = await prisma.events.findUnique({
        where: { id: existingProduct.event_id || 0 },
        include: {
          products: { orderBy: { created_at: "desc" } },
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
                  role: true,
                },
              },
            },
          },
          entry_types: { orderBy: { created_at: "desc" } },
          event_music_genres: {
            include: { music_genre: { select: { id: true, label: true } } },
          },
          location_: true,
        },
      });

      return NextResponse.json(currentEvent, { status: 200 });
    }

    // Controlla se è stato trasferito
    const transferredProducts = await prisma.products.findMany({
      where: {
        event_id: existingProduct.event_id,
        label: existingProduct.label,
        user_id: { not: user.id },
      },
    });

    const isTransferred = transferredProducts.length > 0;
    const totalTransferredStock = transferredProducts.reduce(
      (sum, p) => sum + (p.stock || 0),
      0
    );

    // ⚠️ Se trasferito, blocca solo label, price, category se cambiano davvero
    if (isTransferred) {
      if (isChangingLabel || isChangingPrice || isChangingCategory) {
        return NextResponse.json(
          {
            error:
              "Non puoi modificare nome, prezzo o categoria di un prodotto già trasferito. Puoi modificare solo descrizione e quantità.",
            code: "PRODUCT_TRANSFERRED_LIMITED_EDIT",
            allowed_changes: ["description", "stock"],
            total_transferred_stock: totalTransferredStock,
          },
          { status: 400 }
        );
      }

      // Se modifica stock, non può andare sotto al trasferito
      if (isChangingStock) {
        const newStock =
          stock === null || stock === "" ? null : Number(stock);
        if (newStock !== null && newStock < totalTransferredStock) {
          return NextResponse.json(
            {
              error: `La quantità non può essere inferiore a ${totalTransferredStock} perché ci sono già ${totalTransferredStock} prodotti trasferiti ai collaboratori.`,
              code: "STOCK_BELOW_TRANSFERRED",
              min_allowed_stock: totalTransferredStock,
            },
            { status: 400 }
          );
        }
      }
    }

    // Validazioni di base
    if (typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json(
        { error: "Il nome del prodotto è obbligatorio" },
        { status: 400 }
      );
    }

    if (typeof price !== "number" || Number(price) < 0) {
      return NextResponse.json(
        { error: "Il prezzo deve essere un numero valido >= 0" },
        { status: 400 }
      );
    }

    if (
      stock !== null &&
      stock !== undefined &&
      stock !== "" &&
      (isNaN(Number(stock)) || Number(stock) < 0)
    ) {
      return NextResponse.json(
        { error: "La quantità deve essere >= 0" },
        { status: 400 }
      );
    }

    // Evita duplicati (solo se non trasferito e label cambia)
    if (!isTransferred && isChangingLabel) {
      const duplicate = await prisma.products.findFirst({
        where: {
          event_id: existingProduct.event_id,
          user_id: user.id,
          label: label.trim(),
          id: { not: parseInt(product_id) },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Esiste già un prodotto con questo nome per questo evento" },
          { status: 400 }
        );
      }
    }

    // Aggiornamento in transazione
    // Aggiornamento in transazione
const result = await prisma.$transaction(async (tx) => {
  const updateData: any = { updated_at: new Date() };

  if (!isTransferred) {
    if (isChangingLabel) updateData.label = label.trim();
    if (isChangingPrice) updateData.price = Number(price);
    if (isChangingCategory) updateData.category = category?.trim() || null;
  }

  if (isChangingDescription) {
    updateData.description = description?.trim() || null;
  }

  if (isChangingStock) {
    const newStock = stock === null || stock === "" ? null : Number(stock);

    if (newStock !== null) {
      // ⚡ LOGICA SPECIALE: se stock < created_qnt attuale, aggiorno entrambi
      if (newStock < (existingProduct.created_qnt || 0)) {
        updateData.created_qnt = newStock;
        updateData.stock = 0;
      } else {
        updateData.stock = newStock;
      }
    } else {
      updateData.stock = null;
    }
  }

  const updatedProduct = await tx.products.update({
    where: { id: parseInt(product_id) },
    data: updateData,
  });

  if (isTransferred && isChangingDescription) {
    await tx.products.updateMany({
      where: {
        event_id: existingProduct.event_id,
        label: existingProduct.label,
        user_id: { not: user.id },
      },
      data: {
        description: description?.trim() || null,
        updated_at: new Date(),
      },
    });
  }

  return updatedProduct;
});


    // Ritorna evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: existingProduct.event_id  || 0 },
      include: {
        products: { orderBy: { created_at: "desc" } },
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
                role: true,
              },
            },
          },
        },
        entry_types: { orderBy: { created_at: "desc" } },
        event_music_genres: {
          include: { music_genre: { select: { id: true, label: true } } },
        },
        location_: true,
      },
    });

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error("❌ Errore aggiornamento prodotto:", error);
    return NextResponse.json(
      { error: "Errore durante l'aggiornamento. Riprova." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
