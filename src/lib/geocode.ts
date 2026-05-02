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
  options: {
    limit?: number;
    signal?: AbortSignal;
    /** [lng, lat] — bias results toward this point (e.g., the current
     * map centre) so nearby supermarkets / cafés / attractions outrank
     * far-away string matches. */
    nearby?: [number, number];
    /** 0…1, higher = stronger proximity preference. Default 0.7. */
    locationBiasScale?: number;
    /** Preferred language for results (e.g., 'de', 'en'). */
    lang?: string;
  } = {},
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    limit: String(options.limit ?? 6),
  });
  if (options.nearby) {
    const [lng, lat] = options.nearby;
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      params.set("lon", String(lng));
      params.set("lat", String(lat));
      params.set(
        "location_bias_scale",
        String(options.locationBiasScale ?? 0.7),
      );
    }
  }
  if (options.lang) params.set("lang", options.lang);

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

/** Pretty-print Photon's OSM value/key as a human-readable category badge. */
export function prettyCategory(category?: string): string | null {
  if (!category) return null;
  const map: Record<string, string> = {
    supermarket: "Supermarket",
    convenience: "Convenience",
    bakery: "Bakery",
    butcher: "Butcher",
    restaurant: "Restaurant",
    cafe: "Café",
    bar: "Bar",
    pub: "Pub",
    fast_food: "Fast food",
    fuel: "Gas station",
    parking: "Parking",
    pharmacy: "Pharmacy",
    hospital: "Hospital",
    bank: "Bank",
    atm: "ATM",
    post_office: "Post",
    hotel: "Hotel",
    hostel: "Hostel",
    guest_house: "Guesthouse",
    attraction: "Attraction",
    viewpoint: "Viewpoint",
    museum: "Museum",
    castle: "Castle",
    monument: "Monument",
    park: "Park",
    playground: "Playground",
    information: "Info",
    train_station: "Station",
    bus_stop: "Bus stop",
    station: "Station",
    peak: "Peak",
    waterfall: "Waterfall",
    spring: "Spring",
    beach: "Beach",
    place_of_worship: "Worship",
    school: "School",
    university: "University",
    library: "Library",
    cinema: "Cinema",
    theatre: "Theatre",
    house: "House",
    apartments: "Apartments",
    residential: "Residential",
    city: "City",
    town: "Town",
    village: "Village",
    suburb: "Suburb",
    hamlet: "Hamlet",
    state: "State",
    country: "Country",
  };
  if (map[category]) return map[category];
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
