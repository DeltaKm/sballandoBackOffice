import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';
import { EventSchema } from "~/schemas/event";
import { saveEventFile } from '~/lib/fileUpload';

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
            music_genres: musicGenres, // Now it's an array of numbers
            location_id: parseInt(formData.get('location_id') as string),
            state: formData.get('state') as 'draft' | 'published',
            user_id: parseInt(formData.get('user_id') as string),
            cover: formData.get('cover') as File || null,
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

        // Salva il file se presente
        let coverPath = null;
        if (coverFile) {
            try {
                coverPath = await saveEventFile(coverFile, token);
            } catch (err) {
                console.error('Errore nel salvataggio del file:', err);
                return NextResponse.json(
                    { error: 'Errore nel salvataggio del file' },
                    { status: 500 }
                );
            }
        }

        // Log dei dati prima della creazione
        console.log('Validated Data:', {
            ...validatedData,
            music_genres: JSON.stringify(validatedData.music_genres),
        });

        // Create event and music genre relations in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the event first
            const event = await tx.events.create({
                data: {
                    title: validatedData.title,
                    subtitle: validatedData.subtitle,
                    description_extended: validatedData.description_extended,
                    datetime_start: new Date(validatedData.datetime_start),
                    datetime_end: new Date(validatedData.datetime_end),
                    is_public: validatedData.is_public ? 1 : 0,
                    location_id: validatedData.location_id,
                    state: validatedData.state,
                    user_id: validatedData.user_id,
                    cover: coverPath, // Salva il percorso completo
                    created_at: now,
                    updated_at: now,
                    token,
                },
            });

            console.log('Evento creato:', event);

            // Create records in event_music_genres one by one
            for (const genreId of validatedData.music_genres) {
                console.log('Creazione relazione per il genere:', genreId);
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

        return NextResponse.json(result.event);

    } catch (error) {
        // Log dettagliato dell'errore
        if (typeof error === 'object' && error !== null) {
            console.error('Detailed error:', {
                name: (error as { name?: string }).name,
                message: (error as { message?: string }).message,
                stack: (error as { stack?: string }).stack,
                cause: (error as { cause?: unknown }).cause,
            });
        } else {
            console.error('Detailed error:', { error });
        }

        return NextResponse.json(
            { 
                error: 'Failed to create event',
                details: typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : String(error)
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}