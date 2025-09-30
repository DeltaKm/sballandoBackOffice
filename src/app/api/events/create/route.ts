import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { EventSchema } from "~/schemas/event";
import { uploadEventCover } from '~/lib/sftpUpload';
import { parseISO, format } from 'date-fns';

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

        // Get validated data
        const validatedData = validationResult.data;

        // Generate timestamp and token
        const now = new Date();
        const token = crypto
            .createHash('md5')
            .update(Date.now().toString() + Math.random().toString())
            .digest('hex');

        // ✅ CARICA IL FILE SU SFTP SE PRESENTE
        let coverData = null;
        if (coverFile && coverFile.size > 0) {
            try {
                console.log('📤 Uploading cover image to SFTP server...');
                console.log(`📂 Event token: ${token}`);
                
                const uploadResult = await uploadEventCover(coverFile, token);
                
                coverData = {
                    fileName: uploadResult.fileName,
                    relativePath: uploadResult.relativePath,
                    // ✅ CORREGGI IL FULL PATH
                    fullPath: `${process.env.SFTP_UPLOAD_PATH}/images/events/${token}/${uploadResult.fileName}`,
                    // ✅ AGGIUNGI L'URL PUBBLICO
                    publicUrl: `${process.env.UPLOADS_BASE_URL}/${uploadResult.relativePath}`
                };
                
                console.log(`✅ Cover image uploaded:`, coverData);
            } catch (uploadError) {
                console.error('❌ Error uploading cover image:', uploadError);
                return NextResponse.json(
                    { 
                        error: 'Errore nel caricamento dell\'immagine di copertina',
                        details: uploadError instanceof Error ? uploadError.message : 'Upload failed'
                    },
                    { status: 500 }
                );
            }
        }

        // Log dei dati prima della creazione
        console.log('Validated Data:', {
            ...validatedData,
            music_genres: JSON.stringify(validatedData.music_genres),
            cover_uploaded: !!coverData,
            cover_path: coverData?.relativePath
        });

        // Create event and music genre relations in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // ✅ Parsing semplice delle date
            const startDateTime = parseISO(validatedData.datetime_start);
            const endDateTime = parseISO(validatedData.datetime_end);
            
            console.log('🕐 Date parsing:', {
                start_input: validatedData.datetime_start,
                start_parsed: startDateTime.toISOString(),
                end_input: validatedData.datetime_end,
                end_parsed: endDateTime.toISOString()
            });

            // Create the event first
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
                    cover: coverData?.relativePath || null, // ✅ SALVA IL PATH RELATIVO
                    created_at: now,
                    updated_at: now,
                    token,
                },
            });

            console.log('✅ Event created:', {
                id: event.id,
                title: event.title,
                cover: event.cover,
                token: event.token
            });

            // Create records in event_music_genres one by one
            for (const genreId of validatedData.music_genres) {
                console.log('🎵 Creating genre relation:', genreId);
                await tx.event_music_genres.create({
                    data: {
                        event_id: event.id,
                        music_genre_id: genreId,
                        created_at: now,
                        updated_at: now,
                    },
                });
            }

            // ✅ RECUPERA L'EVENTO COMPLETO CON TUTTE LE RELAZIONI
            const completeEvent = await tx.events.findUnique({
                where: { id: event.id },
                include: {
                    entry_types: true,
                    event_music_genres: {
                        include: {
                            music_genre: true,
                        },
                    },
                    collaborators: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    surname: true,
                                    nickname: true,
                                    email: true,
                                }
                            },
                        },
                    },
                    products: true,
                    location_: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            cap: true,
                        }
                    },
                },
            });

            if (!completeEvent) {
                throw new Error('Errore nel recupero dell\'evento appena creato');
            }

            return { event: completeEvent };
        });

        // ✅ AGGIUNGI INFORMAZIONI AGGIUNTIVE ALL'EVENTO COMPLETO
        const enhancedEvent = {
            ...result.event,
            // ✅ URL COMPLETO DELLA COVER
            cover_url: coverData 
                ? `${process.env.UPLOADS_BASE_URL}/${coverData.relativePath}`
                : null,
            
            // ✅ INFORMAZIONI AGGIUNTIVE UTILI PER IL FRONTEND

            // ✅ INFORMAZIONI TEMPORALI FORMATTATE

            
            // ✅ INFORMAZIONI UPLOAD (se presente)
            upload_info: coverData ? {
                uploaded: true,
                file_name: coverData.fileName,
                relative_path: coverData.relativePath,
                full_server_path: coverData.fullPath,
                public_url: `${process.env.UPLOADS_BASE_URL}/${coverData.relativePath}`,
                server_directory: `${process.env.SFTP_UPLOAD_PATH}/events/${result.event.token}/`
            } : { 
                uploaded: false 
            }
        };

        // ✅ LOG DETTAGLIATO DEL RISULTATO
        console.log('🎉 Event creation completed:', {
            event_id: result.event.id,
            title: result.event.title,
            token: result.event.token,
            has_cover: !!coverData,
            state: result.event.state,
            is_public: !!result.event.is_public
        });

        return NextResponse.json({
            success: true,
            message: 'Evento creato con successo',
            event: enhancedEvent,
            // ✅ INFORMAZIONI AGGIUNTIVE PER DEBUG/FRONTEND
            creation_summary: {
                event_id: result.event.id,
                token: result.event.token,
                created_at: result.event.created_at.toISOString(),
                has_cover_image: !!coverData,
                music_genres_count: result.event.music_genres?.length,
                location_id: result.event.location_id,
                creator_id: result.event.user_id,
                state: result.event.state
            }
        });

    } catch (error) {
        // Log dettagliato dell'errore
        console.error('❌ Event creation error:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });

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