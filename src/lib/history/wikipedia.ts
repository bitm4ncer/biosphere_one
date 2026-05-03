// src/lib/history/wikipedia.ts
//
// Lazy fetch of a Wikipedia article summary for the History tab popup.
// Only called when a landmark marker is tapped, so a per-session
// in-memory cache is enough.

export interface WikipediaSummary {
  title: string;
  extract: string;
  url: string;
  thumbnail?: { source: string; width: number; height: number };
}

const SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const cache = new Map<string, WikipediaSummary | null>();

interface RestSummary {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source: string; width: number; height: number };
}

export async function fetchWikipediaSummary(
  title: string,
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  if (!title) return null;
  if (cache.has(title)) return cache.get(title) ?? null;
  try {
    const res = await fetch(SUMMARY_BASE + encodeURIComponent(title), {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cache.set(title, null);
      return null;
    }
    const data = (await res.json()) as RestSummary;
    if (!data.extract) {
      cache.set(title, null);
      return null;
    }
    const summary: WikipediaSummary = {
      title: data.title ?? title,
      extract: data.extract,
      url:
        data.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
    if (data.thumbnail) summary.thumbnail = data.thumbnail;
    cache.set(title, summary);
    return summary;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    cache.set(title, null);
    return null;
  }
}
