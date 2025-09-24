import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    const { product_id, user_token } = await request.json();

    // Validazione dei dati richiesti
    if (!product_id || !user_token) {
      return NextResponse.json(
        { error: "Product ID e User Token sono richiesti" },
        { status: 400 }
      );
    }

    console.log('🗑️ Richiesta eliminazione prodotto:', { 
      product_id, 
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

    // Trova il prodotto da eliminare
    const productToDelete = await prisma.products.findUnique({
      where: { id: parseInt(product_id) },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            user_id: true
          }
        }
      }
    });

    if (!productToDelete) {
      return NextResponse.json(
        { error: "Prodotto non trovato" },
        { status: 404 }
      );
    }

    console.log('🛍️ Prodotto trovato:', productToDelete.label, 'Evento:', productToDelete.event.title);

    // Verifica autorizzazione: deve essere il proprietario del prodotto, proprietario dell'evento o SUPERADMIN
    const isProductOwner = productToDelete.user_id === requestingUser.id;
    const isEventOwner = productToDelete.event.user_id === requestingUser.id;
    const isSuperAdmin = requestingUser.role === 'SUPERADMIN';

    console.log('🔐 Verifica autorizzazione:', {
      isProductOwner,
      isEventOwner,
      isSuperAdmin
    });

    if (!isProductOwner && !isEventOwner && !isSuperAdmin) {
      return NextResponse.json(
        { error: "Non sei autorizzato a eliminare questo prodotto" },
        { status: 403 }
      );
    }

    console.log('✅ Autorizzazione verificata');

    // Elimina il prodotto
    await prisma.products.delete({
      where: { id: parseInt(product_id) }
    });

    console.log('✅ Prodotto eliminato:', product_id);

    // Recupera l'evento aggiornato con tutti i prodotti rimanenti
    const updatedEvent = await prisma.events.findUnique({
      where: { id: productToDelete.event.id },
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

    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error("❌ Errore eliminando prodotto:", error);
    
    // Gestione errori specifici di Prisma
    if (error instanceof Error) {
      if (error.message.includes('Record to delete does not exist')) {
        return NextResponse.json(
          { error: "Prodotto non trovato" },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: "Impossibile eliminare il prodotto: ci sono ordini associati" },
          { status: 400 }
        );
      }
    }
    
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

const handleConfirmDelete = async () => {
  if (!deleteModal.productId || !user?.token) return;

  setDeleting(true);
  try {
    const res = await fetch('/api/products/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: deleteModal.productId,
        user_token: user.token
      }),
    });

    if (res.ok) {
      const updatedEvent = await res.json();
      onUpdate?.(updatedEvent);
      closeDeleteModal();
    } else {
      const errorData = await res.json();
      alert(`Errore durante l'eliminazione: ${errorData.error || 'Errore sconosciuto'}`);
    }
  } catch (err) {
    console.error('Error deleting product:', err);
    alert('Errore durante la connessione al server');
  } finally {
    setDeleting(false);
  }
};