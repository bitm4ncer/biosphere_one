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
        src: "icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
