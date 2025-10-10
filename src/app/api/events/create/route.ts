import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { EventSchema } from "~/schemas/event";
import { parseISO } from 'date-fns';
import getSFTPService from "~/lib/sftpService.server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const coverFile = formData.get('cover') as File;

        // Parse music_genres from string to array
        const musicGenresString = formData.get('music_genres') as string;
        const musicGenres = JSON.parse(musicGenresString);

        // Prepara i dati per la validazione
        const dataToValidate = {
            title: formData.get('title') as string,
            subtitle: formData.get('subtitle') as string,
            description_extended: formData.get('description_extended') as string,
            datetime_start: formData.get('datetime_start') as string,
            datetime_end: formData.get('datetime_end') as string,
            is_public: formData.get('is_public') === 'true',
            music_genres: musicGenres,
            location_id: parseInt(formData.get('location_id') as string),
            state: formData.get('state') as 'draft' | 'published',
            user_id: parseInt(formData.get('user_id') as string),
            cover: coverFile || null,
        };

        // Validate using Zod
        const validationResult = EventSchema.safeParse(dataToValidate);

        if (!validationResult.success) {
            return NextResponse.json(
                { 
                    error: validationResult.error.errors?.[0]?.message ?? 'Validation error',
                    details: validationResult.error.errors 
                },
                { status: 400 }
            );
        }

        const validatedData = validationResult.data;

        // Generate timestamp and token
        const now = new Date();
        const token = crypto
            .createHash('md5')
            .update(Date.now().toString() + Math.random().toString())
            .digest('hex');

        // ✅ CARICA IL FILE USANDO IL SERVIZIO SFTP
        let coverData = null;
        if (coverFile && coverFile.size > 0) {
            try {
                console.log('📤 Uploading cover image...');
                console.log(`📂 Event token: ${token}`);
                
                const sftpService = getSFTPService();
                const uploadResult = await sftpService.uploadEventCover(coverFile, token);
                
                // Costruisci il percorso relativo per il database usando sempre "cover"
                const relativePath = `images/events/${token}/${uploadResult.fileName}`;
                
                coverData = {
                    fileName: uploadResult.fileName, // Ora sarà sempre "cover.{ext}"
                    relativePath: relativePath,
                    remotePath: uploadResult.remotePath,
                    publicUrl: uploadResult.publicUrl,
                    fileSize: uploadResult.fileSize
                };
                
                console.log(`✅ Cover uploaded as:`, { 
                    fileName: uploadResult.fileName,
                    publicUrl: uploadResult.publicUrl 
                });
            } catch (uploadError) {
                console.error('❌ Cover upload error:', uploadError);
                return NextResponse.json(
                    { 
                        error: 'Errore nel caricamento dell\'immagine',
                        details: uploadError instanceof Error ? uploadError.message : 'Upload failed'
                    },
                    { status: 500 }
                );
            }
        }

        // ✅ CONTINUA CON LA CREAZIONE DELL'EVENTO...
        const result = await prisma.$transaction(async (tx) => {
            const startDateTime = parseISO(validatedData.datetime_start);
            const endDateTime = parseISO(validatedData.datetime_end);

            const event = await tx.events.create({
                data: {
                    title: validatedData.title,
                    subtitle: validatedData.subtitle,
                    description_extended: validatedData.description_extended,
                    datetime_start: startDateTime,
                    datetime_end: endDateTime,
                    is_public: validatedData.is_public ? 1 : 0,
                    location_id: validatedData.location_id,
                    state: validatedData.state,
                    user_id: validatedData.user_id,
                    cover: coverData?.relativePath || null,
                    created_at: now,
                    updated_at: now,
                    token,
                },
            });

            // Create music genre relations
            for (const genreId of validatedData.music_genres) {
                await tx.event_music_genres.create({
                    data: {
                        event_id: event.id,
                        music_genre_id: genreId,
                        created_at: now,
                        updated_at: now,
                    },
                });
            }

            return { event };
        });

        return NextResponse.json({
            success: true,
            message: 'Evento creato con successo',
            event: result.event,
            upload_info: coverData
        });

    } catch (error) {
        console.error('❌ Event creation error:', error);

        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to create event',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}