import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import crypto from "crypto";
import { sendEmail, generatePasswordResetEmail } from "~/lib/emailService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email è richiesta" },
        { status: 400 }
      );
    }

    // Cerca l'utente nel database
    const user = await db.users.findFirst({
      where: { email: email.toLowerCase() },
    });

    // Per sicurezza, rispondiamo sempre con successo anche se l'utente non esiste
    // per non rivelare quali email sono registrate
    if (!user) {
      return NextResponse.json({
        message: "Se l'email esiste nel sistema, riceverai un link per reimpostare la password",
      });
    }

    // Genera un token casuale sicuro
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Imposta la scadenza del token a 1 ora da ora
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ora

    // Salva il token nel database
    await db.users.update({
      where: { id: user.id },
      data: {
        reset_token: resetTokenHash,
        reset_token_expiry: resetTokenExpiry,
      },
    });

    // Genera il link di reset
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002";
    const resetLink = `${baseUrl}/reset-password/${resetToken}`;

    // Invia l'email
    const userName = user.name || user.email.split("@")[0] || "Utente";
    const emailHtml = generatePasswordResetEmail(resetLink, userName);

    try {
      await sendEmail({
        to: user.email,
        subject: "Reimpostazione Password - Sballando Backoffice",
        html: emailHtml,
      });

      return NextResponse.json({
        message: "Email di reimpostazione password inviata con successo",
      });
    } catch (emailError) {
      console.error("Errore nell'invio dell'email:", emailError);
      return NextResponse.json(
        { error: "Errore nell'invio dell'email. Riprova più tardi." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Errore in forgot-password:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
