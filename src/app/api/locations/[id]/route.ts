import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { user_token } = body;
    const resolvedParams = await params;
    const locationId = parseInt(resolvedParams.id);

    if (!user_token || !locationId) {
      return NextResponse.json({ error: "Token utente o ID locale mancante" }, { status: 400 });
    }

    // Verifica utente
    const user = await prisma.users.findFirst({
      where: { token: user_token },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Utente non autorizzato" }, { status: 401 });
    }

    // Recupera locale con eventi
    const location = await prisma.locations.findUnique({
      where: { id: locationId },
      include: {
        events: {
          include: {
            entry_types: {
              orderBy: { created_at: "desc" }
            },
            products: {
              orderBy: { created_at: "desc" }
            },
            collaborators: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    surname: true,
                    email: true,
                    nickname: true,
                    picture: true,
                    role: true
                  }
                }
              }
            },
            event_music_genres: {
              include: {
                music_genre: {
                  select: { id: true, label: true }
                }
              }
            }
          }
        }
      }
    });

    if (!location) {
      return NextResponse.json({ error: "Locale non trovato" }, { status: 404 });
    }

    // Verifica proprietà (proprietario o superadmin)
    if (location.user_id !== user.id && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: "Non sei autorizzato a visualizzare questo locale" }, { status: 403 });
    }

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    console.error("Errore nel recupero locale:", error);
    return NextResponse.json({ error: "Errore nel recupero dati" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}