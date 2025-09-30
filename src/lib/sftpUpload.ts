import SFTPClient from 'ssh2-sftp-client';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export async function uploadFileToSFTP(
  file: File,
  remotePath: string,
  fileName?: string
): Promise<string> {
  const sftp = new SFTPClient();
  let tempPath: string | null = null;

  try {
    // ✅ CONFIGURAZIONE SFTP
    const sftpConfig: SFTPConfig = {
      host: process.env.SFTP_HOST || 'your-server-ip',
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USERNAME || 'your-username',
      password: process.env.SFTP_PASSWORD,
    };

    console.log('🔗 Connecting to SFTP server...');
    await sftp.connect(sftpConfig);

    // ✅ PREPARA IL FILE LOCALE TEMPORANEO
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const uniqueFileName = fileName || `cover.${fileExtension}`;
    
    // Converti il file in buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Salva temporaneamente
    tempPath = join('/tmp', `upload-${Date.now()}-${uniqueFileName}`);
    await writeFile(tempPath, buffer);
    
    console.log(`📁 Temporary file created: ${tempPath}`);

    // ✅ VERIFICA CHE LA DIRECTORY REMOTA ESISTA
    try {
      await sftp.mkdir(remotePath, true); // true = ricorsivo
      console.log(`📂 Remote directory ensured: ${remotePath}`);
    } catch (mkdirError) {
      console.log('📂 Directory already exists or created');
    }

    // ✅ CARICA IL FILE SUL SERVER REMOTO
    const fullRemotePath = `${remotePath}/${uniqueFileName}`;
    await sftp.put(tempPath, fullRemotePath);
    
    console.log(`📤 File uploaded successfully: ${fullRemotePath}`);

    // ✅ VERIFICA CHE IL FILE SIA STATO CARICATO
    const fileExists = await sftp.exists(fullRemotePath);
    if (!fileExists) {
      throw new Error('File upload verification failed');
    }

    // ✅ OTTIENI INFORMAZIONI SUL FILE
    const fileStats = await sftp.stat(fullRemotePath);
    console.log(`✅ Upload verified - Size: ${fileStats.size} bytes`);

    return uniqueFileName;

  } catch (error) {
    console.error('❌ SFTP Upload Error:', error);
    throw new Error(`SFTP upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
  } finally {
    // ✅ PULIZIA
    if (tempPath) {
      try {
        await unlink(tempPath);
        console.log(`🗑️ Temporary file removed: ${tempPath}`);
      } catch (unlinkError) {
        console.error('⚠️ Failed to remove temporary file:', unlinkError);
      }
    }

    try {
      await sftp.end();
      console.log('🔐 SFTP connection closed');
    } catch (closeError) {
      console.error('⚠️ Error closing SFTP connection:', closeError);
    }
  }
}

// ✅ FUNZIONE SPECIFICA PER EVENTI - CORRETTA
export async function uploadEventCover(
  file: File,
  eventToken: string
): Promise<{ fileName: string; relativePath: string }> {
  
  // ✅ VALIDAZIONI
  if (!file || file.size === 0) {
    throw new Error('Invalid file: file is empty or null');
  }

  if (!eventToken || eventToken.length < 10) {
    throw new Error('Invalid event token: token must be at least 10 characters');
  }

  // ✅ PRENDI IL PATH DEL FILESYSTEM (NON URL!)
  const basePath = process.env.SFTP_UPLOAD_PATH;
  if (!basePath) {
    throw new Error('SFTP_UPLOAD_PATH environment variable is not set');
  }
  
  // ✅ ASSICURATI CHE NON SIA UN URL
  if (basePath.startsWith('http://') || basePath.startsWith('https://')) {
    throw new Error(`SFTP_UPLOAD_PATH must be a filesystem path, not a URL. Got: ${basePath}`);
  }
  
  // ✅ COSTRUISCI IL PATH DEL FILESYSTEM
  const eventPath = `${basePath}/images/events/${eventToken}`;

  // ✅ NOME FILE
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const fileName = `cover.${fileExtension}`;
  
  console.log('📋 SFTP Upload Configuration:', {
    sftp_host: process.env.SFTP_HOST,
    base_path: basePath,
    event_directory: eventPath,
    file_name: fileName,
    file_size: `${(file.size / 1024).toFixed(2)}KB`
  });
  
  try {
    // ✅ CARICA IL FILE
    const uploadedFileName = await uploadFileToSFTP(file, eventPath, fileName);
    
    // ✅ RITORNA NOME FILE E PATH RELATIVO (per database e URL)
    return {
      fileName: uploadedFileName,
      relativePath: `images/events/${eventToken}/${uploadedFileName}` // ✅ CORRETTO
    };
    
  } catch (error) {
    console.error('❌ Event cover upload failed:', error);
    throw error;
  }
}