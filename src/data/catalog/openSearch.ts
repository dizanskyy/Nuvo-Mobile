import type { SearchItem } from "@/youtube";

const AUDIO_CACHE = new Map<string, { url: string; mimeType: string; codec: string; bitrate: number }>();

export function cacheTrackStream(trackId: string, stream: { url: string; mimeType: string; codec: string; bitrate: number }): void {
  AUDIO_CACHE.set(trackId, stream);
}

const INVIDIOUS_INSTANCES = [
  "https://yt.chocolatemoo53.com",
  "https://invidious.nerdvpn.de",
  "https://inv.nadeko.net",
  "https://invidious.projectsegfau.lt",
  "https://iv.ggtyler.dev",
];

const SC_CLIENT_IDS = [
  "5lnU5PEpImc23JXFHBdq8E6QDd39I2uT",
  "a3e059563d7fd3372b49b37f00a00bcf",
  "iZIs9mchVcX5lhVRjh3ZGCluYq0akq0M",
  "2t9loNfh0ekOfkJmyJEE9wxYrKeUGdu8",
];

let activeScClientId = SC_CLIENT_IDS[0];

export async function getSoundCloudClientId(): Promise<string> {
  return activeScClientId;
}

/**
 * Resolves high quality audio stream for a YouTube video ID via fast public mirrors.
 */
export async function resolveYouTubeStream(
  videoId: string,
  signal?: AbortSignal,
): Promise<{ url: string; mimeType: string; codec: string; bitrate: number } | null> {
  const cleanId = videoId.replace(/^yt:/, "");
  if (!cleanId || cleanId.length < 5) return null;

  for (const inst of INVIDIOUS_INSTANCES) {
    if (signal?.aborted) break;
    try {
      const c = new AbortController();
      const onAbort = () => c.abort();
      signal?.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeout(() => c.abort(), 4000);

      const res = await fetch(`${inst}/api/v1/videos/${cleanId}?fields=adaptiveFormats,title,lengthSeconds`, {
        signal: c.signal,
      });
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);

      if (!res.ok) continue;
      const data = await res.json();
      const formats = data.adaptiveFormats as Array<{ type?: string; url?: string; container?: string; bitrate?: number }> | undefined;
      const audio = (formats || []).filter((f) => f.type && f.type.startsWith("audio/") && f.url);
      if (audio.length > 0) {
        const best = audio.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) {
          return {
            url: best.url,
            mimeType: best.type?.split(";")[0] || "audio/mp4",
            codec: best.container === "webm" ? "opus" : "aac",
            bitrate: best.bitrate || 160000,
          };
        }
      }
    } catch {
      // try next mirror
    }
  }
  return null;
}

/**
 * Resolves full-length stream for any song using SoundCloud's public catalog.
 */
export async function resolveSoundCloudStream(
  title: string,
  artist?: string,
  signal?: AbortSignal,
): Promise<{ url: string; mimeType: string; codec: string; bitrate: number } | null> {
  const query = `${title} ${artist ?? ""}`.trim();
  if (!query) return null;

  for (const clientId of SC_CLIENT_IDS) {
    if (signal?.aborted) break;
    try {
      const searchUrl = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=5`;
      const res = await fetch(searchUrl, { signal });
      if (!res.ok) continue;
      const data = await res.json();
      activeScClientId = clientId;

      for (const track of data.collection || []) {
        const trans = track.media?.transcodings as Array<{ format?: { protocol?: string; mime_type?: string }; url?: string }> | undefined;
        if (!trans || trans.length === 0) continue;

        // Prefer progressive MP3 or HLS AAC stream
        const candidate = trans.find((t) => t.format?.protocol === "progressive") || trans[0];
        if (!candidate?.url) continue;

        const streamRes = await fetch(`${candidate.url}?client_id=${clientId}`, { signal });
        if (!streamRes.ok) continue;
        const streamData = await streamRes.json();
        if (streamData?.url) {
          const isAac = candidate.format?.mime_type?.includes("mp4") || candidate.url.includes("aac");
          return {
            url: streamData.url,
            mimeType: isAac ? "audio/mp4" : "audio/mpeg",
            codec: isAac ? "aac" : "mp3",
            bitrate: 160000,
          };
        }
      }
    } catch {
      // try next client_id
    }
  }
  return null;
}

export async function getStreamForTrack(
  trackId: string,
  title?: string,
  artist?: string,
  signal?: AbortSignal,
): Promise<{ url: string; mimeType: string; codec: string; bitrate: number } | null> {
  // 1. Memory cache hit
  if (AUDIO_CACHE.has(trackId)) {
    return AUDIO_CACHE.get(trackId)!;
  }

  // 2. YouTube Video ID (e.g. yt:0PXs3dVmD0A or 11-char ID)
  const isYoutube = trackId.startsWith("yt:") || /^[A-Za-z0-9_-]{11}$/.test(trackId);
  if (isYoutube) {
    const ytVideoId = trackId.replace(/^yt:/, "");
    const ytStream = await resolveYouTubeStream(ytVideoId, signal);
    if (ytStream) {
      AUDIO_CACHE.set(trackId, ytStream);
      return ytStream;
    }
  }

  // 3. SoundCloud direct track ID
  if (trackId.startsWith("sc:")) {
    const scId = trackId.slice(3);
    for (const clientId of SC_CLIENT_IDS) {
      try {
        const res = await fetch(`https://api-v2.soundcloud.com/tracks/${scId}?client_id=${clientId}`, { signal });
        if (res.ok) {
          const trackData = await res.json();
          const trans = trackData.media?.transcodings || [];
          const candidate = trans.find((t: any) => t.format?.protocol === "progressive") || trans[0];
          if (candidate?.url) {
            const sRes = await fetch(`${candidate.url}?client_id=${clientId}`, { signal });
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData?.url) {
                const isAac = candidate.format?.mime_type?.includes("mp4") || candidate.url.includes("aac");
                const stream = {
                  url: sData.url,
                  mimeType: isAac ? "audio/mp4" : "audio/mpeg",
                  codec: isAac ? "aac" : "mp3",
                  bitrate: 160000,
                };
                AUDIO_CACHE.set(trackId, stream);
                return stream;
              }
            }
          }
        }
      } catch {}
    }
  }

  // 4. SoundCloud track search by song title & artist (returns full song)
  if (title) {
    const scStream = await resolveSoundCloudStream(title, artist, signal);
    if (scStream) {
      AUDIO_CACHE.set(trackId, scStream);
      return scStream;
    }
  }

  // 5. Audius track ID lookup
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

  // 6. Audius search by title & artist
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

  // 7. iTunes preview (last resort)
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

  // 1. Search SoundCloud tracks (full length tracks)
  for (const clientId of SC_CLIENT_IDS) {
    try {
      const scRes = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(q)}&client_id=${clientId}&limit=12`, { signal });
      if (scRes.ok) {
        const scData = await scRes.json();
        activeScClientId = clientId;
        for (const t of scData.collection || []) {
          const trackId = `sc:${t.id}`;
          if (seenIds.has(trackId)) continue;
          seenIds.add(trackId);

          const artwork = t.artwork_url || t.user?.avatar_url;
          items.push({
            kind: "track",
            id: trackId,
            title: t.title,
            artists: [{ name: t.user?.username || "SoundCloud Artist", id: String(t.user?.id || "") }],
            album: { name: "SoundCloud", id: "soundcloud" },
            durationMs: t.duration || 180000,
            cover: artwork
              ? {
                  url: artwork.replace("-large", "-t500x500"),
                  width: 500,
                  height: 500,
                }
              : undefined,
            explicit: false,
          });
        }
        if (items.length > 0) break;
      }
    } catch {}
  }

  // 2. Search iTunes Music API (supports Russian and worldwide songs with 600x600 artwork)
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
    if (items.length >= 25) break;
  }

  // 3. Search Audius Music API
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
