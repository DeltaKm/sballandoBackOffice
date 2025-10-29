import type { ConnectOptions } from 'ssh2-sftp-client';
const SftpClient = require('ssh2-sftp-client');

import type { 
  SFTPConnectionConfig, 
  SFTPUploadResult, 
  SFTPUploadOptions,
  SFTPDirectoryInfo,
  SFTPServiceStatus,
  EventCoverUpload
} from '~/types/sftp';

class SFTPService {
  private client: any = null;
  private config: SFTPConnectionConfig;
  private status: SFTPServiceStatus = 'disconnected';
  private lastError: Error | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor() {
    // Configurazione da variabili ambiente
    this.config = {
      host: process.env.SFTP_HOST || '',
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USERNAME || '',
      password: process.env.SFTP_PASSWORD || '',
      connectTimeout: 30000,
      retries: 3,
      retry_factor: 2,
      retry_minTimeout: 2000,
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    const required = ['host', 'username', 'password'];
    const missing = required.filter(key => !this.config[key as keyof SFTPConnectionConfig]);
    
    if (missing.length > 0) {
      throw new Error(`Missing SFTP configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Connette al server SFTP con retry automatico
   */
  private async connect(): Promise<void> {
    if (this.status === 'connected' && this.client) {
      return; // Già connesso
    }

    this.status = 'connecting';
    this.client = new SftpClient();

    try {
      console.log(`🔗 Connecting to SFTP server ${this.config.host}:${this.config.port}...`);
      
      await this.client.connect(this.config);
      
      this.status = 'connected';
      this.retryCount = 0;
      this.lastError = null;
      
      console.log('✅ SFTP connection established');
    } catch (error) {
      this.status = 'error';
      this.lastError = error as Error;
      
      console.error(`❌ SFTP connection failed (attempt ${this.retryCount + 1}):`, error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        
        console.log(`⏳ Retrying connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.connect(); // Retry ricorsivo
      }
      
      throw new Error(`SFTP connection failed after ${this.maxRetries} attempts: ${error}`);
    }
  }

  /**
   * Disconnette dal server SFTP
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
        console.log('🔌 SFTP connection closed');
      } catch (error) {
        console.warn('Warning during SFTP disconnect:', error);
      } finally {
        this.client = null;
        this.status = 'disconnected';
      }
    }
  }

  /**
   * Verifica e crea directory se necessario
   */
  private async ensureDirectory(remotePath: string): Promise<SFTPDirectoryInfo> {
    if (!this.client) {
      throw new Error('SFTP client not connected');
    }

    try {
      const exists = await this.client.exists(remotePath);
      
      if (exists === 'd') {
        return { path: remotePath, exists: true, created: false };
      }

      if (exists) {
        throw new Error(`Path ${remotePath} exists but is not a directory`);
      }

      // Crea directory ricorsivamente
      console.log(`📁 Creating directory: ${remotePath}`);
      await this.client.mkdir(remotePath, true);
      
      return { path: remotePath, exists: false, created: true };
    } catch (error) {
      throw new Error(`Failed to ensure directory ${remotePath}: ${error}`);
    }
  }

  /**
   * Genera nome file unico per evitare conflitti
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop() || 'jpg';
    const baseName = originalName.split('.').slice(0, -1).join('.');
    
    return `${baseName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Carica un file cover per un evento
   */
  public async uploadEventCover(file: File, eventToken: string): Promise<SFTPUploadResult> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      // Definisce il percorso remoto
      const baseUploadPath = process.env.SFTP_UPLOAD_PATH || '/var/www/html/webservice.sballando.it/storage/app/public';
      const eventDirectory = `${baseUploadPath}/images/events/${eventToken}`;
      
      // Assicura che la directory esista
      await this.ensureDirectory(eventDirectory);

      // Rinomina sempre il file come "cover" con l'estensione originale
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `cover.${fileExtension}`;
      const remotePath = `${eventDirectory}/${fileName}`;

      // Converte File a Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`📤 Uploading ${file.name} (${file.size} bytes) as ${fileName} to ${remotePath}`);

      // Upload del file (sovrascrive se esiste già)
      await this.client.put(buffer, remotePath);

      // Verifica upload
      const uploadedFile = await this.client.stat(remotePath);
      
      if (!uploadedFile) {
        throw new Error('File upload verification failed');
      }

      console.log(`✅ File uploaded successfully as: ${fileName}`);

      // Genera URL pubblico
      const baseUrl = process.env.UPLOADS_BASE_URL || 'https://webservice.sballando.it/storage';
      const publicUrl = `${baseUrl}/images/events/${eventToken}/${fileName}`;

      return {
        success: true,
        remotePath,
        fileName,
        fileSize: file.size,
        publicUrl,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('❌ SFTP upload failed:', error);
      throw error;
    } finally {
      // Mantieni la connessione aperta per riutilizzo
      // await this.disconnect();
    }
  }

  /**
   * Carica file generico con opzioni
   */
  public async uploadFile(
    file: File, 
    remotePath: string, 
    options: SFTPUploadOptions = {}
  ): Promise<SFTPUploadResult> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      // Crea directory se richiesto
      if (options.createDirectoryIfNotExists) {
        const directory = remotePath.substring(0, remotePath.lastIndexOf('/'));
        await this.ensureDirectory(directory);
      }

      // Converte File a Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload senza opzioni specifiche
      await this.client.put(buffer, remotePath);

      // Genera URL pubblico (assumendo struttura storage)
      const baseUrl = process.env.UPLOADS_BASE_URL || 'https://webservice.sballando.it/storage';
      const relativePath = remotePath.replace(process.env.SFTP_UPLOAD_PATH || '', '');
      const publicUrl = `${baseUrl}${relativePath}`;

      return {
        success: true,
        remotePath,
        fileName: file.name,
        fileSize: file.size,
        publicUrl,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('❌ SFTP upload failed:', error);
      throw error;
    }
  }

  /**
   * Lista file in una directory remota
   */
  public async listFiles(remotePath: string): Promise<any[]> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      return await this.client.list(remotePath);
    } catch (error) {
      console.error('❌ SFTP list failed:', error);
      throw error;
    }
  }

  /**
   * Elimina un file remoto
   */
  public async deleteFile(remotePath: string): Promise<boolean> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      await this.client.delete(remotePath);
      console.log(`🗑️ File deleted: ${remotePath}`);
      
      return true;
    } catch (error) {
      console.error('❌ SFTP delete failed:', error);
      throw error;
    }
  }

  /**
   * Carica un logo per una location
   */
  public async uploadLocationLogo(
    locationToken: string, // Cambiato da locationId a locationToken
    file: File,
    options: SFTPUploadOptions = {}
  ): Promise<SFTPUploadResult> {
    try {
      await this.connect();
      
      // Rinomina sempre il file come "logo" con l'estensione originale
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `logo.${fileExtension}`;
      
      // Directory per le location: images/locations/{locationToken}/
      const remoteDir = `/var/www/html/webservice.sballando.it/storage/app/public/images/locations/${locationToken}`;
      const remotePath = `${remoteDir}/${fileName}`;
      
      // Crea la directory se non esiste
      await this.ensureDirectory(remoteDir);
      
      // Upload del file (sovrascrive se esiste già)
      const buffer = Buffer.from(await file.arrayBuffer());
      await this.client.put(buffer, remotePath);
      
      // Verifica che il file sia stato caricato
      const exists = await this.client.exists(remotePath);
      if (!exists) {
        throw new Error('File upload verification failed');
      }
      
      // Percorso per l'URL pubblico
      const publicUrl = `https://webservice.sballando.it/storage/images/locations/${locationToken}/${fileName}`;
      
      console.log(`✅ Location logo uploaded successfully as:`, {
        locationToken,
        fileName,
        publicUrl,
        size: buffer.length
      });
      
      return {
        success: true,
        fileName,
        remotePath,
        fileSize: buffer.length,
        publicUrl,
        uploadedAt: new Date()
      };
      
    } catch (error: any) {
      console.error('❌ Failed to upload location logo:', error);
      this.lastError = error;
      
      return {
        success: false,
        fileName: '',
        remotePath: '',
        fileSize: 0,
        publicUrl: '',
        uploadedAt: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Elimina un logo di una location
   */
  public async deleteLocationLogo(locationToken: string, fileName: string): Promise<boolean> {
    try {
      await this.connect();
      
      const remotePath = `/var/www/html/webservice.sballando.it/storage/app/public/images/locations/${locationToken}/${fileName}`;
      
      const exists = await this.client.exists(remotePath);
      if (!exists) {
        console.log(`ℹ️ Location logo file doesn't exist, skipping deletion:`, remotePath);
        return true; // Non è un errore se il file non esiste
      }
      
      await this.client.delete(remotePath);
      
      console.log(`✅ Location logo deleted successfully:`, {
        locationToken,
        fileName,
        remotePath
      });
      
      return true;
      
    } catch (error: any) {
      console.error('❌ Failed to delete location logo:', error);
      this.lastError = error;
      return false;
    }
  }

  /**
   * Restituisce lo stato attuale della connessione
   */
  public getStatus(): { 
    status: SFTPServiceStatus; 
    lastError: string | null; 
    config: Partial<SFTPConnectionConfig> 
  } {
    return {
      status: this.status,
      lastError: this.lastError?.message || null,
      config: {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        // Non esporre la password
      }
    };
  }

  /**
   * Elimina una foto dalla galleria di un evento
   */
  public async deleteEventGalleryPhoto(eventToken: string, fileName: string): Promise<boolean> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      const remotePath = `/var/www/html/webservice.sballando.it/storage/app/public/images/events/${eventToken}/gallery/${fileName}`;
      
      await this.client.delete(remotePath);
      console.log(`🗑️ Event gallery photo deleted: ${fileName}`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to delete event gallery photo:', error);
      throw error;
    }
  }

  /**
   * Carica una foto nella galleria di un evento
   */
  public async uploadEventGalleryPhoto(file: File, eventToken: string): Promise<SFTPUploadResult> {
    try {
      await this.connect();

      if (!this.client) {
        throw new Error('SFTP client connection failed');
      }

      // Definisce il percorso remoto
      const baseUploadPath = process.env.SFTP_UPLOAD_PATH || '/var/www/html/webservice.sballando.it/storage/app/public';
      const galleryDirectory = `${baseUploadPath}/images/events/${eventToken}/gallery`;
      
      // Assicura che la directory gallery esista
      await this.ensureDirectory(galleryDirectory);

      // Genera un nome file univoco con timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `photo_${timestamp}.${fileExtension}`;
      const remotePath = `${galleryDirectory}/${fileName}`;

      // Converte File a Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      console.log(`📤 Uploading gallery photo ${file.name} (${file.size} bytes) as ${fileName}`);

      // Upload del file
      await this.client.put(buffer, remotePath);

      // Verifica upload
      const uploadedFile = await this.client.stat(remotePath);
      
      if (!uploadedFile) {
        throw new Error('File upload verification failed');
      }

      console.log(`✅ Gallery photo uploaded successfully: ${fileName}`);

      // Genera URL pubblico
      const baseUrl = process.env.UPLOADS_BASE_URL || 'https://webservice.sballando.it/storage';
      const publicUrl = `${baseUrl}/images/events/${eventToken}/gallery/${fileName}`;

      return {
        success: true,
        remotePath,
        fileName,
        fileSize: file.size,
        publicUrl,
        uploadedAt: new Date()
      };

    } catch (error) {
      console.error('❌ SFTP gallery photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup quando l'istanza viene distrutta
   */
  public async cleanup(): Promise<void> {
    await this.disconnect();
  }
}

// Singleton instance
let sftpServiceInstance: SFTPService | null = null;

/**
 * Factory function per ottenere l'istanza singleton del servizio SFTP
 */
export default function getSFTPService(): SFTPService {
  if (!sftpServiceInstance) {
    sftpServiceInstance = new SFTPService();
  }
  
  return sftpServiceInstance;
}

// Cleanup on process exit
process.on('beforeExit', async () => {
  if (sftpServiceInstance) {
    await sftpServiceInstance.cleanup();
  }
});

export { SFTPService };
