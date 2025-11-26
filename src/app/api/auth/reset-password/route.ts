import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Forza la route ad essere dinamica
export const dynamic = 'force-dynamic';

// Configurazione runtime per Vercel
export const runtime = 'nodejs';

// Gestione preflight CORS
export async function OPTIONS(request: NextRequest) {
  console.log("📝 [Reset Password] OPTIONS request ricevuta");
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
  console.log("📝 [Reset Password] POST request ricevuta");
  console.log("📝 [Reset Password] URL:", request.url);
  console.log("📝 [Reset Password] Method:", request.method);
  
  try {
    console.log("📝 [Reset Password] Inizio richiesta");
    
    const body = await request.json();
    const { token, password } = body;

    console.log("📝 [Reset Password] Token ricevuto:", token ? "presente" : "mancante");
    console.log("📝 [Reset Password] Password ricevuta:", password ? "presente" : "mancante");

    if (!token || !password) {
      console.log("❌ [Reset Password] Token o password mancanti");
      return NextResponse.json(
        { error: "Token e password sono richiesti" },
        { status: 400 }
      );
    }

    // Valida la password
    if (password.length < 8) {
      console.log("❌ [Reset Password] Password troppo corta");
      return NextResponse.json(
        { error: "La password deve essere di almeno 8 caratteri" },
        { status: 400 }
      );
    }

    // Hash del token ricevuto
    console.log("🔐 [Reset Password] Hash del token...");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    
    console.log("🔍 [Reset Password] Hash calcolato:", resetTokenHash.substring(0, 10) + "...");

    // Cerca l'utente con questo token e verifica che non sia scaduto
    console.log("🔍 [Reset Password] Ricerca utente nel database...");
    const user = await db.users.findFirst({
      where: {
        reset_token: resetTokenHash,
        reset_token_expiry: {
          gte: new Date(), // Token non ancora scaduto
        },
      },
    });

    if (!user) {
      console.log("❌ [Reset Password] Utente non trovato o token scaduto");
      return NextResponse.json(
        { error: "Token non valido o scaduto. Richiedi un nuovo link di reset." },
        { status: 400 }
      );
    }

    console.log("✅ [Reset Password] Utente trovato:", user.email);
    console.log("🔐 [Reset Password] Hashing nuova password...");

    // Hash della nuova password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log("💾 [Reset Password] Aggiornamento database...");

    // Aggiorna la password e rimuovi il token di reset
    await db.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      },
    });

    console.log("✅ [Reset Password] Password reimpostata con successo per:", user.email);

    return NextResponse.json({
      message: "Password reimpostata con successo. Ora puoi effettuare il login.",
    });
  } catch (error) {
    console.error("❌ [Reset Password] ERRORE:", error);
    console.error("❌ [Reset Password] Stack:", error instanceof Error ? error.stack : "N/A");
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

// Handler per metodi non supportati
export async function GET(request: NextRequest) {
  console.log("⚠️ [Reset Password] GET request ricevuta (non supportato)");
  return NextResponse.json(
    { error: "Metodo non supportato. Usa POST." },
    { 
      status: 405,
      headers: {
        'Allow': 'POST, OPTIONS'
      }
    }
  );
}
