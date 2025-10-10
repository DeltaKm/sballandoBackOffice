import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { EventSchema } from "~/schemas/event";
import { adjustEventDates } from "~/lib/timezone";
import getSFTPService from "~/lib/sftpService.server";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const formData = await req.formData();
    const coverFile = formData.get('cover') as File;

    // Parse music_genres from string to array
    const musicGenresString = formData.get('music_genres') as string;
    const musicGenres = JSON.parse(musicGenresString);

    // Prepare data for validation
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
    };

    // Validate using Zod
    const validationResult = EventSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
        return NextResponse.json(
            { 
                error: validationResult.error.errors?.[0]?.message,
                details: validationResult.error.errors 
            },
            { status: 400 }
        );
    }

    // Get validated data
    const validatedData = validationResult.data;

    // Get existing event to get the token
    const existingEvent = await prisma.events.findUnique({
        where: { id: parseInt(id) },
        select: { token: true }
    });

    if (!existingEvent) {
        return NextResponse.json(
            { error: "Evento non trovato" },
            { status: 404 }
        );
    }

    // Handle file upload if new cover is provided
    let coverData = null;
    if (coverFile && coverFile.size > 0) {
        try {
            console.log('📤 Uploading updated cover image...');
            console.log(`📂 Event token: ${existingEvent.token}`);
            
            const sftpService = getSFTPService();
            const uploadResult = await sftpService.uploadEventCover(coverFile, existingEvent.token || '');
            
            // Costruisci il percorso relativo per il database usando sempre "cover"
            const relativePath = `images/events/${existingEvent.token}/${uploadResult.fileName}`;
            
            coverData = {
                fileName: uploadResult.fileName, // Ora sarà sempre "cover.{ext}"
                relativePath: relativePath,
                remotePath: uploadResult.remotePath,
                publicUrl: uploadResult.publicUrl,
                fileSize: uploadResult.fileSize
            };
            
            console.log(`✅ Updated cover uploaded as:`, { 
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

    // Update event and music genre relations in a transaction
    const result = await prisma.$transaction(async (tx) => {
        // ✅ Usa la utility globale
        const adjustedData = adjustEventDates(validatedData, 'toDatabase');
        
        console.log('🕐 Date adjustment:', {
            original: { 
                start: validatedData.datetime_start, 
                end: validatedData.datetime_end 
            },
            adjusted: { 
                start: adjustedData.datetime_start, 
                end: adjustedData.datetime_end 
            }
        });

        // Update the event
        const event = await tx.events.update({
            where: { id: parseInt(id) },
            data: {
                title: adjustedData.title,
                subtitle: adjustedData.subtitle,
                description_extended: adjustedData.description_extended,
                datetime_start: adjustedData.datetime_start,
                datetime_end: adjustedData.datetime_end,
                is_public: adjustedData.is_public ? 1 : 0,
                location_id: adjustedData.location_id,
                state: adjustedData.state,
                ...(coverData && { cover: coverData.relativePath }),
                updated_at: new Date(),
            },
        });

        // Delete existing music genre relations
        await tx.event_music_genres.deleteMany({
            where: { event_id: event.id }
        });

        // Create new music genre relations
        for (const genreId of validatedData.music_genres) {
            await tx.event_music_genres.create({
                data: {
                    event_id: event.id,
                    music_genre_id: genreId,
                    created_at: new Date(),
                    updated_at: new Date(),
                }
            });
        }

        return { event };
    });

    return NextResponse.json({
        success: true,
        message: 'Evento aggiornato con successo',
        event: result.event,
        upload_info: coverData
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
        { error: 'Errore interno del server' },
        { status: 500 }
    );
  }
}