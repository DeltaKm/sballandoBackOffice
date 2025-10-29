import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import getSFTPService from '~/lib/sftpService.server';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const eventId = formData.get('event_id') as string;
    const file = formData.get('photo') as File;

    if (!eventId || !file) {
      return NextResponse.json({
        status: false,
        error: 'Parametri mancanti: event_id e photo sono richiesti'
      }, { status: 400 });
    }

    // Verifica che sia effettivamente un file immagine
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        status: false,
        error: 'Il file deve essere un\'immagine'
      }, { status: 400 });
    }

    // Recupera l'evento per ottenere il token
    const event = await prisma.events.findUnique({
      where: { id: parseInt(eventId) },
      select: { token: true, user_id: true }
    });

    if (!event || !event.token) {
      return NextResponse.json({
        status: false,
        error: 'Evento non trovato'
      }, { status: 404 });
    }

    // Carica il file usando SFTP
    const sftpService = getSFTPService();
    const result = await sftpService.uploadEventGalleryPhoto(file, event.token);

    return NextResponse.json({
      status: true,
      message: 'Foto caricata con successo',
      photo: result.publicUrl
    });

  } catch (error: any) {
    console.error('Errore nel caricamento della foto:', error);
    return NextResponse.json({
      status: false,
      error: error.message || 'Errore nel caricamento della foto'
    }, { status: 500 });
  }
}
