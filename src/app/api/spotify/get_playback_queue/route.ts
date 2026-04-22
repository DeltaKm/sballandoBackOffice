import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { SpotifyEventError, spotifyFetchForEvent } from "~/lib/spotifyEventAuth";

type SpotifyTrack = {
  name?: string;
  artists?: Array<{ name?: string }>;
  album?: { images?: Array<{ url?: string }> };
  [key: string]: unknown;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildTrackKey(title: string, subtitle: string): string {
  return `${normalize(title)}__${normalize(subtitle)}`;
}

function getTrackSubtitle(track: SpotifyTrack): string {
  return (track.artists ?? []).map((artist) => artist?.name ?? "").filter(Boolean).join(", ");
}

async function getEventIdFromRequest(req: NextRequest): Promise<number> {
  const queryEventId = req.nextUrl.searchParams.get("eventId");
  if (queryEventId) {
    return Number(queryEventId);
  }

  if (req.method === "POST") {
    try {
      const body = (await req.json()) as { eventId?: number | string };
      return Number(body.eventId);
    } catch {
      return NaN;
    }
  }

  return NaN;
}

async function handleQueueRequest(req: NextRequest) {
  try {
    const eventId = await getEventIdFromRequest(req);

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ status: false, error: "eventId non valido" }, { status: 400 });
    }

    const queueResponse = await spotifyFetchForEvent(eventId, "/me/player/queue");

    if (queueResponse.status === 204) {
      return NextResponse.json({ status: true, current_track: null, queue: [] }, { status: 200 });
    }

    if (!queueResponse.ok) {
      const queueError = await queueResponse.text();
      return NextResponse.json(
        {
          status: false,
          error: "Impossibile recuperare la coda Spotify",
          details: queueError,
        },
        { status: 502 },
      );
    }

    const queueData = (await queueResponse.json()) as {
      currently_playing?: SpotifyTrack | null;
      queue?: SpotifyTrack[];
    };

    const playlistMessages = await db.messages.findMany({
      where: {
        event_id: eventId,
        receiver_id: null,
        spotify_playlist_id: { not: null },
      },
      select: {
        id: true,
        message: true,
        created_at: true,
        sender_id: true,
        spotify_playlist: {
          select: {
            title: true,
            subtitle: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 200,
    });

    const messageByTrackKey = new Map<
      string,
      {
        id: number;
        message: string | null;
        created_at: string | null;
        sender_id: number | null;
      }
    >();

    for (const msg of playlistMessages) {
      const title = msg.spotify_playlist?.title?.trim();
      const subtitle = msg.spotify_playlist?.subtitle?.trim();
      if (!title || !subtitle) continue;

      const key = buildTrackKey(title, subtitle);
      if (!messageByTrackKey.has(key)) {
        messageByTrackKey.set(key, {
          id: msg.id,
          message: msg.message,
          created_at: msg.created_at?.toISOString() ?? null,
          sender_id: msg.sender_id,
        });
      }
    }

    const withMessage = (track: SpotifyTrack | null | undefined) => {
      if (!track) return null;

      const title = track.name?.trim() ?? "";
      const subtitle = getTrackSubtitle(track).trim();

      const key = buildTrackKey(title, subtitle);
      const message = messageByTrackKey.get(key);

      if (!message) return track;
      return { ...track, message };
    };

    const currentTrack = withMessage(queueData.currently_playing);
    const queue = (queueData.queue ?? []).map((track) => withMessage(track));

    return NextResponse.json(
      {
        status: true,
        current_track: currentTrack,
        queue,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof SpotifyEventError) {
      return NextResponse.json({ status: false, error: error.message }, { status: 400 });
    }

    console.error("Spotify get_playback_queue error:", error);
    return NextResponse.json({ status: false, error: "Errore interno durante get_playback_queue" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleQueueRequest(req);
}

export async function POST(req: NextRequest) {
  return handleQueueRequest(req);
}
