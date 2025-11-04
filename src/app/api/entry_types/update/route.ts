import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const {
      entry_type_id,
      user_token,
      label,
      price,
      description,
      category,
      stock,
    } = await request.json();

    // Validazione dati con errori specifici
    const missingFields = [];
    
    if (!entry_type_id) missingFields.push('entry_type_id');
    if (!user_token) missingFields.push('user_token');
    if (!label) missingFields.push('label');
    if (price === undefined || price === null) missingFields.push('price');

    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: `Dati mancanti: ${missingFields.join(', ')}`,
        code: "MISSING_REQUIRED_FIELDS",
        missing_fields: missingFields,
        received_data: {
          entry_type_id: entry_type_id || 'NON FORNITO',
          user_token: user_token ? 'FORNITO' : 'NON FORNITO',
          label: label || 'NON FORNITO',
          price: price !== undefined && price !== null ? price : 'NON FORNITO',
          description: description || 'NON FORNITO',
          category: category || 'NON FORNITO',
          stock: stock !== undefined ? stock : 'NON FORNITO'
        }
      }, { status: 400 });
    }

    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Accesso non autorizzato: token utente non valido",
        code: "INVALID_USER_TOKEN" 
      }, { status: 401 });
    }

    const existingEntry = await prisma.entry_types.findUnique({
      where: { id: parseInt(entry_type_id) },
      include: { events: true },
    });

    if (!existingEntry) {
      return NextResponse.json({ 
        error: `Ingresso non trovato con ID: ${entry_type_id}`,
        code: "ENTRY_NOT_FOUND",
        entry_type_id: entry_type_id
      }, { status: 404 });
    }

    if (existingEntry.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ 
        error: "Non autorizzato: non sei il proprietario di questo ingresso",
        code: "NOT_OWNER",
        owner_id: existingEntry.user_id,
        your_id: user.id
      }, { status: 403 });
    }

    // Verifica modifiche
    const normalizedLabel = (label || '').trim();
    const normalizedExistingLabel = (existingEntry.label || '').trim();
    const normalizedCategory = (category || '').trim();
    const normalizedExistingCategory = (existingEntry.category || '').trim();

    const isChangingLabel = normalizedLabel !== normalizedExistingLabel;
    const isChangingCategory = normalizedCategory !== normalizedExistingCategory;
    const isChangingPrice = price !== existingEntry.price;
    const isChangingDescription = (description || '').trim() !== (existingEntry.description || '').trim();
    const isChangingStock = stock !== undefined && stock !== existingEntry.stock;

    const isTryingToChangeLabel = isChangingLabel && label.trim() !== existingEntry.label;
    const isTryingToChangeCategory = isChangingCategory && (category || '') !== (existingEntry.category || '');

    if (!isChangingLabel && !isChangingPrice && !isChangingCategory && !isChangingDescription && !isChangingStock) {
      const currentEvent = await prisma.events.findUnique({
        where: { id: existingEntry.event_id || 0 },
        include: { entry_types: { orderBy: { created_at: "desc" } } }
      });
      return NextResponse.json(currentEvent, { status: 200 });
    }

    // Controlla se è stato trasferito
    const transferredEntries = await prisma.entry_types.findMany({
      where: {
        event_id: existingEntry.event_id,
        label: existingEntry.label,
        user_id: { not: user.id },
      },
    });

    const isTransferred = transferredEntries.length > 0;
    const totalTransferredStock = transferredEntries.reduce((sum, e) => sum + (e.stock || 0), 0);

    if (isTransferred) {
      // CORREZIONE: Controlla solo se STA REALMENTE CAMBIANDO i valori
      if (isChangingLabel || isChangingCategory ) {
        return NextResponse.json(
          {
            error: "Non puoi modificare nome, prezzo o categoria di un ingresso già trasferito. Puoi modificare solo la descrizione e la quantità.",
            code: "ENTRY_TRANSFERRED_LIMITED_EDIT",
            allowed_changes: ["description", "stock"],
            total_transferred_stock: totalTransferredStock,
            debug_changes: {
              isChangingLabel,
              isChangingCategory, 
              isChangingPrice,
              current_label: normalizedExistingLabel,
              sent_label: normalizedLabel,
              current_category: normalizedExistingCategory,
              sent_category: normalizedCategory,
              current_price: existingEntry.price,
              sent_price: price
            }
          },
          { status: 400 }
        );
      }

      // Se sta modificando lo stock, verifica che non vada sotto quello trasferito
      if (isChangingStock) {
        const newStock = stock === null || stock === "" ? null : parseInt(stock);
        if (newStock !== null && newStock < totalTransferredStock) {
          return NextResponse.json(
            {
              error: `La quantità non può essere inferiore a ${totalTransferredStock} perché ci sono già ${totalTransferredStock} ingressi trasferiti.`,
              code: "STOCK_BELOW_TRANSFERRED",
              min_allowed_stock: totalTransferredStock,
              total_transferred_stock: totalTransferredStock
            },
            { status: 400 }
          );
        }
      }
    }

    // Validazione dati più specifica
    if (typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json({ 
        error: "Il nome dell'ingresso è obbligatorio e deve essere una stringa non vuota",
        code: "INVALID_LABEL",
        received_label: label
      }, { status: 400 });
    }
    
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ 
        error: "Il prezzo deve essere un numero valido maggiore o uguale a 0",
        code: "INVALID_PRICE",
        received_price: price,
        price_type: typeof price
      }, { status: 400 });
    }
    
    if (stock !== null && stock !== undefined && stock !== "" && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      return NextResponse.json({ 
        error: "La quantità deve essere un numero intero maggiore o uguale a 0",
        code: "INVALID_STOCK",
        received_stock: stock,
        stock_type: typeof stock
      }, { status: 400 });
    }

    // Verifica duplicati (solo se cambia nome e non è trasferito)
    if (!isTransferred && isChangingLabel) {
      const duplicateEntry = await prisma.entry_types.findFirst({
        where: {
          event_id: existingEntry.event_id,
          user_id: user.id,
          label: label.trim(),
          id: { not: parseInt(entry_type_id) }
        }
      });
      if (duplicateEntry) {
        return NextResponse.json({ 
          error: `Esiste già un ingresso con questo nome "${label.trim()}" per questo evento`,
          code: "DUPLICATE_ENTRY_NAME",
          duplicate_entry_id: duplicateEntry.id,
          event_id: existingEntry.event_id
        }, { status: 400 });
      }
    }

    // Aggiornamento
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = { updated_at: new Date() };
      if (!isTransferred) {
        if (isChangingLabel) updateData.label = label.trim();
        if (isChangingPrice) updateData.price = price;
        if (isChangingCategory) updateData.category = category && category.trim() ? category.trim() : null;
      }
      if (isChangingDescription) {
        updateData.description = description && description.trim() ? description.trim() : null;
      }
      if (isChangingStock) {
        const newStock = stock === null || stock === "" ? null : parseInt(stock);
        updateData.stock = newStock;

        // Se lo stock aumenta, incrementa anche created_qnt
        if (newStock !== null && newStock > (existingEntry.created_qnt || 0)) {
          updateData.created_qnt = newStock;
        }
        // Se lo stock diminuisce, NON diminuire created_qnt!
      }
      // NON AGGIORNARE MAI created_qnt QUI!

      await tx.entry_types.update({
        where: { id: parseInt(entry_type_id) },
        data: updateData
      });

      // Se trasferito e cambia descrizione, aggiorna anche i trasferiti
      if (isTransferred && isChangingDescription) {
        await tx.entry_types.updateMany({
          where: {
            event_id: existingEntry.event_id,
            label: existingEntry.label,
            user_id: { not: user.id }
          },
          data: {
            description: description && description.trim() ? description.trim() : null,
            updated_at: new Date()
          }
        });
      }
    });

    // Recupera evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: existingEntry.event_id || 0},
      include: {
        entry_types: { 
          orderBy: { created_at: "desc" },
        },
        products: { 
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            event_id: true,
            user_id: true,
            old_user_id: true,
            category: true,
            label: true,
            description: true,
            stock: true,
            created_qnt: true,
            created_at: true,
            requested_date: true,
            updated_at: true,
            burned: true,
            check_unused: true,
            price: true,
            stripe_payment_intent_id: true,
            paid: true,
            entry_type_id: true,
            game: true,
            transfer_qnt: true,
          },
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
        event_music_genres: {
          include: { music_genres: { select: { id: true, label: true } } }
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

    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error('❌ Error updating entry:', error);
    return NextResponse.json(
      { 
        error: "Si è verificato un errore durante l'aggiornamento. Riprova.",
        code: "INTERNAL_SERVER_ERROR",
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}