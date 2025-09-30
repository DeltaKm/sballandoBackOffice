import { NextRequest, NextResponse } from "next/server";
import getSFTPService from "~/lib/sftpService.server";

/**
 * API Route per upload di file via SFTP
 * POST /api/sftp/upload
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const eventToken = formData.get('eventToken') as string;

    // Validazione input
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File mancante',
          code: 'MISSING_FILE'
        },
        { status: 400 }
      );
    }

    if (!eventToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token evento mancante',
          code: 'MISSING_EVENT_TOKEN'
        },
        { status: 400 }
      );
    }

    // Validazione tipo file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo file non supportato. Sono accettati: JPEG, PNG, WebP',
          code: 'INVALID_FILE_TYPE',
          allowedTypes
        },
        { status: 400 }
      );
    }

    // Validazione dimensione file (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File troppo grande. Dimensione massima: ${maxSize / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
          maxSize,
          actualSize: file.size
        },
        { status: 400 }
      );
    }

    console.log(`📤 Upload request: ${file.name} (${file.size} bytes) for event ${eventToken}`);

    // Ottieni servizio SFTP
    const sftpService = getSFTPService();
    
    // Upload del file
    const uploadResult = await sftpService.uploadEventCover(file, eventToken);

    console.log(`✅ Upload completed: ${uploadResult.fileName}`);

    return NextResponse.json({
      success: true,
      message: 'File caricato con successo',
      data: {
        fileName: uploadResult.fileName,
        publicUrl: uploadResult.publicUrl,
        fileSize: uploadResult.fileSize,
        uploadedAt: uploadResult.uploadedAt,
        eventToken
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Gestione errori specifici SFTP
    let errorMessage = 'Errore durante l\'upload del file';
    let errorCode = 'UPLOAD_ERROR';
    
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        errorMessage = 'Errore di connessione al server';
        errorCode = 'CONNECTION_ERROR';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Errore di permessi sul server';
        errorCode = 'PERMISSION_ERROR';
      } else if (error.message.includes('directory')) {
        errorMessage = 'Errore nella creazione della directory';
        errorCode = 'DIRECTORY_ERROR';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * API Route per ottenere lo status del servizio SFTP
 * GET /api/sftp/upload
 */
export async function GET() {
  try {
    const sftpService = getSFTPService();
    const status = sftpService.getStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Errore nel controllo dello status',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}
