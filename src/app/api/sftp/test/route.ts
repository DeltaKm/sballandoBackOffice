import { NextRequest, NextResponse } from "next/server";
import getSFTPService from "~/lib/sftpService.server";

/**
 * API Route di test per verificare la connessione SFTP
 * GET /api/sftp/test
 */
export async function GET() {
  try {
    const sftpService = getSFTPService();
    const status = sftpService.getStatus();
    
    return NextResponse.json({
      success: true,
      message: 'SFTP service test completed',
      data: {
        status: status.status,
        config: status.config,
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasHost: !!process.env.SFTP_HOST,
          hasUsername: !!process.env.SFTP_USERNAME,
          hasPassword: !!process.env.SFTP_PASSWORD,
          uploadPath: process.env.SFTP_UPLOAD_PATH,
          baseUrl: process.env.UPLOADS_BASE_URL
        }
      }
    });
    
  } catch (error) {
    console.error('❌ SFTP test error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'SFTP test failed',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * API Route di test per upload file di prova
 * POST /api/sftp/test
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File mancante per il test',
          code: 'MISSING_FILE'
        },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing SFTP upload with file: ${file.name} (${file.size} bytes)`);

    const sftpService = getSFTPService();
    
    // Genera token di test
    const testToken = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Test upload
    const uploadResult = await sftpService.uploadEventCover(file, testToken);

    console.log(`✅ Test upload completed`);

    return NextResponse.json({
      success: true,
      message: 'Test upload completed successfully',
      data: {
        testToken,
        uploadResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ SFTP test upload error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Test upload failed',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
