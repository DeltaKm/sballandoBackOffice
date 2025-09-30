// Type definitions for SFTP operations

export interface SFTPConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  connectTimeout?: number;
  retries?: number;
  retry_factor?: number;
  retry_minTimeout?: number;
}

export interface SFTPUploadResult {
  success: boolean;
  remotePath: string;
  fileName: string;
  fileSize: number;
  publicUrl: string;
  uploadedAt: Date;
}

export interface SFTPUploadOptions {
  createDirectoryIfNotExists?: boolean;
  overwrite?: boolean;
  mode?: string | number;
}

export interface SFTPDirectoryInfo {
  path: string;
  exists: boolean;
  created: boolean;
}

export interface SFTPError extends Error {
  code?: string;
  level?: string;
  description?: string;
}

export interface EventCoverUpload {
  eventToken: string;
  file: File;
  originalName: string;
  fileName: string;
}

export type SFTPServiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
