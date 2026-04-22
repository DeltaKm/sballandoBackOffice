import { NextRequest, NextResponse } from "next/server";
import { SpotifyEventError, spotifyFetchForEvent } from "~/lib/spotifyEventAuth";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const eventIdRaw = req.nextUrl.searchParams.get("eventId");
    const eventId = Number(eventIdRaw);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ status: false, error: "eventId non valido" }, { status: 400 });
    }

    if (query.length < 2) {
      return NextResponse.json(
        {
          status: true,
          data: {
            tracks: {
              items: [],
            },
          },
        },
        { status: 200 },
      );
    }

    let spotifyResponse = await spotifyFetchForEvent(
      eventId,
      `/search?type=track&limit=20&q=${encodeURIComponent(query)}`,
    );

    if (!spotifyResponse.ok && spotifyResponse.status === 400) {
      const firstErrorText = await spotifyResponse.text();

      if (firstErrorText.toLowerCase().includes("invalid limit")) {
        console.warn("Spotify search retry without limit", {
          eventId,
          query,
          spotifyStatus: spotifyResponse.status,
          spotifyError: firstErrorText,
        });

        spotifyResponse = await spotifyFetchForEvent(
          eventId,
          `/search?type=track&q=${encodeURIComponent(query)}`,
        );
      } else {
        return NextResponse.json(
          {
            status: false,
            error: "Ricerca Spotify fallita",
            spotify_status: 400,
            details: firstErrorText,
          },
          { status: 200 },
        );
      }
    }

    if (!spotifyResponse.ok) {
      const spotifyError = await spotifyResponse.text();
      console.error("Spotify search failed", {
        eventId,
        query,
        spotifyStatus: spotifyResponse.status,
        spotifyError,
      });

      return NextResponse.json(
        {
          status: false,
          error: "Ricerca Spotify fallita",
          spotify_status: spotifyResponse.status,
          details: spotifyError,
        },
        { status: 200 },
      );
    }

    const data = await spotifyResponse.json();

    return NextResponse.json(
      {
        status: true,
        data,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SpotifyEventError) {
      return NextResponse.json({ status: false, error: error.message }, { status: 400 });
    }

    console.error("Spotify search error:", error);
    return NextResponse.json({ status: false, error: "Errore interno durante la ricerca" }, { status: 500 });
  }
}
