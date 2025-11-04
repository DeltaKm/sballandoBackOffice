import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  console.log('🔍 GET event API called for ID:', id);
  
  try {
    const event = await db.events.findUnique({
      where: { id: Number(id) },
      include: {
        entry_types: true,
        event_music_genres: {
          include: {
            music_genres: true,
          },
        },
        collaborators: {
          include: {
            users: true,
          },
        },
        products: {
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
        locations: true,
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Evento non trovato" }, { status: 404 });
    }

    // Aggiungi manualmente i prodotti a ciascun entry_type
    if (event.entry_types && event.entry_types.length > 0) {
      for (const entryType of event.entry_types) {
        const associatedProducts = await db.products.findMany({
          where: {
            entry_type_id: entryType.id,
          },
        });
        (entryType as any).products = associatedProducts;
      }
    }

    // Debug: controlla i prodotti e il campo entry_type_id
    console.log('🔍 Products debug:', {
      totalProducts: event.products?.length || 0,
      productsWithEntryType: event.products?.filter(p => p.entry_type_id !== null).length || 0,
      productsWithoutEntryType: event.products?.filter(p => p.entry_type_id === null).length || 0,
      sampleProducts: event.products?.slice(0, 3).map(p => ({
        id: p.id,
        label: p.label,
        entry_type_id: p.entry_type_id
      }))
    });

    console.log('✅ Event found:', {
      id: event.id,
      title: event.title,
      dress_code: event.dress_code,
      age_recommended: event.age_recommended
    });

    return NextResponse.json(event);
  } catch (err) {
    console.error('❌ Error fetching event:', err);
    console.error('Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ 
      message: "Errore server",
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ✅ METODO DELETE PER ELIMINARE UN EVENTO
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    console.log(`🗑️ Attempting to delete event with ID: ${id}`);

    // ✅ VERIFICA CHE L'EVENTO ESISTA
    const existingEvent = await db.events.findUnique({
      where: { id: Number(id) },
      include: {
        entry_types: true,
        event_music_genres: true,
        collaborators: true,
        products: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { 
          success: false,
          message: "Evento non trovato" 
        }, 
        { status: 404 }
      );
    }

    console.log(`📋 Found event to delete: "${existingEvent.title}"`);

    // ✅ ELIMINA IN TRANSAZIONE (per garantire consistenza)
    const result = await db.$transaction(async (tx) => {
      // 1. Elimina le relazioni con i generi musicali
      if (existingEvent.event_music_genres.length > 0) {
        await tx.event_music_genres.deleteMany({
          where: { event_id: Number(id) }
        });
        console.log(`🎵 Deleted ${existingEvent.event_music_genres.length} music genre relations`);
      }

      // 2. Elimina i collaboratori
      if (existingEvent.collaborators.length > 0) {
        await tx.collaborators.deleteMany({
          where: { event_id: Number(id) }
        });
        console.log(`👥 Deleted ${existingEvent.collaborators.length} collaborators`);
      }

      // 3. Elimina i tipi di ingresso
      if (existingEvent.entry_types.length > 0) {
        await tx.entry_types.deleteMany({
          where: { event_id: Number(id) }
        });
        console.log(`🎫 Deleted ${existingEvent.entry_types.length} entry types`);
      }

      // 4. Elimina i prodotti associati
      if (existingEvent.products.length > 0) {
        await tx.products.deleteMany({
          where: { event_id: Number(id) }
        });
        console.log(`📦 Deleted ${existingEvent.products.length} products`);
      }

      // 5. Elimina eventuali notifiche associate all'evento
      try {
        const deletedNotifications = await tx.notifications.deleteMany({
          where: {
            event_id: existingEvent.id
          }
        });
        console.log(`🔔 Deleted ${deletedNotifications.count} notifications`);
      } catch (notificationError) {
        console.warn('⚠️ Error deleting notifications:', notificationError);
        // Non bloccare l'eliminazione se le notifiche falliscono
      }

      // 6. Infine, elimina l'evento stesso
      const deletedEvent = await tx.events.delete({
        where: { id: Number(id) }
      });

      console.log(`✅ Successfully deleted event: ${deletedEvent.title}`);
      return deletedEvent;
    });

    // ✅ TODO: ELIMINA ANCHE IL FILE IMMAGINE DAL SERVER SFTP
    if (existingEvent.cover) {
      try {
        console.log(`🗑️ TODO: Delete cover image: ${existingEvent.cover}`);
        // Implementa qui la rimozione del file SFTP se necessario
        // await deleteSFTPFile(existingEvent.cover);
      } catch (imageError) {
        console.warn('⚠️ Failed to delete cover image:', imageError);
        // Non bloccare l'eliminazione se la rimozione immagine fallisce
      }
    }

    return NextResponse.json({
      success: true,
      message: "Evento eliminato con successo",
      deleted_event: {
        id: result.id,
        title: result.title,
        token: result.token,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error deleting event:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      event_id: id
    });

    // ✅ GESTIONE ERRORI SPECIFICI
    if (error instanceof Error) {
      // Errore di foreign key constraint
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json({
          success: false,
          error: "Impossibile eliminare l'evento: esistono ancora dati collegati",
          details: "Verifica che non ci siano prenotazioni, pagamenti o altri dati associati a questo evento"
        }, { status: 409 }); // 409 Conflict
      }

      // Errore di record non trovato durante eliminazione
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json({
          success: false,
          error: "Evento non trovato o già eliminato"
        }, { status: 404 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Errore interno durante l'eliminazione dell'evento",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 });
  }
}

// ✅ METODO PUT PER AGGIORNARE UN EVENTO (opzionale)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  try {
    const body = await req.json();
    
    console.log(`📝 Updating event ID: ${id}`);

    // Verifica che l'evento esista
    const existingEvent = await db.events.findUnique({
      where: { id: Number(id) }
    });

    if (!existingEvent) {
      return NextResponse.json(
        { 
          success: false,
          message: "Evento non trovato" 
        }, 
        { status: 404 }
      );
    }

    // Aggiorna l'evento
    const updatedEvent = await db.events.update({
      where: { id: Number(id) },
      data: {
        ...body,
        updated_at: new Date()
      },
      include: {
        entry_types: true,
        event_music_genres: {
          include: {
            music_genres: true,
          },
        },
        collaborators: {
          include: {
            users: true,
          },
        },
        products: true,
        locations: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Evento aggiornato con successo",
      event: updatedEvent
    });

  } catch (error) {
    console.error('❌ Error updating event:', error);

    return NextResponse.json({
      success: false,
      error: "Errore durante l'aggiornamento dell'evento",
      details: error instanceof Error ? error.message : "Errore sconosciuto"
    }, { status: 500 });
  }
}
