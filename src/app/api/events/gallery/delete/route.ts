import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import getSFTPService from '~/lib/sftpService.server';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, photo_url } = body;

    if (!event_id || !photo_url) {
      return NextResponse.json({
        status: false,
        error: 'Parametri mancanti: event_id e photo_url sono richiesti'
      }, { status: 400 });
    }

    // Recupera l'evento per ottenere il token
    const event = await prisma.events.findUnique({
      where: { id: parseInt(event_id) },
      select: { token: true, user_id: true }
    });

    if (!event || !event.token) {
      return NextResponse.json({
        status: false,
        error: 'Evento non trovato'
      }, { status: 404 });
    }

    // Estrai il nome del file dall'URL
    // URL formato: https://webservice.sballando.it/storage/images/events/{token}/gallery/{filename}
    const urlParts = photo_url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    if (!fileName) {
      return NextResponse.json({
        status: false,
        error: 'Nome file non valido'
      }, { status: 400 });
    }

    // Elimina il file usando SFTP
    const sftpService = getSFTPService();
    await sftpService.deleteEventGalleryPhoto(event.token, fileName);

    return NextResponse.json({
      status: true,
      message: 'Foto eliminata con successo'
    });

  } catch (error: any) {
    console.error('Errore nella cancellazione della foto:', error);
    return NextResponse.json({
      status: false,
      error: error.message || 'Errore nella cancellazione della foto'
    }, { status: 500 });
  }
}
