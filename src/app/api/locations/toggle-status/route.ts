import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { location_id, enable, user_token } = body;

    // Validazione dei campi obbligatori
    if (!location_id || enable === undefined || !user_token) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti: location_id, enable, user_token" },
        { status: 400 }
      );
    }

    // Verifica che l'utente esista e sia super admin
    const user = await prisma.users.findUnique({
      where: { token: user_token },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token utente non valido" },
        { status: 401 }
      );
    }

    // Controllo se l'utente è super admin
    if (user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Accesso negato: solo i super admin possono modificare lo stato dei locali" },
        { status: 403 }
      );
    }

    // Verifica che il locale esista
    const location_ = await prisma.locations.findUnique({
      where: { id: location_id },
      select: { id: true, name: true, enable: true }
    });

    if (!location_) {
      return NextResponse.json(
        { error: "Locale non trovato" },
        { status: 404 }
      );
    }

    // Converte il valore enable in numero (0 o 1)
    const enableValue = enable ? 1 : 0;

    // Aggiorna lo stato del locale
    const updatedlocation = await prisma.locations.update({
      where: { id: location_id },
      data: { 
        enable: enable,
        updated_at: new Date()
      },
      select: {
        id: true,
        name: true,
        enable: true,
        updated_at: true
      }
    });

    // Log dell'operazione per tracciabilità
    console.log(`Super Admin ${user.id} ha ${enable ? 'attivato' : 'disattivato'} il locale ${location_id} (${location_.name})`);

    // Risposta di successo
    return NextResponse.json({
      success: true,
      message: `Locale ${enable ? 'attivato' : 'disattivato'} con successo`,
      location_: {
        id: updatedlocation.id,
        name: updatedlocation.name,
        enable: updatedlocation.enable,
        previous_status: location_.enable,
        updated_by: user.id,
        updated_at: updatedlocation.updated_at!.toISOString()
      }
    });

  } catch (error: undefined | any) {
    console.error("Errore nell'endpoint toggle-status:", error);
    
    return NextResponse.json(
      { 
        error: "Errore interno del server",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}