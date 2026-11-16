import type { CatalogPort } from "../engine/adapters";
import type { YoutubePort } from "../engine/sources/ports";
import type { Track } from "../engine/types";
import type { Youtube } from "./index";
import type { SearchItem, YtTrack } from "./types";
import { SAMPLE_MIXES } from "../mobileBridge";
import { getStreamForTrack, resolveSoundCloudStream, resolveYouTubeStream, searchOnlineMusic } from "../data/catalog/openSearch";

export function toEngineTrack(track: YtTrack): Track {
  const first = track.artists[0];
  return {
    id: track.id,
    title: track.title,
    artists: track.artists.map((artist) => artist.name).join(", "),
    artistId: first && first.id && first.id !== "unknown" ? first.id : undefined,
    artistList: track.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
    })),
    album: track.album,
    coverUrl: track.cover?.url ?? "",
    durationMs: track.durationMs,
    explicit: track.explicit,
  };
}

const tracksOnly = (items: SearchItem[]) => items.filter((item): item is Extract<SearchItem, { kind: "track" }> => item.kind === "track");

export function engineYoutube(youtube: Pick<Youtube, "playback">): YoutubePort {
  return {
    resolve: async (track, options, signal) => {
      // 1. Direct stream resolver (YouTube Invidious, SoundCloud AAC/MP3, Audius)
      const stream = await getStreamForTrack(track.id, track.title, track.artists, signal);
      if (stream) {
        return {
          url: stream.url,
          mimeType: stream.mimeType,
          codec: stream.codec,
          bitrate: stream.bitrate,
          servedBy: "stream-resolver",
        };
      }

      // 2. YouTube direct resolution if ID is YouTube format
      const isYt = track.id.startsWith("yt:") || /^[A-Za-z0-9_-]{11}$/.test(track.id);
      if (isYt) {
        const ytStream = await resolveYouTubeStream(track.id.replace(/^yt:/, ""), signal);
        if (ytStream) {
          return {
            url: ytStream.url,
            mimeType: ytStream.mimeType,
            codec: ytStream.codec,
            bitrate: ytStream.bitrate,
            servedBy: "youtube-mirror",
          };
        }
      }

      // 3. Fallback search on SoundCloud by track title + artist
      if (track.title) {
        const scStream = await resolveSoundCloudStream(track.title, track.artists, signal);
        if (scStream) {
          return {
            url: scStream.url,
            mimeType: scStream.mimeType,
            codec: scStream.codec,
            bitrate: scStream.bitrate,
            servedBy: "soundcloud-stream",
          };
        }
      }

      // 4. Sample mix track audio
      for (const mix of SAMPLE_MIXES) {
        const found = mix.tracks.find((t) => t.id === track.id);
        if (found && (found as any).audioUrl) {
          return {
            url: (found as any).audioUrl,
            mimeType: "audio/mpeg",
            codec: "mp3",
            bitrate: 160000,
            servedBy: "sample",
          };
        }
      }

      // 5. Native YouTube playback engine
      try {
        return await youtube.playback.resolve(
          track,
          {
            progressive: options.progressive,
            early: options.early,
            quality: options.quality,
            codec: options.codec === "opus" || options.codec === "aac" ? options.codec : undefined,
          },
          signal,
        );
      } catch {
        return {
          url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=electronic-future-beats-117997.mp3",
          mimeType: "audio/mpeg",
          codec: "mp3",
          bitrate: 160000,
          servedBy: "fallback",
        };
      }
    },
    fetchWhole: (source, signal) => youtube.playback.fetchWhole(source, signal),
    warmUp: () => youtube.playback.warmUp(),
  };
}

export function engineCatalog(youtube: Pick<Youtube, "catalog">): CatalogPort {
  return {
    async searchFiltered(query, filter, signal) {
      const openItems = await searchOnlineMusic(query, signal);
      if (openItems.length > 0) return tracksOnly(openItems).map(toEngineTrack);
      try {
        const items = await youtube.catalog.searchFiltered(query, filter === "songs" ? "track" : filter === "videos" ? "video" : undefined, signal);
        const tracks = tracksOnly(items);
        if (tracks.length > 0) return tracks.map(toEngineTrack);
      } catch {}
      return [];
    },
  };
}
