import { db } from "~/server/db";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "33648381bd6843a6905927e9a5f1ebde";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

type EventSpotifyFields = {
  id: number;
  title: string | null;
  spotify_access_token: string | null;
  spotify_refresh_token: string | null;
  spotify_token_expires_at: string | null;
  spotify_playlist_id: string | null;
};

export class SpotifyEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyEventError";
  }
}

function parseExpiryDate(expiresAt: string | null): Date | null {
  if (!expiresAt) return null;

  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function isTokenExpired(expiresAt: string | null): boolean {
  const parsedDate = parseExpiryDate(expiresAt);
  if (!parsedDate) return true;

  const nowWithBuffer = Date.now() + 30 * 1000;
  return parsedDate.getTime() <= nowWithBuffer;
}

async function getEventSpotifyData(eventId: number): Promise<EventSpotifyFields> {
  const event = await db.events.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      spotify_access_token: true,
      spotify_refresh_token: true,
      spotify_token_expires_at: true,
      spotify_playlist_id: true,
    },
  });

  if (!event) {
    throw new SpotifyEventError("Evento non trovato");
  }

  return event;
}

async function refreshEventAccessToken(event: EventSpotifyFields): Promise<string> {
  if (!event.spotify_refresh_token) {
    throw new SpotifyEventError("Spotify refresh token mancante per questo evento");
  }

  if (!SPOTIFY_CLIENT_SECRET) {
    throw new SpotifyEventError("Spotify client secret non configurato");
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: event.spotify_refresh_token,
  });

  const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  });

  if (!refreshResponse.ok) {
    const refreshError = await refreshResponse.text();
    throw new SpotifyEventError(`Refresh token Spotify fallito: ${refreshError}`);
  }

  const refreshData = (await refreshResponse.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  if (!refreshData.access_token) {
    throw new SpotifyEventError("Spotify non ha restituito un access token valido");
  }

  const nextExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

  await db.events.update({
    where: { id: event.id },
    data: {
      spotify_access_token: refreshData.access_token,
      spotify_refresh_token: refreshData.refresh_token ?? event.spotify_refresh_token,
      spotify_token_expires_at: nextExpiry,
      updated_at: new Date(),
    },
  });

  return refreshData.access_token;
}

export async function getValidEventAccessToken(eventId: number, forceRefresh = false): Promise<string> {
  const event = await getEventSpotifyData(eventId);

  if (!event.spotify_access_token) {
    throw new SpotifyEventError("Spotify non è collegato a questo evento");
  }

  if (forceRefresh || isTokenExpired(event.spotify_token_expires_at)) {
    return refreshEventAccessToken(event);
  }

  return event.spotify_access_token;
}

export async function spotifyFetchForEvent(
  eventId: number,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const requestPath = path.startsWith("http") ? path : `${SPOTIFY_API_BASE}${path}`;

  const firstToken = await getValidEventAccessToken(eventId);
  let response = await fetch(requestPath, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${firstToken}`,
    },
  });

  if (response.status === 401) {
    const refreshedToken = await getValidEventAccessToken(eventId, true);
    response = await fetch(requestPath, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${refreshedToken}`,
      },
    });
  }

  return response;
}

export async function ensureEventPlaylistId(eventId: number): Promise<string> {
  const event = await getEventSpotifyData(eventId);

  if (event.spotify_playlist_id) {
    return event.spotify_playlist_id;
  }

  const meResponse = await spotifyFetchForEvent(eventId, "/me");
  if (!meResponse.ok) {
    const meError = await meResponse.text();

    if (meResponse.status === 403 && meError.toLowerCase().includes("insufficient")) {
      throw new SpotifyEventError(
        "Scope Spotify insufficiente per creare la playlist. Ricollega Spotify all'evento.",
      );
    }

    throw new SpotifyEventError(`Recupero utente Spotify fallito: ${meError}`);
  }

  const meData = (await meResponse.json()) as { id?: string };
  if (!meData.id) {
    throw new SpotifyEventError("Utente Spotify non valido");
  }

  const playlistName = event.title?.trim()
    ? `Sballando - ${event.title.trim()}`
    : `Sballando Event #${event.id}`;

  const playlistResponse = await spotifyFetchForEvent(eventId, `/users/${meData.id}/playlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: playlistName,
      description: "Playlist jukebox creata da Sballando",
      public: false,
    }),
  });

  if (!playlistResponse.ok) {
    const playlistError = await playlistResponse.text();
    throw new SpotifyEventError(`Creazione playlist Spotify fallita: ${playlistError}`);
  }

  const playlistData = (await playlistResponse.json()) as { id?: string };
  if (!playlistData.id) {
    throw new SpotifyEventError("Spotify non ha restituito l'ID playlist");
  }

  await db.events.update({
    where: { id: event.id },
    data: {
      spotify_playlist_id: playlistData.id,
      updated_at: new Date(),
    },
  });

  return playlistData.id;
}
