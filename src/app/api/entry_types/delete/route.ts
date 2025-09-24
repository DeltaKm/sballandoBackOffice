import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function DELETE(request: NextRequest) {
  let prisma: PrismaClient;
  
  try {
    // Inizializza Prisma all'interno del try block
    prisma = new PrismaClient();
    
    const body = await request.json();
    const { entry_type_id, user_token } = body;

    console.log('🗑️ Richiesta eliminazione entry type:', { entry_type_id, user_token });

    // Verifica che i parametri siano presenti
    if (!entry_type_id || !user_token) {
      return NextResponse.json(
        { error: 'Entry type ID e token utente sono obbligatori' }, 
        { status: 400 }
      );
    }

    // Test connessione Prisma
    await prisma.$connect();
    console.log('✅ Connessione Prisma stabilita');

    // Verifica il token e ottieni l'utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: {
        id: true,
        role: true,
        email: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Token utente non valido' }, 
        { status: 401 }
      );
    }

    // Trova l'entry type da eliminare
    const entryType = await prisma.entry_types.findUnique({
      where: { id: parseInt(entry_type_id) },
      include: {
        event: true
      }
    });

    if (!entryType) {
      return NextResponse.json(
        { error: 'Tipo di ingresso non trovato' }, 
        { status: 404 }
      );
    }

    // Verifica i permessi: deve essere il proprietario dell'entry type o SUPERADMIN
    const isOwner = entryType.user_id === user.id;
    const isSuperAdmin = user.role === 'SUPERADMIN';
    
    // Verifica se è proprietario dell'evento
    const isEventOwner = entryType.event.user_id === user.id;
    
    // Verifica se è collaboratore dell'evento
    const isCollaborator = await prisma.collaborators.findFirst({
      where: {
        event_id: entryType.event.id,
        user_id: user.id
      }
    });

    if (!isOwner && !isSuperAdmin && !isEventOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'Non hai i permessi per eliminare questo ingresso' }, 
        { status: 403 }
      );
    }

    console.log('🔐 Permessi verificati per eliminazione');

    // Elimina prima i prodotti collegati (se esistono)
    const deletedProducts = await prisma.products.deleteMany({
      where: { entry_type_id: parseInt(entry_type_id) }
    });

    console.log(`🗑️ Eliminati ${deletedProducts.count} prodotti collegati`);

    // Elimina l'entry type
    await prisma.entry_types.delete({
      where: { id: parseInt(entry_type_id) }
    });

    console.log('✅ Entry type eliminato con successo');

    // Recupera l'evento aggiornato
    const updatedEvent = await prisma.events.findUnique({
      where: { id: entryType.event.id },
      include: {
        entry_types: true,
        location: true,
        collaborators: {
          include: {
            user: true
          }
        },
        event_music_genres: true,
        products: true
      }
    });

    return NextResponse.json(updatedEvent, { status: 200 });

  } catch (error) {
    console.error('❌ Errore completo:', error);
    return NextResponse.json(
      { error: 'Errore interno del server: ' + (error instanceof Error ? error.message : String(error)) }, 
      { status: 500 }
    );
  } finally {
    // Disconnetti Prisma
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('❌ Errore disconnessione Prisma:', disconnectError);
      }
    }
  }
}