import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biosphere1",
    short_name: "Biosphere1",
    description:
      "Live satellite imagery with weather radar. Sentinel-2 cloudless basemap, latest-available overlay on demand, real-time precipitation.",
    start_url: ".",
    scope: ".",
    display: "standalone",
    orientation: "any",
    background_color: "#080a06",
    theme_color: "#080a06",
    icons: [
      {
        src: "favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
    ],
  };
}
