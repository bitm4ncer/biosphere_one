# Biosphere1

Client-side live satellite map. Sentinel-2 cloudless basemap, NASA Black Marble night view, daily global cloud overlay, viewport-locked timeline over all available Sentinel-2 snapshots — all running in the browser, no backend.

## Features

- **Basemaps:** Sentinel-2 cloudless (2024, 2023), Black Marble night lights, EOX Terrain, Carto Streets (dark/light)
- **Flat / Globe projection** toggle (MapLibre 5 native)
- **Search** any place or address (Photon / OSM)
- **Live weather clouds** — NASA GIBS VIIRS SNPP true-color, 7-day scrubber
- **Timeline** — lock a sector, query the Copernicus catalog for every available Sentinel-2 scene in the last 12 months, navigate via calendar dots coloured by cloud cover
- **Persistent state** — basemap, projection, weather toggle/opacity saved to localStorage; view position in URL hash
- **Bring-your-own credentials** — Copernicus Data Space OAuth client, stored only in your browser

## Stack

- Next.js 16 with static export, React 19
- Tailwind 4
- MapLibre GL JS 5
- Zustand (settings persistence)
- Tile sources: EOX Maps, NASA GIBS, CARTO, Copernicus Data Space Sentinel Hub

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Getting Copernicus credentials

1. Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu)
2. Dashboard → User Settings → OAuth clients → **Create**
3. Type: **Single-Page Application**, Flow: **Client Credentials**, Web origins: allow all
4. Copy the Client ID + Secret shown once and paste them into the app's credentials modal

The free tier includes 30 000 Processing Units/month, which covers many Timeline sessions.

## Deploy

Pushing to `main` triggers the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). The build runs `next build` with `NEXT_PUBLIC_BASE_PATH=/biosphere1`, outputs a static export to `out/`, and deploys to GitHub Pages.

Enable Pages in the repo: **Settings → Pages → Source: GitHub Actions**.

### Live Location

The pulsing-dot live location (geolocate button in the bottom-left map controls) requires a **secure context** — HTTPS or `localhost`. When hit over a plain-HTTP LAN IP (like `192.168.x.x:3000`), browsers disable `navigator.geolocation` and the geolocate button shows a "Location not available" tooltip. This is a browser security policy, not an application bug. Use `npm run dev` on `localhost`, or deploy to HTTPS (GitHub Pages) for device testing.

On iOS, compass heading requires an additional permission prompt triggered by the same user tap that grants location access. If the compass prompt is denied, the pulsing dot still renders without the directional cone.
