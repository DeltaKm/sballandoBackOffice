import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_token } = body;

    if (!user_token) {
      return NextResponse.json({ message: "token utente mancante" }, { status: 400 });
    }

    // Trova l'utente dal token
    const user = await prisma.users.findUnique({
      where: { token: user_token }
    });

    if (!user) {
      return NextResponse.json({ message: "utente non trovato" }, { status: 404 });
    }

    // Trova gli eventi in base al ruolo dell'utente
    let events;
    
    if (user.role === 'SUPERADMIN') {
      // Se è SUPERADMIN, prende tutti gli eventi
      events = await prisma.events.findMany();
    } else {
      // Altrimenti solo i suoi eventi
      events = await prisma.events.findMany({ 
        where: { user_id: user.id },
      });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ message: "eventi non trovati" }, { status: 404 });
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Errore server" }, { status: 500 });
  }
}