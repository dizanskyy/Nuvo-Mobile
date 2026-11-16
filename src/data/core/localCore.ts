/**
 * In-browser and mobile local emulation for nuvo-core daemon.
 * Persists playlists, liked tracks, pins, and listening statistics to localStorage
 * so the application works 100% offline and standalone without requiring a desktop Rust daemon.
 */

import type { StatsOverview, StatsDetail, StatsRow } from "@/ui/ports/stats";
import { SAMPLE_MIXES } from "../demo/mixes";

export interface StoredPlaylist {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  coverUrl: string | null;
  trackCount: number;
  covers: string[];
  sortMode: string;
  pinnedOffline: boolean;
  items: Array<{
    id: string;
    track: any;
    position: number;
    addedAt: string;
  }>;
}

const STORAGE_PLAYLISTS = "nuvo_playlists_v1";
const STORAGE_LIKED = "nuvo_liked_tracks_v1";
const STORAGE_STATS = "nuvo_stats_v1";
const STORAGE_PINS = "nuvo_pins_v1";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Local storage write error:", e);
  }
}

// Starter demo stats if user hasn't played many songs yet
function getStarterStats(): any {
  return {
    plays: 18,
    listenedMs: 4200000,
    tracks: [
      { id: "sp_1", title: "Midnight City", subtitle: "M83", plays: 6, listenedMs: 1440000, rank: 1, rankDelta: null, isNew: false, coverUrl: "https://i.scdn.co/image/ab67616d0000b273b02cf440d6c9ffb8924b228b" },
      { id: "sp_2", title: "Starboy", subtitle: "The Weeknd", plays: 5, listenedMs: 1050000, rank: 2, rankDelta: null, isNew: false, coverUrl: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452" },
      { id: "sp_3", title: "Get Lucky", subtitle: "Daft Punk", plays: 4, listenedMs: 960000, rank: 3, rankDelta: null, isNew: false, coverUrl: "https://i.scdn.co/image/ab67616d0000b2739b82813589c1ed65f376483d" },
      { id: "sp_4", title: "Blinding Lights", subtitle: "The Weeknd", plays: 3, listenedMs: 600000, rank: 4, rankDelta: null, isNew: true, coverUrl: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36" },
    ],
    artists: [
      { id: "art_1", title: "The Weeknd", plays: 8, listenedMs: 1650000, rank: 1, rankDelta: null, isNew: false },
      { id: "art_2", title: "M83", plays: 6, listenedMs: 1440000, rank: 2, rankDelta: null, isNew: false },
      { id: "art_3", title: "Daft Punk", plays: 4, listenedMs: 960000, rank: 3, rankDelta: null, isNew: false },
    ],
    history: [] as Array<{ date: string; listenedMs: number; trackId: string }>,
  };
}

export function recordTrackPlay(track: any): void {
  if (!track || !track.id) return;
  const stats = loadJson(STORAGE_STATS, getStarterStats());
  stats.plays = (stats.plays || 0) + 1;
  const duration = track.durationMs || 180000;
  stats.listenedMs = (stats.listenedMs || 0) + duration;

  // Update track
  const tracks: any[] = stats.tracks || [];
  const existingIndex = tracks.findIndex((t: any) => t.id === track.id || t.title === track.title);
  if (existingIndex >= 0) {
    tracks[existingIndex].plays = (tracks[existingIndex].plays || 0) + 1;
    tracks[existingIndex].listenedMs = (tracks[existingIndex].listenedMs || 0) + duration;
    tracks[existingIndex].lastPlayedAt = new Date().toISOString();
  } else {
    tracks.unshift({
      id: track.id,
      title: track.title,
      subtitle: Array.isArray(track.artists) ? track.artists.map((a: any) => a.name || a).join(", ") : track.artists || "",
      coverUrl: track.coverUrl,
      plays: 1,
      listenedMs: duration,
      rank: tracks.length + 1,
      rankDelta: null,
      isNew: true,
      lastPlayedAt: new Date().toISOString(),
    });
  }
  // Re-rank tracks
  tracks.sort((a, b) => (b.plays || 0) - (a.plays || 0));
  tracks.forEach((t, i) => { t.rank = i + 1; });
  stats.tracks = tracks;

  // Update artist
  const artistName = Array.isArray(track.artists) ? (track.artists[0]?.name || track.artists[0] || "Unknown") : (track.artists || "Unknown");
  const artists: any[] = stats.artists || [];
  const aIdx = artists.findIndex((a: any) => a.title === artistName);
  if (aIdx >= 0) {
    artists[aIdx].plays = (artists[aIdx].plays || 0) + 1;
    artists[aIdx].listenedMs = (artists[aIdx].listenedMs || 0) + duration;
  } else {
    artists.push({
      id: "art_" + artistName.replace(/\s+/g, "_"),
      title: artistName,
      plays: 1,
      listenedMs: duration,
      rank: artists.length + 1,
      rankDelta: null,
      isNew: true,
    });
  }
  artists.sort((a, b) => (b.plays || 0) - (a.plays || 0));
  artists.forEach((a, i) => { a.rank = i + 1; });
  stats.artists = artists;

  saveJson(STORAGE_STATS, stats);
}

export async function handleLocalCoreRequest(urlStr: string, init?: RequestInit): Promise<Response> {
  let path = urlStr;
  try {
    const parsed = new URL(urlStr);
    path = parsed.pathname + parsed.search;
  } catch {
    path = urlStr.replace(/^nuvo-core:\/\/local/, "").replace(/^http:\/\/nuvo-core/, "");
  }

  const method = (init?.method || "GET").toUpperCase();
  let body: any = null;
  if (init?.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }

  // --- PLAYLISTS ---
  // GET /v1/me/playlists
  if (path.startsWith("/v1/me/playlists") && method === "GET" && (path === "/v1/me/playlists" || path.startsWith("/v1/me/playlists?"))) {
    const playlists = loadJson<StoredPlaylist[]>(STORAGE_PLAYLISTS, []);
    const items = playlists.map(({ items: _, ...summary }) => summary);
    return new Response(JSON.stringify({ items }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // POST /v1/me/playlists
  if (path === "/v1/me/playlists" && method === "POST") {
    const playlists = loadJson<StoredPlaylist[]>(STORAGE_PLAYLISTS, []);
    const id = "pl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newPlaylist: StoredPlaylist = {
      id,
      title: body?.title || "Новый плейлист",
      description: body?.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revision: 1,
      coverUrl: null,
      trackCount: 0,
      covers: [],
      sortMode: "manual",
      pinnedOffline: false,
      items: [],
    };
    playlists.unshift(newPlaylist);
    saveJson(STORAGE_PLAYLISTS, playlists);
    const { items: _, ...summary } = newPlaylist;
    return new Response(JSON.stringify(summary), { status: 200, headers: { "content-type": "application/json" } });
  }

  // Matches /v1/me/playlists/:id
  const plMatch = path.match(/^\/v1\/me\/playlists\/([^/?]+)(.*)$/);
  if (plMatch) {
    const plId = decodeURIComponent(plMatch[1]);
    const subPath = plMatch[2];
    const playlists = loadJson<StoredPlaylist[]>(STORAGE_PLAYLISTS, []);
    const idx = playlists.findIndex((p) => p.id === plId);

    if (idx < 0 && method !== "DELETE") {
      // Create empty placeholder if not found so user never gets 404
      const placeholder: StoredPlaylist = {
        id: plId,
        title: "Плейлист",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: 1,
        coverUrl: null,
        trackCount: 0,
        covers: [],
        sortMode: "manual",
        pinnedOffline: false,
        items: [],
      };
      playlists.push(placeholder);
      saveJson(STORAGE_PLAYLISTS, playlists);
    }

    const currentPl = playlists.find((p) => p.id === plId)!;

    // GET /v1/me/playlists/:id
    if (!subPath && method === "GET") {
      const { items, ...summary } = currentPl;
      return new Response(JSON.stringify({ playlist: summary, items: items || [] }), { status: 200, headers: { "content-type": "application/json" } });
    }

    // PATCH /v1/me/playlists/:id
    if (!subPath && method === "PATCH") {
      if (body?.title) currentPl.title = body.title;
      if (body?.description !== undefined) currentPl.description = body.description;
      currentPl.updatedAt = new Date().toISOString();
      saveJson(STORAGE_PLAYLISTS, playlists);
      const { items: _, ...summary } = currentPl;
      return new Response(JSON.stringify(summary), { status: 200, headers: { "content-type": "application/json" } });
    }

    // DELETE /v1/me/playlists/:id
    if (!subPath && method === "DELETE") {
      const updated = playlists.filter((p) => p.id !== plId);
      saveJson(STORAGE_PLAYLISTS, updated);
      return new Response(null, { status: 204 });
    }

    // POST /v1/me/playlists/:id/items
    if (subPath.startsWith("/items") && method === "POST") {
      currentPl.items = currentPl.items || [];
      const newItems = Array.isArray(body?.tracks) ? body.tracks : body?.track ? [body.track] : [];
      for (const t of newItems) {
        const itemId = "it_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        currentPl.items.push({
          id: itemId,
          track: t,
          position: currentPl.items.length,
          addedAt: new Date().toISOString(),
        });
        if (t.coverUrl && !currentPl.covers.includes(t.coverUrl)) {
          currentPl.covers.push(t.coverUrl);
        }
      }
      currentPl.trackCount = currentPl.items.length;
      if (currentPl.covers.length > 0 && !currentPl.coverUrl) {
        currentPl.coverUrl = currentPl.covers[0];
      }
      currentPl.updatedAt = new Date().toISOString();
      saveJson(STORAGE_PLAYLISTS, playlists);
      return new Response(JSON.stringify({ ok: true, count: currentPl.items.length }), { status: 200, headers: { "content-type": "application/json" } });
    }

    // DELETE /v1/me/playlists/:id/items
    if (subPath.startsWith("/items") && method === "DELETE") {
      const idsToDelete = Array.isArray(body?.ids) ? body.ids : [];
      currentPl.items = (currentPl.items || []).filter((it) => !idsToDelete.includes(it.id));
      currentPl.trackCount = currentPl.items.length;
      saveJson(STORAGE_PLAYLISTS, playlists);
      return new Response(null, { status: 204 });
    }
  }

  // --- LIKED TRACKS ---
  // GET /v1/me/library/tracks
  if (path.startsWith("/v1/me/library/tracks") && method === "GET") {
    const liked = loadJson<any[]>(STORAGE_LIKED, []);
    const items = liked.map((track) => ({ track }));
    return new Response(JSON.stringify({ items, nextCursor: null }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // GET /v1/me/library/track-ids
  if (path.startsWith("/v1/me/library/track-ids") && method === "GET") {
    const liked = loadJson<any[]>(STORAGE_LIKED, []);
    const ids = liked.map((t) => t.id).filter(Boolean);
    return new Response(JSON.stringify({ ids }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // PUT /v1/me/library/tracks/:id
  const likeMatch = path.match(/^\/v1\/me\/library\/tracks\/([^/?]+)/);
  if (likeMatch && method === "PUT") {
    const trackId = decodeURIComponent(likeMatch[1]);
    const liked = loadJson<any[]>(STORAGE_LIKED, []);
    if (!liked.some((t) => t.id === trackId)) {
      liked.unshift(body?.track || { id: trackId });
      saveJson(STORAGE_LIKED, liked);
    }
    return new Response(null, { status: 204 });
  }

  // DELETE /v1/me/library/tracks/:id
  if (likeMatch && method === "DELETE") {
    const trackId = decodeURIComponent(likeMatch[1]);
    const liked = loadJson<any[]>(STORAGE_LIKED, []);
    const filtered = liked.filter((t) => t.id !== trackId);
    saveJson(STORAGE_LIKED, filtered);
    return new Response(null, { status: 204 });
  }

  // --- STATS OVERVIEW ---
  // GET /v1/stats/overview
  if (path.startsWith("/v1/stats/overview")) {
    const stats = loadJson(STORAGE_STATS, getStarterStats());
    const topTracks: StatsRow[] = stats.tracks || [];
    const topArtists: StatsRow[] = stats.artists || [];
    const totalListened = stats.listenedMs || 3600000;
    const totalPlays = stats.plays || 15;

    const overview: StatsOverview = {
      range: {
        from: new Date(Date.now() - 30 * 86400000).toISOString(),
        to: new Date().toISOString(),
        days: 30,
        previousFrom: new Date(Date.now() - 60 * 86400000).toISOString(),
        previousTo: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      totals: {
        listenedMs: totalListened,
        plays: totalPlays,
        tracks: Math.max(topTracks.length, 5),
        artists: Math.max(topArtists.length, 3),
        albums: 3,
        activeDays: 6,
        sessions: 8,
        skipRate: 0.08,
        completedRate: 0.92,
      },
      previous: {
        listenedMs: Math.round(totalListened * 0.75),
        plays: Math.max(1, Math.round(totalPlays * 0.75)),
        tracks: Math.max(1, Math.round(topTracks.length * 0.8)),
        artists: Math.max(1, Math.round(topArtists.length * 0.8)),
        albums: 2,
        activeDays: 4,
        sessions: 6,
        skipRate: 0.1,
        completedRate: 0.9,
      },
      newTracks: topTracks.filter((t) => t.isNew).length || 3,
      newArtists: topArtists.filter((a) => a.isNew).length || 2,
      currentStreak: 4,
      longestStreak: { days: 9, from: null, to: null },
      firstPlayedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      days: [
        { day: "Пн", listenedMs: Math.round(totalListened * 0.12), plays: Math.round(totalPlays * 0.12) },
        { day: "Вт", listenedMs: Math.round(totalListened * 0.15), plays: Math.round(totalPlays * 0.15) },
        { day: "Ср", listenedMs: Math.round(totalListened * 0.18), plays: Math.round(totalPlays * 0.18) },
        { day: "Чт", listenedMs: Math.round(totalListened * 0.14), plays: Math.round(totalPlays * 0.14) },
        { day: "Пт", listenedMs: Math.round(totalListened * 0.22), plays: Math.round(totalPlays * 0.22) },
        { day: "Сб", listenedMs: Math.round(totalListened * 0.19), plays: Math.round(totalPlays * 0.19) },
      ],
      calendar: [],
      byHour: [0, 0, 0, 0, 1, 2, 3, 5, 4, 6, 8, 10, 12, 11, 9, 7, 5, 4, 3, 2, 1, 0, 0, 0],
      byWeekday: [10, 12, 15, 14, 20, 25, 18],
      sources: [{ kind: "youtube", plays: totalPlays, listenedMs: totalListened }],
      origins: [{ kind: "search", plays: Math.round(totalPlays * 0.7), listenedMs: Math.round(totalListened * 0.7) }],
      sessions: { count: 8, averageMs: 900000, longestMs: 2700000, longestStartedAt: null, longestTracks: 7 },
      top: {
        tracks: topTracks,
        artists: topArtists,
        albums: [],
        playlists: [],
        genres: [{ id: "g1", title: "Pop / Synthwave", plays: totalPlays, listenedMs: totalListened, rank: 1, rankDelta: null, isNew: false }],
      },
      mostSkipped: [],
      mostReplayed: topTracks.slice(0, 3),
      onRepeat: topTracks.slice(0, 3),
      discoveries: topTracks.slice(0, 5),
      forgotten: [],
    };

    return new Response(JSON.stringify(overview), { status: 200, headers: { "content-type": "application/json" } });
  }

  // GET /v1/stats/collection
  if (path.startsWith("/v1/stats/collection") && method === "GET") {
    return new Response(JSON.stringify({ paused: false }), { status: 200, headers: { "content-type": "application/json" } });
  }
  // PUT /v1/stats/collection
  if (path.startsWith("/v1/stats/collection") && method === "PUT") {
    return new Response(JSON.stringify({ paused: body?.paused ?? false }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // POST /v1/stats/delete
  if (path.startsWith("/v1/stats/delete") && method === "POST") {
    return new Response(JSON.stringify({ events: 0 }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // GET /v1/stats/:kind/:id
  if (path.startsWith("/v1/stats/")) {
    const detail: StatsDetail = {
      title: "Статистика",
      subtitle: "Nuvo",
      coverUrl: null,
      track: null,
      openId: null,
      firstPlayedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      lastPlayedAt: new Date().toISOString(),
      plays: 12,
      listenedMs: 2400000,
      skips: 1,
      completed: 11,
      activeDays: 5,
      byMonth: [{ month: "Ноябрь", plays: 12, listenedMs: 2400000 }],
      byHour: [0, 0, 0, 1, 2, 4, 3, 2, 0, 0],
      byWeekday: [2, 3, 1, 4, 2],
      sources: [{ kind: "youtube", plays: 12, listenedMs: 2400000 }],
      topTracks: [],
    };
    return new Response(JSON.stringify(detail), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- PLAYBACK EVENTS ---
  if (path.startsWith("/v1/me/playback/events") || path.startsWith("/v1/me/playback/now-playing")) {
    if (body?.track || body?.trackSnapshot) {
      recordTrackPlay(body.track || body.trackSnapshot);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- IMPORTS ---
  // POST /v1/imports or POST /v1/imports/start
  if ((path === "/v1/imports" || path.startsWith("/v1/imports?") || path === "/v1/imports/start" || path.startsWith("/v1/imports/start?")) && method === "POST") {
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    const label = body?.label || "Импортированный плейлист";
    const playlists = loadJson<StoredPlaylist[]>(STORAGE_PLAYLISTS, []);
    const id = "pl_imp_" + Date.now().toString(36);

    const items = rows.map((r: any, idx: number) => ({
      id: "it_" + idx + "_" + Math.random().toString(36).slice(2, 6),
      track: {
        id: "yt_" + Math.random().toString(36).slice(2, 10),
        title: r.title || "Трек",
        artists: Array.isArray(r.artists) ? r.artists.join(", ") : r.artists || "",
        durationMs: r.durationMs || 180000,
        coverUrl: r.coverUrl || null,
      },
      position: idx,
      addedAt: new Date().toISOString(),
    }));

    const isLikedTarget = body?.target?.kind === "liked";
    let targetId = id;

    if (isLikedTarget) {
      targetId = "likes";
      const liked = loadJson<any[]>(STORAGE_LIKED, []);
      for (const it of items) {
        if (!liked.some((t) => t.id === it.track.id)) {
          liked.unshift(it.track);
        }
      }
      saveJson(STORAGE_LIKED, liked);
    } else {
      const newPlaylist: StoredPlaylist = {
        id,
        title: label,
        description: `Импортировано из ${body?.source || "Spotify"} (${items.length} треков)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: 1,
        coverUrl: null,
        trackCount: items.length,
        covers: [],
        sortMode: "manual",
        pinnedOffline: false,
        items,
      };
      playlists.unshift(newPlaylist);
      saveJson(STORAGE_PLAYLISTS, playlists);
    }

    const summary = {
      id: "imp_" + Date.now().toString(36),
      sourceKind: body?.source || "spotify",
      label,
      targetKind: (isLikedTarget ? "liked" : "playlist") as "liked" | "playlist",
      targetId,
      createdAt: new Date().toISOString(),
      status: "done" as const,
      total: items.length,
      done: items.length,
      needsReview: 0,
      counts: {
        exact: items.length,
        likely: 0,
        check: 0,
        missing: 0,
        already: 0,
      },
    };
    const summaries = loadJson<any[]>("nuvo_import_summaries_v1", []);
    summaries.unshift(summary);
    saveJson("nuvo_import_summaries_v1", summaries);

    return new Response(JSON.stringify({ items: [summary] }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // GET /v1/imports
  if (path === "/v1/imports" && method === "GET") {
    const summaries = loadJson<any[]>("nuvo_import_summaries_v1", []);
    return new Response(JSON.stringify({ items: summaries }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // GET /v1/imports/:id
  const impMatch = path.match(/^\/v1\/imports\/([^/?]+)/);
  if (impMatch && method === "GET") {
    const impId = impMatch[1];
    const summaries = loadJson<any[]>("nuvo_import_summaries_v1", []);
    const found = summaries.find((s) => s.id === impId) || {
      id: impId,
      sourceKind: "spotify",
      label: "Импорт",
      targetKind: "playlist",
      createdAt: new Date().toISOString(),
      status: "done",
      total: 1,
      done: 1,
      needsReview: 0,
      counts: { exact: 1, likely: 0, check: 0, missing: 0, already: 0 },
    };
    return new Response(JSON.stringify(found), { status: 200, headers: { "content-type": "application/json" } });
  }

  if (path.startsWith("/v1/imports/")) {
    return new Response(JSON.stringify({ ok: true, rows: [], nextCursor: null }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- SOUNDCLOUD / AUDIO FALLBACK STREAM ---
  const scMatch = path.match(/^\/v1\/sc\/tracks\/([^/?]+)\/stream/);
  if (scMatch && method === "GET") {
    const rawId = decodeURIComponent(scMatch[1]);
    const cleanId = rawId.replace(/^audius_/, "");
    const streamUrl = cleanId && cleanId !== "fallback"
      ? `https://discoveryprovider.audius.co/v1/tracks/${cleanId}/stream?app_name=NuvoMobile`
      : "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=electronic-future-beats-117997.mp3";
    return new Response(
      JSON.stringify({
        url: streamUrl,
        mimeType: "audio/mpeg",
        codec: "mp3",
        bitrate: 192000,
        expiresAt: null,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // --- MATCH / APPROVED (AUTOMATIC AUDIO FALLBACK TO PREVENT REGION SKIPS) ---
  if (path === "/v1/match/approved" && method === "POST") {
    const source = body?.source;
    const title = source?.title || "";
    const artists = Array.isArray(source?.artists) ? source.artists.join(" ") : "";
    const q = `${title} ${artists}`.trim();

    let altId = "fallback";
    let altTitle = title || "Alternative Track";
    let altArtist = artists || "Nuvo Stream";
    let altDurationMs = source?.durationMs || 180000;

    if (q) {
      try {
        const audiusRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=NuvoMobile`);
        if (audiusRes.ok) {
          const audiusData = await audiusRes.json();
          const first = audiusData.data?.[0];
          if (first && first.id) {
            altId = `audius_${first.id}`;
            altTitle = first.title;
            altArtist = first.user?.name || altArtist;
            altDurationMs = (first.duration || 180) * 1000;
          }
        }
      } catch {}
    }

    return new Response(
      JSON.stringify({
        status: "approved",
        score: 95,
        track: {
          id: `sc:${altId}`,
          title: altTitle,
          artists: [altArtist],
          durationMs: altDurationMs,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  // --- APPEARANCE ---
  if (path.startsWith("/v1/appearance")) {
    const defaultAppearance = {
      themes: [],
      active: { presetId: "nuvo" },
      fonts: { ui: { kind: "default" }, lyrics: { kind: "default" }, uiScale: 1, lyricsScale: 1 },
      fontFiles: [],
      customCss: { enabled: false, text: "" },
    };
    const current = loadJson("nuvo_appearance_v1", defaultAppearance);
    if (!current.active || typeof current.active.presetId !== "string") {
      current.active = { presetId: "nuvo" };
    }
    if (!Array.isArray(current.themes)) current.themes = [];

    if (method === "PATCH" && body) {
      const merged = {
        ...current,
        ...body,
        active: { ...current.active, ...(body.active || {}) },
      };
      saveJson("nuvo_appearance_v1", merged);
      return new Response(JSON.stringify(merged), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify(current), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- RECOMMENDATIONS / DAILY MIXES ---
  if (path === "/v1/me/recommendations/daily-mixes" || path.startsWith("/v1/me/recommendations/")) {
    return new Response(JSON.stringify({ items: SAMPLE_MIXES }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- SYSTEM NETWORK CHECK ---
  if (path === "/v1/system/network-check") {
    return new Response(JSON.stringify({ ok: true, tools: { yt_dlp: true, ffmpeg: true } }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- MATCH RANK ---
  if (path === "/v1/match/rank") {
    let ids: string[] = [];
    if (Array.isArray(body?.songs)) {
      ids = body.songs.map((s: { id: string }) => s.id);
    }
    return new Response(JSON.stringify({ ok: true, ids }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- SHORTCUTS ---
  if (path === "/v1/shortcuts") {
    return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- RECOGNIZE HISTORY ---
  if (path === "/v1/recognize/history") {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- SAVED COLLECTIONS / ALBUMS / ARTISTS ---
  if (path.startsWith("/v1/me/library/") || path.startsWith("/v1/me/saved")) {
    return new Response(JSON.stringify({ items: [], nextCursor: null }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // --- FLAGS / PINS ---
  if (path.startsWith("/v1/me/flags")) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }

  // Default fallback - include items: [] to prevent .map errors on undefined
  return new Response(JSON.stringify({ ok: true, items: [] }), { status: 200, headers: { "content-type": "application/json" } });
}

/** Installs global fetch interceptor for nuvo-core:// protocol */
export function initLocalCore(): void {
  if (typeof window === "undefined") return;
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (urlStr.startsWith("nuvo-core://") || urlStr.startsWith("http://nuvo-core")) {
      return handleLocalCoreRequest(urlStr, init);
    }
    return originalFetch.apply(this, arguments as any);
  };
}
