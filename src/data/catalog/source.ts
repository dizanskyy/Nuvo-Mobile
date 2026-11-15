import type { YtCatalog } from "@/youtube";
import { getYoutube } from "@/youtubeBoot";
import { searchOnlineMusic } from "./openSearch";

export function catalogSource(): YtCatalog | null {
  try {
    const orig = getYoutube().catalog;
    return {
      ...orig,
      async search(query: string, kind: any, signal: AbortSignal) {
        // Prioritize open search with direct playable audio streams and Russian catalog support
        const openItems = await searchOnlineMusic(query, signal);
        if (openItems && openItems.length > 0) {
          return openItems;
        }
        try {
          const ytItems = await orig.search(query, kind, signal);
          if (ytItems && ytItems.length > 0) return ytItems;
        } catch {}
        return [];
      },
    };
  } catch {
    return {
      search: (query: string, kind: any, signal: AbortSignal) => searchOnlineMusic(query, signal),
    } as unknown as YtCatalog;
  }
}
