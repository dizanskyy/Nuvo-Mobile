import type { Track } from "./types";

export interface TrackSnapshot {
  id: string;
  title: string;
  artists: Array<{ id: string; name: string }>;
  album?: { id: string; title: string };
  cover?: { url: string; width: number; height: number };
  durationMs: number;
}

export function snapshotArtists(track: Track): Array<{ id: string; name: string }> {
  if (track.artistList && track.artistList.length > 0) return track.artistList.map(({ id, name }) => ({ id: id ?? "", name }));
  const names = track.artists
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length > 0) return names.map((name) => ({ id: track.artistId || "unknown", name }));
  return [{ id: "unknown", name: "Unknown Artist" }];
}

export function toSnapshot(track: Track): TrackSnapshot {
  return {
    id: track.id,
    title: track.title || "Unknown Track",
    artists: snapshotArtists(track),
    ...(track.album ? { album: track.album } : {}),
    ...(track.coverUrl ? { cover: { url: track.coverUrl, width: 512, height: 512 } } : {}),
    durationMs: track.durationMs > 0 ? track.durationMs : 0,
  };
}

export function fromSnapshot(value: unknown): Track | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || raw.id === "") return null;

  let artistList: Array<{ id: string; name: string }> = [];
  if (Array.isArray(raw.artists)) {
    artistList = raw.artists
      .filter((a): a is { id?: unknown; name: string } | string => !!a && (typeof (a as { name?: unknown }).name === "string" || typeof a === "string"))
      .map((a) => {
        if (typeof a === "string") return { id: "", name: a };
        return { id: typeof a.id === "string" ? a.id : "", name: (a as { name: string }).name };
      });
  } else if (typeof raw.artist === "string" && raw.artist.trim()) {
    artistList = [{ id: "", name: raw.artist.trim() }];
  } else if (typeof raw.artists === "string" && raw.artists.trim()) {
    artistList = raw.artists.split(",").map((s) => ({ id: "", name: s.trim() }));
  }

  const cover = raw.cover as { url?: unknown } | undefined;
  const coverUrl =
    (cover && typeof cover.url === "string" ? cover.url : "") ||
    (typeof raw.coverUrl === "string" ? raw.coverUrl : "") ||
    (typeof raw.cover_url === "string" ? raw.cover_url : "") ||
    "";

  let album: { id: string; title: string } | undefined;
  if (raw.album && typeof raw.album === "object") {
    const alb = raw.album as { id?: unknown; title?: unknown };
    if (typeof alb.id === "string" && typeof alb.title === "string") {
      album = { id: alb.id, title: alb.title };
    }
  } else if (typeof raw.album === "string" && raw.album.trim()) {
    album = { id: raw.album, title: raw.album };
  }

  const first = artistList[0];
  const durationMs =
    typeof raw.durationMs === "number" && raw.durationMs > 0
      ? raw.durationMs
      : typeof raw.duration_ms === "number" && raw.duration_ms > 0
        ? raw.duration_ms
        : 0;

  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    artists: artistList.map((a) => a.name).join(", "),
    ...(first && first.id && first.id !== "unknown" ? { artistId: first.id } : {}),
    artistList,
    ...(album ? { album } : {}),
    coverUrl,
    durationMs,
  };
}
