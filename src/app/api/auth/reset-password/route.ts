import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Forza la route ad essere dinamica
export const dynamic = 'force-dynamic';

// Gestione preflight CORS
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token e password sono richiesti" },
        { status: 400 }
      );
    }

    // Valida la password
    if (password.length < 8) {
      return NextResponse.json(
        { error: "La password deve essere di almeno 8 caratteri" },
        { status: 400 }
      );
    }

    // Hash del token ricevuto
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Cerca l'utente con questo token e verifica che non sia scaduto
    const user = await db.users.findFirst({
      where: {
        reset_token: resetTokenHash,
        reset_token_expiry: {
          gte: new Date(), // Token non ancora scaduto
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token non valido o scaduto. Richiedi un nuovo link di reset." },
        { status: 400 }
      );
    }

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Aggiorna la password e rimuovi il token di reset
    await db.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });

    return NextResponse.json({
      message: "Password reimpostata con successo. Ora puoi effettuare il login.",
    });
  } catch (error) {
    console.error("Errore in reset-password:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// Handler per metodi non supportati
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: "Metodo non supportato. Usa POST." },
    { status: 405 }
  );
}
