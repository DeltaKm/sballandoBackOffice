import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function saveEventFile(file: File, token: string): Promise<string> {
    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crea il nome del file con uuid per evitare conflitti
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        
        // Crea il percorso della cartella dell'evento
        const eventFolder = path.join(process.cwd(), 'public', 'uploads', 'events', token);
        
        // Crea la cartella se non esiste
        await mkdir(eventFolder, { recursive: true });
        
        // Percorso completo del file
        const filePath = path.join(eventFolder, fileName);
        
        // Salva il file
        await writeFile(filePath, buffer);

        // Ritorna il percorso relativo per il database
        return `/uploads/events/${token}/${fileName}`;
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
}