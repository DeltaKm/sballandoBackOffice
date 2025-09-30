import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email mancante" }, { status: 400 });
    }

    const user = await prisma.users.findUnique({ 
      where: { email },
      // Remove select to return all fields
    });

    if (!user) {
      return NextResponse.json({ message: "Utente non trovato" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Errore server" }, { status: 500 });
  }
}