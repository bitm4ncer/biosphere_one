export interface LatLng {
  lat: number;
  lon: number;
}

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** e.g. "station", "halt", "tram_stop" */
  kind: string;
  /** `ref` tag, useful as a label when name is missing */
  ref?: string;
  tags: Record<string, string>;
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
