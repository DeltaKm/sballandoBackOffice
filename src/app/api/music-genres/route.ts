import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export async function GET() {
  try {
    const genres = await prisma.music_genres.findMany({
      select: {
        id: true,
        label: true, // <- qui
      },
      orderBy: {
        label: "asc", // <- qui
      },
    });

    return new Response(JSON.stringify(genres), { status: 200 });
  } catch (error) {
    console.error("Error fetching music genres:", error);
    return new Response(
      JSON.stringify({ message: "Errore server" }),
      { status: 500 }
    );
  }
}
