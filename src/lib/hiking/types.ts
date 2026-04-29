export interface LatLng {
  lat: number;
  lon: number;
}

/** A user-defined route point. Order in the list = traversal order. */
export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  /** Display label — place name, station name, or coords */
  label: string;
  /** Where the waypoint came from, used for the marker icon hint */
  source: "gps" | "search" | "station" | "longpress" | "manual";
}

/** Cached for station-tap-to-add when Rail→Lines is active. */
export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  ref?: string;
  tags: Record<string, string>;
}

export interface RouteCandidate {
  id: string;
  source: "brouter";
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
  | { kind: "routing" }
  | { kind: "routed" }
  | { kind: "error"; message: string };
