import type { ImportRow, Listing } from "./types";
import { ImportError } from "./types";
import { openSearchTracks } from "@/data/catalog/openSearch";

export interface SpotifyLinkInfo {
  kind: "track" | "playlist" | "album";
  id: string;
}

export function parseSpotifyLink(urlStr: string): SpotifyLinkInfo | null {
  try {
    const trimmed = urlStr.trim();
    if (trimmed.startsWith("spotify:")) {
      const parts = trimmed.split(":");
      if (parts.length >= 3) {
        const kind = parts[1];
        const id = parts[2].split("?")[0];
        if (kind === "track" || kind === "playlist" || kind === "album") {
          return { kind, id };
        }
      }
    }

    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0]?.startsWith("intl-")) segments.shift();

    if (segments.length >= 2) {
      const kind = segments[0];
      const id = segments[1].split("?")[0];
      if (kind === "track" || kind === "playlist" || kind === "album") {
        return { kind, id };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function listSpotify(urlStr: string, signal?: AbortSignal): Promise<Listing> {
  const parsed = parseSpotifyLink(urlStr);
  if (!parsed) {
    throw new ImportError("bad_link");
  }

  const { kind, id } = parsed;

  // Attempt 1: Fetch Spotify Embed page which contains complete __NEXT_DATA__
  try {
    const embedUrl = `https://open.spotify.com/embed/${kind}/${id}`;
    const res = await fetch(embedUrl, { signal });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
      if (match && match[1]) {
        const data = JSON.parse(match[1]);
        const entity = data?.props?.pageProps?.state?.data?.entity;
        if (entity) {
          if (kind === "track") {
            const title = entity.title || entity.name || "Трек из Spotify";
            const artists = (entity.artists || []).map((a: any) => a.name).filter(Boolean);
            const durationMs = entity.duration || 180000;
            return {
              source: "spotify",
              label: title,
              rows: [
                {
                  title,
                  artists: artists.length > 0 ? artists : ["Spotify Artist"],
                  durationMs,
                  album: entity.album?.name,
                },
              ],
            };
          } else {
            // playlist or album
            const label = entity.title || entity.name || "Spotify Playlist";
            const rawTracks = entity.trackList || [];
            const rows: ImportRow[] = rawTracks.map((t: any) => {
              const artists = t.subtitle
                ? t.subtitle.split(/,\s*|,\u00a0/).map((s: string) => s.trim()).filter(Boolean)
                : [];
              return {
                title: t.title || "Трек",
                artists: artists.length > 0 ? artists : ["Unknown"],
                durationMs: t.duration || 180000,
              };
            });

            if (rows.length > 0) {
              return {
                source: "spotify",
                label,
                rows,
              };
            }
          }
        }
      }
    }
  } catch {
    // Continue to fallback
  }

  // Attempt 2: Official CORS-enabled oEmbed API
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(urlStr)}`;
    const oembedRes = await fetch(oembedUrl, { signal });
    if (oembedRes.ok) {
      const json = await oembedRes.json();
      const rawTitle = (json.title || "").trim();
      let title = rawTitle || "Spotify Music";
      let artists = ["Spotify"];

      // Title often comes as "Song Title by Artist" or just "Song Title"
      if (rawTitle.includes(" by ")) {
        const parts = rawTitle.split(" by ");
        title = parts[0].trim();
        artists = [parts.slice(1).join(" by ").trim()];
      } else if (kind === "track") {
        try {
          const results = await openSearchTracks(title);
          if (results && results.length > 0) {
            artists = [results[0].artists];
            title = results[0].title;
          }
        } catch {
          // fallback
        }
      }

      return {
        source: "spotify",
        label: title,
        rows: [
          {
            title,
            artists,
            durationMs: 180000,
          },
        ],
      };
    }
  } catch {
    // Continue
  }

  throw new ImportError("network");
}
