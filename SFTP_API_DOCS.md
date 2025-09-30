# SFTP Upload API Documentation

## Overview

Sistema di upload file tramite SFTP per il caricamento di immagini cover degli eventi su server remoto.

## Configuration

### Environment Variables

```bash
SFTP_HOST=217.160.144.254
SFTP_PORT=22
SFTP_USERNAME=root
SFTP_PASSWORD=your_password
SFTP_UPLOAD_PATH=/var/www/html/webservice.sballando.it/storage/app/public
UPLOADS_BASE_URL=https://webservice.sballando.it/storage
```

## API Endpoints

### 1. Upload File - `/api/sftp/upload`

Upload file per eventi con token specifico.

#### POST Request

```typescript
const formData = new FormData();
formData.append('file', fileObject);
formData.append('eventToken', 'event_token_here');

const response = await fetch('/api/sftp/upload', {
  method: 'POST',
  body: formData,
});
```

#### Response Success

```json
{
  "success": true,
  "message": "File caricato con successo",
  "data": {
    "fileName": "cover_1234567890_abc123.jpg",
    "publicUrl": "https://webservice.sballando.it/storage/images/events/event_token/cover_1234567890_abc123.jpg",
    "fileSize": 1024000,
    "uploadedAt": "2025-09-30T10:30:00.000Z",
    "eventToken": "event_token_here"
  }
}
```

#### Response Error

```json
{
  "success": false,
  "error": "File troppo grande. Dimensione massima: 10MB",
  "code": "FILE_TOO_LARGE",
  "maxSize": 10485760,
  "actualSize": 15728640
}
```

### 2. Test Connection - `/api/sftp/test`

#### GET Request

```typescript
const response = await fetch('/api/sftp/test');
```

#### POST Request (Test Upload)

```typescript
const formData = new FormData();
formData.append('file', testFile);

const response = await fetch('/api/sftp/test', {
  method: 'POST',
  body: formData,
});
```

## Service Architecture

### SFTPService Class

Singleton service per gestire connessioni SFTP:

```typescript
import getSFTPService from '~/lib/sftpService.server';

const sftpService = getSFTPService();
const result = await sftpService.uploadEventCover(file, token);
```

### Key Features

- ✅ **Connection Management**: Auto-retry con exponential backoff
- ✅ **Directory Creation**: Creazione automatica directory per eventi
- ✅ **Unique Filenames**: Generazione nomi file unici per evitare conflitti
- ✅ **File Validation**: Controllo tipo e dimensione file
- ✅ **Error Handling**: Gestione completa errori con codici specifici
- ✅ **Public URLs**: Generazione automatica URL pubblici

### Directory Structure

```
/var/www/html/webservice.sballando.it/storage/app/public/
└── images/
    └── events/
        └── {event_token}/
            ├── cover_1234567890_abc123.jpg
            └── cover_1234567891_def456.png
```

### Public URLs

```
https://webservice.sballando.it/storage/images/events/{event_token}/{filename}
```

## Integration with Event Creation

L'API di creazione eventi (`/api/events/create/route.ts`) integra automaticamente l'upload SFTP:

```typescript
// Il file cover viene automaticamente caricato via SFTP
const formData = new FormData();
formData.append('cover', coverFile);
formData.append('title', 'Event Title');
// ... altri campi

const response = await fetch('/api/events/create', {
  method: 'POST',
  body: formData,
});
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_FILE` | File non fornito nella richiesta |
| `MISSING_EVENT_TOKEN` | Token evento mancante |
| `INVALID_FILE_TYPE` | Tipo file non supportato |
| `FILE_TOO_LARGE` | File supera dimensione massima |
| `CONNECTION_ERROR` | Errore connessione SFTP |
| `PERMISSION_ERROR` | Errori di permessi server |
| `DIRECTORY_ERROR` | Errore creazione directory |
| `UPLOAD_ERROR` | Errore generico upload |

## Testing

### Test Page

Visita `/sftp-test` per testare la funzionalità:

- Test connessione SFTP
- Upload file di prova
- Visualizzazione risultati e errori

### Manual Testing

```bash
# Test connection
curl http://localhost:3001/api/sftp/test

# Test upload
curl -X POST \
  -F "file=@test-image.jpg" \
  -F "eventToken=test_token" \
  http://localhost:3001/api/sftp/upload
```

## Security Considerations

- ✅ Validazione tipo file (solo immagini)
- ✅ Limite dimensione file (10MB)
- ✅ Generazione nomi file unici
- ✅ Validazione token evento
- ✅ Configurazione esterna credenziali SFTP
- ⚠️ TODO: Rate limiting per prevenire abuse
- ⚠️ TODO: Autenticazione utente per upload

## Performance

- **Connection Pooling**: Riutilizzo connessioni SFTP
- **Async Processing**: Upload non bloccanti
- **Error Recovery**: Retry automatico con backoff
- **Memory Efficient**: Streaming upload per file grandi
