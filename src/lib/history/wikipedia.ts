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
  /** Wikipedia language edition the summary came from (e.g. "en", "de"). */
  lang: string;
}

const cache = new Map<string, WikipediaSummary | null>();

interface RestSummary {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source: string; width: number; height: number };
}

async function fetchOne(
  title: string,
  lang: string,
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  const cacheKey = `${lang}:${title}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal, headers: { Accept: "application/json" } },
    );
    if (!res.ok) {
      cache.set(cacheKey, null);
      return null;
    }
    const data = (await res.json()) as RestSummary;
    if (!data.extract) {
      cache.set(cacheKey, null);
      return null;
    }
    const summary: WikipediaSummary = {
      title: data.title ?? title,
      extract: data.extract,
      url:
        data.content_urls?.desktop?.page ??
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      lang,
    };
    if (data.thumbnail) summary.thumbnail = data.thumbnail;
    cache.set(cacheKey, summary);
    return summary;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    cache.set(cacheKey, null);
    return null;
  }
}

/**
 * Try the preferred language first, then fall back through alternates.
 * The default chain (en → de) covers 90 %+ of the Wikidata + OSM
 * historic features in our European-leaning default viewport.
 */
export async function fetchWikipediaSummary(
  title: string,
  preferredLang: string = "en",
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  if (!title) return null;
  const langs =
    preferredLang === "en" ? ["en", "de"] : [preferredLang, "en", "de"];
  const seen = new Set<string>();
  for (const lang of langs) {
    if (seen.has(lang)) continue;
    seen.add(lang);
    const summary = await fetchOne(title, lang, signal);
    if (summary) return summary;
  }
  return null;
}

interface WbGetEntitiesResponse {
  entities?: Record<
    string,
    {
      sitelinks?: Record<string, { site?: string; title?: string; url?: string }>;
    }
  >;
}

const qidLookupCache = new Map<string, WikipediaSummary | null>();

/**
 * For Wikidata-sourced landmarks that lack a `wikipediaTitle` (the
 * SPARQL query only pulls the English article to keep the bbox query
 * fast — see landmarks.ts), do a follow-up `wbgetentities` request
 * that returns sitelinks for a fixed set of major languages, and
 * fetch the summary from whichever exists.
 *
 * This is what made popups say "No Wikipedia article linked" for
 * landmarks that DO have e.g. a German article — like
 * `Q16970 Garnisonskirche St. Anna`.
 */
export async function fetchWikipediaSummaryFromQid(
  qid: string,
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  if (!qid) return null;
  if (qidLookupCache.has(qid)) return qidLookupCache.get(qid) ?? null;

  // Sitelink keys we care about, in preference order.
  const sites = ["enwiki", "dewiki", "frwiki", "eswiki", "itwiki", "nlwiki"];
  const url =
    `https://www.wikidata.org/w/api.php` +
    `?action=wbgetentities&format=json&origin=*` +
    `&ids=${encodeURIComponent(qid)}` +
    `&props=sitelinks/urls&sitefilter=${sites.join("|")}`;

  let data: WbGetEntitiesResponse;
  try {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      qidLookupCache.set(qid, null);
      return null;
    }
    data = (await res.json()) as WbGetEntitiesResponse;
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    qidLookupCache.set(qid, null);
    return null;
  }

  const links = data.entities?.[qid]?.sitelinks ?? {};
  for (const site of sites) {
    const link = links[site];
    if (!link?.title) continue;
    const lang = site.replace(/wiki$/, "");
    const summary = await fetchOne(link.title, lang, signal);
    if (summary) {
      qidLookupCache.set(qid, summary);
      return summary;
    }
  }
  qidLookupCache.set(qid, null);
  return null;
}
