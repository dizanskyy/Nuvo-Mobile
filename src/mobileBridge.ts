// Mobile bridge: intercepts nuvo-core://local requests in browser/webview
// and provides authentic data so Nuvo's real UI renders beautifully without crashing.

const CORE_SCHEME = "nuvo-core://local";

export const SAMPLE_MIXES = [
  {
    id: "mix_nuvo_1",
    title: "Nuvo Mix 1",
    description: "M83, The Weeknd, Daft Punk и другие",
    tracks: [
      {
        id: "yt:kXYiU_JCYtU",
        title: "Numb",
        artist: "Linkin Park",
        artists: [{ name: "Linkin Park", id: "lp" }],
        album: { id: "meteora", title: "Meteora" },
        durationMs: 187000,
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=electronic-future-beats-117997.mp3",
        source: "youtube",
      },
      {
        id: "yt:m83_midnight",
        title: "Midnight City",
        artist: "M83",
        artists: [{ name: "M83", id: "m83" }],
        album: { id: "hurry_up", title: "Hurry Up, We're Dreaming" },
        durationMs: 243000,
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lifelike-126735.mp3",
        source: "youtube",
      },
      {
        id: "yt:weeknd_starboy",
        title: "Starboy",
        artist: "The Weeknd feat. Daft Punk",
        artists: [{ name: "The Weeknd", id: "tw" }, { name: "Daft Punk", id: "dp" }],
        album: { id: "starboy", title: "Starboy" },
        durationMs: 230000,
        coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-future-beat-123497.mp3",
        source: "youtube",
      },
      {
        id: "yt:home_resonance",
        title: "Resonance",
        artist: "HOME",
        artists: [{ name: "HOME", id: "home" }],
        album: { id: "odyssey", title: "Odyssey" },
        durationMs: 212000,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_248c82ce02.mp3?filename=funky-disco-142277.mp3",
        source: "youtube",
      },
    ],
  },
  {
    id: "mix_nuvo_2",
    title: "Киберпанк & Синтвейв",
    description: "Атмосферный синтвейв и неоновые ритмы",
    tracks: [
      {
        id: "yt:daft_lucky",
        title: "Get Lucky",
        artist: "Daft Punk",
        artists: [{ name: "Daft Punk", id: "dp" }],
        album: { id: "ram", title: "Random Access Memories" },
        durationMs: 248000,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=anthem-of-victory-111206.mp3",
        source: "youtube",
      },
      {
        id: "yt:weeknd_afterhours",
        title: "After Hours",
        artist: "The Weeknd",
        artists: [{ name: "The Weeknd", id: "tw" }],
        album: { id: "after_hours", title: "After Hours" },
        durationMs: 361000,
        coverUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=electronic-future-beats-117997.mp3",
        source: "youtube",
      },
      {
        id: "yt:kavinsky_nightcall",
        title: "Nightcall",
        artist: "Kavinsky",
        artists: [{ name: "Kavinsky", id: "kav" }],
        album: { id: "outrun", title: "OutRun" },
        durationMs: 259000,
        coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-future-beat-123497.mp3",
        source: "youtube",
      },
      {
        id: "yt:gunship_tech",
        title: "Tech Noir",
        artist: "GUNSHIP",
        artists: [{ name: "GUNSHIP", id: "gun" }],
        album: { id: "gunship", title: "GUNSHIP" },
        durationMs: 297000,
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2021/09/06/audio_248c82ce02.mp3?filename=funky-disco-142277.mp3",
        source: "youtube",
      },
    ],
  },
  {
    id: "mix_nuvo_3",
    title: "Ночной город",
    description: "Спокойная музыка для вечернего отдыха",
    tracks: [
      {
        id: "yt:m83_wait",
        title: "Wait",
        artist: "M83",
        artists: [{ name: "M83", id: "m83" }],
        album: { id: "hurry_up", title: "Hurry Up, We're Dreaming" },
        durationMs: 343000,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=lifelike-126735.mp3",
        source: "youtube",
      },
      {
        id: "yt:cigarettes_sunset",
        title: "Sunsetz",
        artist: "Cigarettes After Sex",
        artists: [{ name: "Cigarettes After Sex", id: "cas" }],
        album: { id: "cas_album", title: "Cigarettes After Sex" },
        durationMs: 215000,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=electronic-future-beats-117997.mp3",
        source: "youtube",
      },
      {
        id: "yt:beachhouse_space",
        title: "Space Song",
        artist: "Beach House",
        artists: [{ name: "Beach House", id: "bh" }],
        album: { id: "depression_cherry", title: "Depression Cherry" },
        durationMs: 320000,
        coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=anthem-of-victory-111206.mp3",
        source: "youtube",
      },
      {
        id: "yt:bonobo_kerala",
        title: "Kerala",
        artist: "Bonobo",
        artists: [{ name: "Bonobo", id: "bonobo" }],
        album: { id: "migration", title: "Migration" },
        durationMs: 237000,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
        cover: { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80", width: 512, height: 512 },
        audioUrl: "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f792cb.mp3?filename=tuesday-glitch-future-beat-123497.mp3",
        source: "youtube",
      },
    ],
  },
];

const DEFAULT_APPEARANCE = {
  themes: [],
  active: { presetId: "nuvo" },
  fonts: { ui: { kind: "default" }, lyrics: { kind: "default" }, uiScale: 1, lyricsScale: 1 },
  fontFiles: [],
  customCss: { enabled: false, text: "" },
};

const STATS_OVERVIEW = {
  range: { from: null, to: new Date().toISOString(), days: 30, previousFrom: null, previousTo: null },
  totals: {
    listenedMs: 3600000,
    plays: 12,
    tracks: 8,
    artists: 5,
    albums: 4,
    activeDays: 3,
    sessions: 4,
    skipRate: 0.1,
    completedRate: 0.9,
  },
  previous: null,
  newTracks: 3,
  newArtists: 2,
  currentStreak: 2,
  longestStreak: { days: 2, from: null, to: null },
  firstPlayedAt: new Date().toISOString(),
  days: [],
  calendar: [],
  byHour: Array(24).fill(0),
  byWeekday: Array(7).fill(0),
  sources: [{ kind: "youtube", plays: 12, listenedMs: 3600000 }],
  origins: [],
  sessions: { count: 4, averageMs: 900000, longestMs: 1800000, longestStartedAt: null, longestTracks: 4 },
  top: {
    tracks: [
      {
        id: "yt:kXYiU_JCYtU",
        title: "Numb",
        subtitle: "Linkin Park",
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
        plays: 5,
        listenedMs: 935000,
        rank: 1,
        rankDelta: null,
        isNew: true,
        track: {
          id: "yt:kXYiU_JCYtU",
          title: "Numb",
          artists: [{ name: "Linkin Park", id: "lp" }],
          coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
          durationMs: 187000,
        },
      },
    ],
    artists: [
      {
        id: "lp",
        title: "Linkin Park",
        plays: 5,
        listenedMs: 935000,
        rank: 1,
        rankDelta: null,
        isNew: true,
      },
    ],
    albums: [],
    playlists: [],
    genres: [],
  },
  mostSkipped: [],
  mostReplayed: [],
  onRepeat: [],
  discoveries: [],
  forgotten: [],
};

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  if (url.startsWith(CORE_SCHEME)) {
    const path = url.slice(CORE_SCHEME.length);
    const [pathname] = path.split("?");

    // Stats
    if (pathname.startsWith("/v1/stats") || pathname.startsWith("/v1/me/stats")) {
      return new Response(JSON.stringify(STATS_OVERVIEW), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Daily mixes / Home recommendations
    if (pathname === "/v1/me/recommendations/daily-mixes") {
      return new Response(JSON.stringify({ items: SAMPLE_MIXES }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Liked tracks
    if (pathname === "/v1/me/library/tracks") {
      const stored = localStorage.getItem("nuvo_liked_items");
      const items = stored ? JSON.parse(stored) : SAMPLE_MIXES[0].tracks.map((t) => ({ track: t }));
      return new Response(JSON.stringify({ items, nextCursor: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Liked track IDs
    if (pathname === "/v1/me/library/track-ids") {
      return new Response(JSON.stringify(SAMPLE_MIXES[0].tracks.map((t) => t.id)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Playlists
    if (pathname === "/v1/me/playlists" || pathname === "/v1/me/library/playlists") {
      const playlists = [
        {
          id: "p_fav",
          title: "Любимое",
          itemCount: 4,
          coverUrl: SAMPLE_MIXES[0].tracks[0].coverUrl,
          updatedAt: new Date().toISOString(),
          covers: [SAMPLE_MIXES[0].tracks[0].coverUrl],
        },
      ];
      return new Response(JSON.stringify({ playlists, items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Albums / Artists
    if (pathname === "/v1/me/library/albums" || pathname === "/v1/me/library/artists") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Flags & Trims
    if (pathname === "/v1/me/flags" || pathname === "/v1/me/trims") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Shortcuts
    if (pathname === "/v1/shortcuts") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // System network check
    if (pathname === "/v1/system/network-check") {
      return new Response(JSON.stringify({ ok: true, tools: { yt_dlp: true, ffmpeg: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Appearance / Settings
    if (pathname.startsWith("/v1/appearance") || pathname.startsWith("/v1/settings")) {
      return new Response(JSON.stringify(DEFAULT_APPEARANCE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Match rank
    if (pathname === "/v1/match/rank") {
      let ids: string[] = [];
      try {
        if (init?.body) {
          const body = JSON.parse(String(init.body));
          if (Array.isArray(body?.songs)) {
            ids = body.songs.map((s: { id: string }) => s.id);
          }
        }
      } catch {}
      return new Response(JSON.stringify({ ok: true, ids }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Recognize History
    if (pathname === "/v1/recognize/history") {
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default 200 OK for any unhandled nuvo-core route
    return new Response(JSON.stringify({ ok: true, items: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return originalFetch(input, init);
};

export {};
