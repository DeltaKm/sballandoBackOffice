import { z } from "zod";

export const EventSchema = z.object({
    // Il titolo deve contenere almeno 3 caratteri
    title: z.string().min(3, "Il titolo deve avere almeno 3 caratteri"),

    // Il sottotitolo deve contenere almeno 3 caratteri
    subtitle: z.string().min(3, "Il sottotitolo deve avere almeno 3 caratteri"),

    // ID del locale, deve essere un numero intero positivo
    location_id: z.number().int().positive("location_ ID non valido"),

    // ID dell'utente che crea l'evento
    user_id: z.number().int().positive("User ID non valido"),

    // Stato dell'evento (pubblicato o bozza)
    state: z.enum(["draft", "published"], {
        errorMap: () => ({ message: "Lo stato deve essere 'draft' o 'published'" })
    }),

    // Flag per indicare se l'evento è pubblico
    is_public: z.boolean(),

    // File di copertina opzionale
    cover: z.instanceof(File).optional().nullable(),

    // Array opzionale di stringhe per i generi musicali
    music_genres: z.array(
        z.number().int().positive("ID genere musicale non valido")
    ).min(1, "Seleziona almeno un genere musicale"),

    // Campo opzionale per la descrizione estesa
    description_extended: z.string().optional(),

    // Data di inizio evento, deve essere una stringa di data valida
    datetime_start: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Data di inizio non valida",
    }),

    // Data di fine evento, deve essere una data valida
    datetime_end: z.string(),
}).refine((data) => {
    const endDate = new Date(data.datetime_end);
    const startDate = new Date(data.datetime_start);
    return endDate > startDate;
}, {
    message: "La data di fine deve essere successiva alla data di inizio",
    path: ["datetime_end"],
});

// Tipo TypeScript inferito dallo schema per l'utilizzo nel codice
export type EventInput = z.infer<typeof EventSchema>;
