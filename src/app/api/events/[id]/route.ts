import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params; // <- await qui
  try {
    const event = await prisma.events.findUnique({
      where: { id: Number(id) },
      include: {
        entry_types: true,
        event_music_genres: {
          include: {
            music_genre: true,
          },
        },
        collaborators: {
          include: {
            user: true, // include l'utente per ogni collaboratore
          },
        },
        products: true,
        location_: true,
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Evento non trovato" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Errore server" }, { status: 500 });
  }
}
