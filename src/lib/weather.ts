export interface RadarFrame {
  time: number;
  path: string;
}

export interface WeatherMaps {
  host: string;
  radarPast: RadarFrame[];
  radarNowcast: RadarFrame[];
  satelliteInfrared: RadarFrame[];
}

const WEATHER_MAPS_URL = "https://api.rainviewer.com/public/weather-maps.json";

export async function fetchWeatherMaps(signal?: AbortSignal): Promise<WeatherMaps> {
  const res = await fetch(WEATHER_MAPS_URL, { signal });
  if (!res.ok) throw new Error(`RainViewer API: ${res.status}`);
  const data = await res.json();
  return {
    host: data.host,
    radarPast: data.radar?.past ?? [],
    radarNowcast: data.radar?.nowcast ?? [],
    satelliteInfrared: data.satellite?.infrared ?? [],
  };
}

export type RadarColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface RadarTileOptions {
  host: string;
  path: string;
  size?: 256 | 512;
  color?: RadarColor;
  smooth?: 0 | 1;
  snow?: 0 | 1;
}

export function radarTileUrl({
  host,
  path,
  size = 256,
  color = 2,
  smooth = 1,
  snow = 1,
}: RadarTileOptions): string {
  return `${host}${path}/${size}/{z}/{x}/{y}/${color}/${smooth}_${snow}.png`;
}

export function satelliteTileUrl({ host, path, size = 256 }: RadarTileOptions): string {
  return `${host}${path}/${size}/{z}/{x}/{y}/0/0_0.png`;
}
