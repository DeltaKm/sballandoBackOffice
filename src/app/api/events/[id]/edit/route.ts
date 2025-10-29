import { NextResponse } from "next/server";
import { EventSchema } from "~/schemas/event";
import { adjustEventDates } from "~/lib/timezone";
import getSFTPService from "~/lib/sftpService.server";
import { db } from "~/server/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log('🔄 Edit event API called for ID:', id);

  try {
    const formData = await req.formData();
    
    console.log('📦 FormData received, keys:', Array.from(formData.keys()));
    
    const coverFile = formData.get('cover') as File;

    // Parse music_genres from string to array
    const musicGenresString = formData.get('music_genres') as string;
    const musicGenres = JSON.parse(musicGenresString);

    console.log('🎵 Music genres parsed:', musicGenres);

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

    console.log('✅ Data prepared for validation:', {
        title: dataToValidate.title,
        location_id: dataToValidate.location_id,
        state: dataToValidate.state,
    });

    // Campi opzionali
    const dress_code_raw = formData.get('dress_code') as string | null;
    const age_recommended_raw = formData.get('age_recommended') as string | null;
    
    // Converti stringhe vuote in null
    const dress_code = dress_code_raw && dress_code_raw.trim() !== '' ? dress_code_raw.trim() : null;
    const age_recommended = age_recommended_raw && age_recommended_raw.trim() !== '' ? age_recommended_raw.trim() : null;

    console.log('📝 Optional fields received:', {
        dress_code,
        age_recommended,
        dress_code_length: dress_code?.length,
        age_recommended_length: age_recommended?.length
    });

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
    const existingEvent = await db.events.findUnique({
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
    const result = await db.$transaction(async (tx) => {
        console.log('🕐 Date values received:', {
            datetime_start: validatedData.datetime_start, 
            datetime_end: validatedData.datetime_end
        });

        // Converte le stringhe datetime-local in Date objects
        // Le stringhe datetime-local sono nel formato: "2024-10-24T20:00"
        // Dobbiamo interpretarle come ora locale italiana e salvarle nel DB
        const startDate = new Date(validatedData.datetime_start);
        const endDate = new Date(validatedData.datetime_end);

        console.log('🕐 Date objects created:', {
            datetime_start: startDate.toISOString(), 
            datetime_end: endDate.toISOString()
        });

        // Update the event
        const event = await tx.events.update({
            where: { id: parseInt(id) },
            data: {
                title: validatedData.title,
                subtitle: validatedData.subtitle,
                description_extended: validatedData.description_extended,
                datetime_start: startDate,
                datetime_end: endDate,
                is_public: validatedData.is_public ? 1 : 0,
                state: validatedData.state,
                ...(dress_code !== null && { dress_code }),
                ...(age_recommended !== null && { age_recommended }),
                ...(coverData && { cover: coverData.relativePath }),
                updated_at: new Date(),
            },
        });

        console.log('✅ Event updated with:', {
            id: event.id,
            dress_code: event.dress_code,
            age_recommended: event.age_recommended
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

        // Aggiorna il campo music_genres JSON nell'evento
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
        message: 'Evento aggiornato con successo',
        event: result.event,
        upload_info: coverData
    });

  } catch (error) {
    console.error('❌ Error updating event:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
        { 
          error: 'Errore interno del server',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
    );
  }
}