import type { RouteCandidate, Waypoint } from "./types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function routeToGpx(
  candidate: RouteCandidate,
  opts: { name?: string; waypoints?: Waypoint[] } = {},
): string {
  const trkName = esc(opts.name ?? "Hiking route");
  const points = candidate.coordinates
    .map(([lon, lat, ele]) => {
      const eleTag = ele != null ? `<ele>${ele.toFixed(1)}</ele>` : "";
      return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">${eleTag}</trkpt>`;
    })
    .join("\n");

  const wpts = (opts.waypoints ?? [])
    .map(
      (w, i) =>
        `  <wpt lat="${w.lat.toFixed(6)}" lon="${w.lon.toFixed(6)}"><name>${i + 1}. ${esc(w.label)}</name></wpt>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="biosphere1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${trkName}</name>
    <desc>${candidate.distanceKm.toFixed(1)} km · ${Math.round(candidate.durationMin)} min · +${Math.round(candidate.ascentM)} m</desc>
  </metadata>
${wpts}
  <trk>
    <name>${trkName}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpx(filename: string, body: string): void {
  const blob = new Blob([body], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
