export interface GeocodeResult {
  id: string;
  name: string;
  label: string;
  coordinates: [number, number];
  extent?: [number, number, number, number];
  type?: string;
  category?: string;
}

const PHOTON_URL = "https://photon.komoot.io/api/";

interface PhotonFeature {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    type?: string;
    name?: string;
    country?: string;
    state?: string;
    city?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    extent?: [number, number, number, number];
  };
}

function buildLabel(p: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  if (p.housenumber && p.street && !p.name?.includes(p.street)) {
    parts.push(`${p.street} ${p.housenumber}`);
  } else if (p.street && !p.name?.includes(p.street)) {
    parts.push(p.street);
  }
  const place = p.city ?? p.district ?? p.state;
  if (place && !parts.includes(place)) parts.push(place);
  if (p.country && p.country !== place) parts.push(p.country);
  return parts.filter(Boolean).join(", ");
}

export async function geocode(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? 6),
  });

  const res = await fetch(`${PHOTON_URL}?${params}`, {
    signal: options.signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Geocoder error: ${res.status}`);

  const data = (await res.json()) as { features: PhotonFeature[] };
  return data.features.map((f, i) => {
    const p = f.properties;
    const coordinates = f.geometry.coordinates;
    const id = `${p.osm_type ?? "?"}-${p.osm_id ?? i}`;
    const label = buildLabel(p);
    return {
      id,
      name: p.name ?? label.split(",")[0] ?? "",
      label,
      coordinates,
      extent: p.extent,
      type: p.type,
      category: p.osm_value ?? p.osm_key,
    } satisfies GeocodeResult;
  });
}
