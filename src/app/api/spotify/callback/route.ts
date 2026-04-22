import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

interface SpotifyMeResponse {
  id: string;
}

interface SpotifyPlaylistResponse {
  id: string;
}

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "33648381bd6843a6905927e9a5f1ebde";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || "https://sballando-back-office.vercel.app/api/spotify/callback";

function buildEventRedirect(req: NextRequest, eventId: number, errorMessage?: string) {
  const target = new URL(`/event/${eventId}`, req.nextUrl.origin);

  if (errorMessage) {
    target.searchParams.set("spotify_error", errorMessage);
  } else {
    target.searchParams.set("spotify_connected", "1");
  }

  return target;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const spotifyError = req.nextUrl.searchParams.get("error");

  const eventId = Number(state);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "State evento non valido" }, { status: 400 });
  }

  if (spotifyError) {
    return NextResponse.redirect(buildEventRedirect(req, eventId, spotifyError));
  }

  if (!code) {
    return NextResponse.redirect(buildEventRedirect(req, eventId, "authorization_code_missing"));
  }

  if (!SPOTIFY_CLIENT_SECRET) {
    return NextResponse.redirect(buildEventRedirect(req, eventId, "spotify_client_secret_missing"));
  }

  const event = await db.events.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      spotify_playlist_id: true,
      spotify_refresh_token: true,
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  }

  try {
    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    });

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("Spotify token exchange failed:", tokenError);
      return NextResponse.redirect(buildEventRedirect(req, eventId, "spotify_token_exchange_failed"));
    }

    const tokenData = (await tokenResponse.json()) as SpotifyTokenResponse;
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    let spotifyPlaylistId = event.spotify_playlist_id ?? null;

    if (!spotifyPlaylistId) {
      try {
        const meResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        if (meResponse.ok) {
          const spotifyMe = (await meResponse.json()) as SpotifyMeResponse;
          const playlistName = event.title?.trim()
            ? `Sballando - ${event.title.trim()}`
            : `Sballando Event #${event.id}`;

          const playlistResponse = await fetch(
            `https://api.spotify.com/v1/users/${spotifyMe.id}/playlists`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: playlistName,
                description: "Playlist jukebox creata da Sballando Back Office",
                public: false,
              }),
            },
          );

          if (playlistResponse.ok) {
            const playlistData = (await playlistResponse.json()) as SpotifyPlaylistResponse;
            spotifyPlaylistId = playlistData.id;
          }
        }
      } catch (playlistError) {
        console.error("Spotify playlist creation skipped:", playlistError);
      }
    }

    await db.events.update({
      where: { id: eventId },
      data: {
        spotify_access_token: tokenData.access_token,
        spotify_refresh_token: tokenData.refresh_token ?? event.spotify_refresh_token ?? null,
        spotify_token_expires_at: tokenExpiresAt,
        ...(spotifyPlaylistId ? { spotify_playlist_id: spotifyPlaylistId } : {}),
        updated_at: new Date(),
      },
    });

    return NextResponse.redirect(buildEventRedirect(req, eventId));
  } catch (error) {
    console.error("Spotify callback error:", error);
    return NextResponse.redirect(buildEventRedirect(req, eventId, "spotify_callback_failed"));
  }
}
