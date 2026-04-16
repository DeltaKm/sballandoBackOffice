import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { EventSchema } from "~/schemas/event";
import { adjustEventDates } from "~/lib/timezone";
import getSFTPService from "~/lib/sftpService.server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const coverFile = formData.get('cover') as File;

        if (!coverFile || coverFile.size === 0) {
            return NextResponse.json(
                {
                    error: "L'immagine di copertina è obbligatoria"
                },
                { status: 400 }
            );
        }

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
            // ✅ Usa la stessa utility dell'API di modifica
            const adjustedData = adjustEventDates(validatedData, 'toDatabase');
            
            console.log('🕐 Date adjustment in creation:', {
                original: { 
                    start: validatedData.datetime_start, 
                    end: validatedData.datetime_end 
                },
                adjusted: { 
                    start: adjustedData.datetime_start, 
                    end: adjustedData.datetime_end 
                }
            });

            const collaboratorsIdArray = [validatedData.user_id.toString()];
            const collaboratorsIdJson = JSON.stringify(collaboratorsIdArray);
            
            console.log('🎯 Creating event with user_id:', validatedData.user_id);
            console.log('🎯 Collaborators ID array:', collaboratorsIdArray);
            console.log('🎯 Collaborators ID JSON:', collaboratorsIdJson);

            const event = await tx.events.create({
                data: {
                    title: adjustedData.title,
                    subtitle: adjustedData.subtitle,
                    description_extended: adjustedData.description_extended,
                    datetime_start: adjustedData.datetime_start,
                    datetime_end: adjustedData.datetime_end,
                    is_public: validatedData.is_public ? 1 : 0,
                    location_id: validatedData.location_id,
                    state: validatedData.state,
                    user_id: validatedData.user_id,
                    cover: coverData?.relativePath || null,
                    dress_code: formData.get('dress_code') as string || null,
                    age_recommended: formData.get('age_recommended') as string || null,
                    collaborators_id: collaboratorsIdJson,
                    created_at: now,
                    updated_at: now,
                    token,
                },
            });

            console.log('✅ Event created with ID:', event.id);
            console.log('✅ collaborators_id saved:', event.collaborators_id);

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

            // Recupera i dettagli dei generi musicali per costruire il JSON
            const musicGenresData = await tx.music_genres.findMany({
                where: {
                    id: {
                        in: validatedData.music_genres
                    }
                },
                select: {
                    id: true,
                    label: true
                }
            });

            // Costruisci il JSON array dei generi
            const musicGenresJson = JSON.stringify(musicGenresData);

            // Aggiorna l'evento con il campo music_genres JSON
            await tx.events.update({
                where: { id: event.id },
                data: {
                    music_genres: musicGenresJson
                }
            });

            console.log(`🎵 Updated music_genres field with JSON:`, musicGenresJson);

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