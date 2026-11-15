import type { SearchItem } from "@/youtube";

const AUDIO_CACHE = new Map<string, { url: string; mimeType: string; codec: string; bitrate: number }>();

export function cacheTrackStream(trackId: string, stream: { url: string; mimeType: string; codec: string; bitrate: number }): void {
  AUDIO_CACHE.set(trackId, stream);
}

export async function getStreamForTrack(
  trackId: string,
  title?: string,
  artist?: string,
  signal?: AbortSignal,
): Promise<{ url: string; mimeType: string; codec: string; bitrate: number } | null> {
  // 1. Direct memory cache hit
  if (AUDIO_CACHE.has(trackId)) {
    return AUDIO_CACHE.get(trackId)!;
  }

  // 2. iTunes track ID lookup
  if (trackId.startsWith("itunes:")) {
    const itunesId = trackId.slice(7);
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesId}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const previewUrl = data.results?.[0]?.previewUrl;
        if (previewUrl) {
          const stream = { url: previewUrl, mimeType: "audio/mp4", codec: "aac", bitrate: 128000 };
          AUDIO_CACHE.set(trackId, stream);
          return stream;
        }
      }
    } catch {}
  }

  // 3. Audius track ID lookup
  if (trackId.startsWith("audius:")) {
    const audiusId = trackId.slice(7);
    const stream = {
      url: `https://discoveryprovider.audius.co/v1/tracks/${audiusId}/stream?app_name=NuvoMobile`,
      mimeType: "audio/mpeg",
      codec: "mp3",
      bitrate: 192000,
    };
    AUDIO_CACHE.set(trackId, stream);
    return stream;
  }

  // 4. Audius search by title & artist (returns full-length unrestricted stream)
  if (title) {
    try {
      const q = `${title} ${artist ?? ""}`.trim();
      const audiusRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=NuvoMobile`, { signal });
      if (audiusRes.ok) {
        const data = await audiusRes.json();
        const first = data.data?.[0];
        if (first?.id) {
          const stream = {
            url: `https://discoveryprovider.audius.co/v1/tracks/${first.id}/stream?app_name=NuvoMobile`,
            mimeType: "audio/mpeg",
            codec: "mp3",
            bitrate: 192000,
          };
          AUDIO_CACHE.set(trackId, stream);
          return stream;
        }
      }
    } catch {}
  }

  // 5. Name-based match lookup on iTunes (for Russian and international songs)
  if (title) {
    try {
      const searchTerms = `${title} ${artist ?? ""}`.trim();
      const isCyrillic = /[\u0400-\u04FF]/.test(searchTerms);
      const countryParam = isCyrillic ? "&country=RU" : "";
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchTerms)}${countryParam}&entity=song&limit=3`, { signal });
      if (res.ok) {
        const data = await res.json();
        const hit = data.results?.[0];
        if (hit?.previewUrl) {
          const stream = { url: hit.previewUrl, mimeType: "audio/mp4", codec: "aac", bitrate: 128000 };
          AUDIO_CACHE.set(trackId, stream);
          AUDIO_CACHE.set(`itunes:${hit.trackId}`, stream);
          return stream;
        }
      }
    } catch {}
  }

  return null;
}

export const openSearchTracks = searchOnlineMusic;

export async function searchOnlineMusic(query: string, signal?: AbortSignal): Promise<SearchItem[]> {
  const q = query.trim();
  if (!q) return [];

  const items: SearchItem[] = [];
  const seenIds = new Set<string>();
  const isCyrillic = /[\u0400-\u04FF]/.test(q);

  // 1. Search iTunes Music API (supports Russian and worldwide songs with 600x600 artwork & direct audio stream)
  const itunesEndpoints = isCyrillic
    ? [
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=RU&entity=song&limit=25`,
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`,
      ]
    : [`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`];

  for (const url of itunesEndpoints) {
    try {
      const res = await fetch(url, { signal });
      if (res.ok) {
        const data = await res.json();
        for (const track of data.results || []) {
          const trackId = `itunes:${track.trackId}`;
          if (seenIds.has(trackId)) continue;
          seenIds.add(trackId);

          if (track.previewUrl) {
            AUDIO_CACHE.set(trackId, {
              url: track.previewUrl,
              mimeType: "audio/mp4",
              codec: "aac",
              bitrate: 128000,
            });
          }

          items.push({
            kind: "track",
            id: trackId,
            title: track.trackName,
            artists: [{ name: track.artistName, id: String(track.artistId || "") }],
            album: track.collectionName ? { name: track.collectionName, id: String(track.collectionId || "") } : undefined,
            durationMs: track.trackTimeMillis || 180000,
            cover: track.artworkUrl100
              ? {
                  url: track.artworkUrl100.replace("100x100bb", "600x600bb"),
                  width: 600,
                  height: 600,
                }
              : undefined,
            explicit: track.trackExplicitness === "explicit",
          });
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") throw err;
    }
    if (items.length >= 20) break;
  }

  // 2. Search Audius Music API (for full-length independent streaming tracks)
  try {
    const audiusRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=NuvoMobile`, { signal });
    if (audiusRes.ok) {
      const data = await audiusRes.json();
      for (const track of (data.data || []).slice(0, 10)) {
        const trackId = `audius:${track.id}`;
        if (seenIds.has(trackId)) continue;
        seenIds.add(trackId);

        const coverUrl = track.artwork?.["480x480"] || track.artwork?.["150x150"];
        AUDIO_CACHE.set(trackId, {
          url: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=NuvoMobile`,
          mimeType: "audio/mpeg",
          codec: "mp3",
          bitrate: 192000,
        });

        items.push({
          kind: "track",
          id: trackId,
          title: track.title,
          artists: [{ name: track.user?.name || "Audius Artist", id: track.user?.id || "" }],
          album: { name: "Audius Stream", id: "audius" },
          durationMs: (track.duration || 180) * 1000,
          cover: coverUrl ? { url: coverUrl, width: 480, height: 480 } : undefined,
          explicit: false,
        });
      }
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
  }

  return items;
}
