import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { ensureEventPlaylistId, SpotifyEventError, spotifyFetchForEvent } from "~/lib/spotifyEventAuth";

function extractTrackId(trackUri: string): string | null {
  if (!trackUri) return null;

  if (trackUri.startsWith("spotify:track:")) {
    return trackUri.replace("spotify:track:", "").trim() || null;
  }

  if (trackUri.includes("open.spotify.com/track/")) {
    const clean = trackUri.split("/track/")[1] ?? "";
    return clean.split("?")[0]?.trim() || null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      eventId?: number | string;
      user_token?: string;
      trackUri?: string;
      message?: string;
    };

    const eventId = Number(body.eventId);
    const userToken = body.user_token?.trim();
    const trackUri = body.trackUri?.trim();
    const dedication = body.message?.trim() ?? "";

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ status: false, error: "eventId non valido" }, { status: 400 });
    }

    if (!userToken) {
      return NextResponse.json({ status: false, error: "user_token mancante" }, { status: 400 });
    }

    if (!trackUri) {
      return NextResponse.json({ status: false, error: "trackUri mancante" }, { status: 400 });
    }

    const user = await db.users.findFirst({
      where: { token: userToken },
      select: {
        id: true,
        picture: true,
      },
    });

    if (!user) {
      return NextResponse.json({ status: false, error: "Utente non valido" }, { status: 401 });
    }

    const playlistId = await ensureEventPlaylistId(eventId);

    const addTrackResponse = await spotifyFetchForEvent(eventId, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [trackUri],
      }),
    });

    if (!addTrackResponse.ok) {
      const addTrackError = await addTrackResponse.text();
      return NextResponse.json(
        {
          status: false,
          error: "Impossibile aggiungere il brano alla playlist",
          details: addTrackError,
        },
        { status: 502 },
      );
    }

    const addTrackData = (await addTrackResponse.json()) as { snapshot_id?: string };

    let spotifyPlaylistLogId: number | null = null;

    try {
      const trackId = extractTrackId(trackUri);

      let title: string | null = null;
      let subtitle: string | null = null;
      let cover: string | null = null;

      if (trackId) {
        const trackResponse = await spotifyFetchForEvent(eventId, `/tracks/${trackId}`);
        if (trackResponse.ok) {
          const track = (await trackResponse.json()) as {
            name?: string;
            artists?: Array<{ name?: string }>;
            album?: { images?: Array<{ url?: string }> };
          };

          title = track.name?.trim() || null;
          subtitle = track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || null;
          cover = track.album?.images?.[0]?.url || null;
        }
      }

      const playlistLog = await db.spotify_playlist.create({
        data: {
          event_id: eventId,
          user_id: user.id,
          title: title,
          subtitle: subtitle,
          cover: cover,
          updated_at: new Date(),
        },
      });

      spotifyPlaylistLogId = playlistLog.id;

      await db.messages.create({
        data: {
          sender_id: user.id,
          receiver_id: null,
          event_id: eventId,
          message: dedication,
          picture: user.picture,
          spotify_playlist_id: playlistLog.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    } catch (logError) {
      console.error("Spotify add_track post-log error:", logError);
    }

    return NextResponse.json(
      {
        status: true,
        snapshot_id: addTrackData.snapshot_id ?? null,
        spotify_playlist_id: spotifyPlaylistLogId,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SpotifyEventError) {
      return NextResponse.json({ status: false, error: error.message }, { status: 400 });
    }

    console.error("Spotify add_track error:", error);
    return NextResponse.json({ status: false, error: "Errore interno durante add_track" }, { status: 500 });
  }
}
