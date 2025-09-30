import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// Tipi per la validazione
interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Funzioni di validazione
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  // Rimuovi spazi, trattini e parentesi
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  // Controlla se è un numero italiano valido (10-13 cifre)
  const phoneRegex = /^(\+39)?[0-9]{8,12}$/;
  return phoneRegex.test(cleanPhone);
};

const validateImageFile = (file: File): ValidationResult => {
  const errors: ValidationError[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    errors.push({
      field: 'logo', // Cambia da 'logo' a 'logo'
      message: 'L\'immagine non può superare i 5MB'
    });
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push({
      field: 'logo', // Cambia da 'logo' a 'logo'
      message: 'Il formato dell\'immagine deve essere JPG, PNG o WebP'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validatelocationData = (data: {
  name: string;
  description: string;
  address: string;
  comune: string;
  provincia: string;
  regione: string;
  cap: string;
  phone: string;
  email: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validazione nome
  if (!data.name || data.name.trim().length < 2) {
    errors.push({
      field: 'name',
      message: 'Il nome del locale deve contenere almeno 2 caratteri'
    });
  } else if (data.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Il nome del locale non può superare i 100 caratteri'
    });
  }

  // Validazione descrizione
  if (!data.description || data.description.trim().length < 10) {
    errors.push({
      field: 'description',
      message: 'La descrizione deve contenere almeno 10 caratteri'
    });
  } else if (data.description.length > 1000) {
    errors.push({
      field: 'description',
      message: 'La descrizione non può superare i 1000 caratteri'
    });
  }

  // Validazione indirizzo
  if (!data.address || data.address.trim().length < 5) {
    errors.push({
      field: 'address',
      message: 'L\'indirizzo deve contenere almeno 5 caratteri'
    });
  } else if (data.address.length > 200) {
    errors.push({
      field: 'address',
      message: 'L\'indirizzo non può superare i 200 caratteri'
    });
  }

  // Validazione comune
  if (!data.comune || data.comune.trim().length < 2) {
    errors.push({
      field: 'comune',
      message: 'Il comune deve contenere almeno 2 caratteri'
    });
  } else if (data.comune.length > 100) {
    errors.push({
      field: 'comune',
      message: 'Il comune non può superare i 100 caratteri'
    });
  }

  // Validazione provincia
  if (!data.provincia || data.provincia.trim().length < 2) {
    errors.push({
      field: 'provincia',
      message: 'La provincia deve contenere almeno 2 caratteri'
    });
  }

  // Validazione regione
  if (!data.regione || data.regione.trim().length < 2) {
    errors.push({
      field: 'regione',
      message: 'La regione deve contenere almeno 2 caratteri'
    });
  }

  // Validazione CAP
  if (!data.cap || !/^\d{5}$/.test(data.cap)) {
    errors.push({
      field: 'cap',
      message: 'Il CAP deve essere composto da 5 cifre'
    });
  }

  // Validazione telefono
  if (!data.phone) {
    errors.push({
      field: 'phone',
      message: 'Il numero di telefono è obbligatorio'
    });
  } else if (!validatePhone(data.phone)) {
    errors.push({
      field: 'phone',
      message: 'Inserisci un numero di telefono valido (es. +39 123 456 7890)'
    });
  }

  // Validazione email
  if (!data.email) {
    errors.push({
      field: 'email',
      message: 'L\'email è obbligatoria'
    });
  } else if (!validateEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Inserisci un indirizzo email valido'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export async function POST(request: NextRequest) {
  let uploadedFilePath: string | null = null;

  try {
    const formData = await request.formData();
    
    // Estrai i dati dal form
    const name = (formData.get('name') as string)?.trim();
    const description = (formData.get('description') as string)?.trim();
    const address = (formData.get('address') as string)?.trim();
    const comune = (formData.get('comune') as string)?.trim(); // Mappa city -> comune
    const provincia = (formData.get('provincia') as string)?.trim();
    const regione = (formData.get('regione') as string)?.trim(); // Mappa region -> regione
    const cap = (formData.get('cap') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const email = (formData.get('email') as string)?.trim();
    const user_token = (formData.get('user_token') as string)?.trim();
    const coordinates = (formData.get('coordinates') as string)?.trim(); // Campo coordinate
    const logo = formData.get('logo') as File; // Logo è l'unica immagine

    // Validazione campi obbligatori base
    const requiredFields = { 
      name: "Nome del locale", 
      description: "Descrizione", 
      address: "Indirizzo", 
      comune: "Comune", 
      provincia: "Provincia", 
      regione: "Regione", 
      cap: "CAP", 
      phone: "Telefono", 
      email: "Email", 
      user_token: "Token utente" 
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !formData.get(key))
      .map(([key, label]) => ({ field: key, label }));

    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: "Campi obbligatori mancanti",
        details: `I seguenti campi sono obbligatori: ${missingFields.map(f => f.label).join(', ')}`,
        missingFields: missingFields.map(f => f.field),
        validationErrors: missingFields.map(f => ({
          field: f.field,
          message: `Il campo "${f.label}" è obbligatorio`
        }))
      }, { status: 400 });
    }

    // Validazione immagine
    if (!logo) {
      return NextResponse.json({ 
        error: "Logo mancante",
        details: "Il logo del locale è obbligatorio"
      }, { status: 400 });
    }

    const imageValidation = validateImageFile(logo);
    if (!imageValidation.isValid) {
      return NextResponse.json({ 
        error: "Logo non valido",
        details: imageValidation.errors[0]?.message || "Errore di validazione dell'immagine"
      }, { status: 400 });
    }

    // Validazione dettagliata dei dati
    const dataValidation = validatelocationData({
      name, description, address, comune, provincia, regione, cap, phone, email
    });

    if (!dataValidation.isValid) {
      return NextResponse.json({ 
        error: "Dati non validi",
        details: "Alcuni campi contengono errori",
        validationErrors: dataValidation.errors
      }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Utente non autorizzato",
        details: "Token di autenticazione non valido"
      }, { status: 401 });
    }

    // Verifica se esiste già un locale con lo stesso nome per questo utente
    const existinglocation = await prisma.locations.findFirst({
      where: {
        name: name,
        user_id: user.id
      }
    });

    if (existinglocation) {
      return NextResponse.json({ 
        error: "Locale già esistente",
        details: "Hai già creato un locale con questo nome"
      }, { status: 409 });
    }

    // Upload immagine
    let logoFileName = "";
    if (logo && logo.size > 0) {
      const bytes = await logo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Genera nome file unico
      const fileExtension = logo.name.split('.').pop()?.toLowerCase() || 'jpg';
      logoFileName = `location_logo_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
      
      // Crea directory se non esiste
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'locations');
      await mkdir(uploadDir, { recursive: true });
      
      // Salva file
      const filePath = path.join(uploadDir, logoFileName);
      await writeFile(filePath, buffer);
      uploadedFilePath = filePath; // Salva il path per eventuale cleanup
    }

    // Crea locale nel database usando una transazione
    const result = await prisma.$transaction(async (tx) => {
      const location_ = await tx.locations.create({
        data: {
          name,
          description,
          address,
          comune, // Usa comune invece di city
          provincia, // Campo provincia
          regione, // Usa regione invece di region
          cap, // Campo CAP
          phone,
          email,
          coordinates: coordinates || null, // Campo coordinate
          logo: logoFileName ? `/uploads/locations/${logoFileName}` : null, // Logo è l'unica immagine
          user_id: user.id,
        }
      });

      return location_;
    });

    return NextResponse.json({
      success: true,
      message: "Locale creato con successo",
      location_: {
        id: result.id,
        name: result.name,
        description: result.description,
        address: result.address,
        comune: result.comune, // Restituisci comune
        provincia: result.provincia, // Restituisci provincia
        regione: result.regione, // Restituisci regione
        cap: result.cap, // Restituisci CAP
        phone: result.phone,
        email: result.email,
        coordinates: result.coordinates, // Restituisci coordinate
        logo: result.logo, // Logo è l'unica immagine
        created_at: result.created_at
      }
    }, { status: 201 });

  } catch (error) {
    // Se c'è stato un errore e abbiamo caricato un file, rimuovilo
    if (uploadedFilePath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(uploadedFilePath);
      } catch (cleanupError) {
        console.error("Errore durante la pulizia del file:", cleanupError);
      }
    }

    console.error("Errore nella creazione del locale:", error);
    
    // Gestione errori specifici del database
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ 
          error: "Dato duplicato",
          details: "Esiste già un locale con questi dati"
        }, { status: 409 });
      }
      
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({ 
          error: "Errore di integrità referenziale",
          details: "Riferimento a dati non esistenti"
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      error: "Errore interno del server",
      details: "Si è verificato un errore imprevisto. Riprova più tardi."
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}