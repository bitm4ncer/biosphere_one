export interface LatLng {
  lat: number;
  lon: number;
}

export type StationTier =
  | "intercity"
  | "regional"
  | "sBahn"
  | "subway"
  | "tram"
  | "halt";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** e.g. "station", "halt", "tram_stop" */
  kind: string;
  /** Visual/semantic hierarchy derived from tags (rail network weight). */
  tier: StationTier;
  /** `ref` tag, useful as a label when name is missing */
  ref?: string;
  tags: Record<string, string>;
}

export type WaypointRole = "start" | "via" | "end";
export type WaypointSource = "station" | "map" | "search" | "gps";

export interface Waypoint {
  id: string;
  role: WaypointRole;
  lat: number;
  lon: number;
  label?: string;
  source: WaypointSource;
  /** For source=station, the station id this waypoint was picked from. */
  stationId?: string;
}

export interface RouteCandidate {
  id: string;
  source: "brouter" | "ors";
  profile: string;
  alternativeIdx: number;
  distanceKm: number;
  durationMin: number;
  ascentM: number;
  descentM: number;
  /** 0..1, null if not yet scored */
  greenRatio: number | null;
  /** [lon, lat, ele?] */
  coordinates: [number, number, number?][];
  messages?: string[];
}

export type HikingPhase =
  | { kind: "idle" }
  | { kind: "fetchingStations" }
  | { kind: "stations"; count: number }
  | { kind: "routing" }
  | { kind: "routed" }
  | { kind: "error"; message: string };

/**
 * A saved trip. Stores waypoints + filters + the selected candidate so the
 * trip can be restored offline without a re-route call.
 */
export interface SavedTripCandidate {
  coordinates: [number, number, number?][];
  distanceKm: number;
  durationMin: number;
  ascentM: number;
  descentM: number;
  greenRatio: number | null;
  source: "brouter" | "ors";
  profile: string;
}

export interface Trip {
  id: string;
  name: string;
  savedAt: number;
  waypoints: Waypoint[];
  profiles: string[];
  distanceRange: [number, number];
  greenMin: number;
  candidate?: SavedTripCandidate;
}
