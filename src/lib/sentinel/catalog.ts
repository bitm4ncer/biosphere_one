import type { Bbox } from "@/types/sentinel";
import { CDSE_CATALOG_SEARCH_URL } from "./endpoints";

export interface Snapshot {
  id: string;
  datetime: string;
  cloudCover: number | null;
}

interface SearchParams {
  bbox: Bbox;
  from: string;
  to: string;
  accessToken: string;
  maxCloudCover?: number;
  limit?: number;
}

interface CatalogFeature {
  id: string;
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
  };
}

interface CatalogResponse {
  features: CatalogFeature[];
  context?: { next?: number };
}

export async function searchCatalog({
  bbox,
  from,
  to,
  accessToken,
  maxCloudCover = 60,
  limit = 100,
}: SearchParams): Promise<Snapshot[]> {
  const body = {
    bbox,
    datetime: `${from}/${to}`,
    collections: ["sentinel-2-l2a"],
    limit,
    filter:
      maxCloudCover != null
        ? {
            op: "<=",
            args: [{ property: "eo:cloud_cover" }, maxCloudCover],
          }
        : undefined,
    "filter-lang": maxCloudCover != null ? "cql2-json" : undefined,
  };

  const res = await fetch(CDSE_CATALOG_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/geo+json, application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Catalog search: ${res.status} ${res.statusText} ${text}`);
  }

  const data = (await res.json()) as CatalogResponse;
  const seen = new Map<string, Snapshot>();
  for (const f of data.features) {
    const day = f.properties.datetime.slice(0, 10);
    const cc = f.properties["eo:cloud_cover"] ?? null;
    const prev = seen.get(day);
    if (!prev || (cc != null && (prev.cloudCover == null || cc < prev.cloudCover))) {
      seen.set(day, {
        id: f.id,
        datetime: f.properties.datetime,
        cloudCover: cc,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
}
