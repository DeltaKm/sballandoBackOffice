import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import SFTPClient from 'ssh2-sftp-client';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File mancante' },
        { status: 400 }
      );
    }

    // ✅ SALVA TEMPORANEAMENTE IL FILE
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Crea un nome file temporaneo unico
    const tempFileName = `${Date.now()}-${file.name}`;
    const tempPath = join('/tmp', tempFileName);
    
    await writeFile(tempPath, buffer);
    console.log(`📁 File temporaneo salvato: ${tempPath}`);

    // ✅ CARICA SU SERVER REMOTO VIA SFTP
    const sftp = new SFTPClient();
    
    try {
      await sftp.connect({
        host: process.env.SFTP_HOST || "217.160.144.254",
        port: parseInt(process.env.SFTP_PORT || "3306"),
        username: process.env.SFTP_USERNAME || "censimento",
        password: process.env.SFTP_PASSWORD || "Cmh_2017",
        // Per chiave privata:
        // privateKey: process.env.SFTP_PRIVATE_KEY
      });

    const remotePath = `/var/www/html/webservice.sballando.it/storage/app/public/images`;

      await sftp.put(tempPath, remotePath);
      
      console.log(`📤 File caricato su server remoto: ${remotePath}`);

      return NextResponse.json({
        success: true,
        message: 'File caricato sul server remoto',
        path: remotePath,
        originalName: file.name,
        size: file.size
      });

    } catch (sftpError) {
      console.error('❌ Errore SFTP:', sftpError);
      
      return NextResponse.json(
        { 
          error: 'Errore nel caricamento su server remoto',
          details: sftpError instanceof Error ? sftpError.message : 'Errore sconosciuto'
        },
        { status: 500 }
      );
      
    } finally {
      // ✅ PULISCI SEMPRE IL FILE TEMPORANEO
      try {
        await unlink(tempPath);
        console.log(`🗑️ File temporaneo rimosso: ${tempPath}`);
      } catch (unlinkError) {
        console.error('⚠️ Errore rimozione file temporaneo:', unlinkError);
      }
      
      // ✅ CHIUDI CONNESSIONE SFTP
      try {
        await sftp.end();
      } catch (endError) {
        console.error('⚠️ Errore chiusura SFTP:', endError);
      }
    }

  } catch (error) {
    console.error('❌ Errore generale upload:', error);
    
    return NextResponse.json(
      { 
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto'
      },
      { status: 500 }
    );
  }
}
