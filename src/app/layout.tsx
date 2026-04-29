import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Biosphere1 — Live Satellite Map",
  description:
    "Live satellite imagery with weather radar. Sentinel-2 cloudless basemap, latest-available overlay on demand, real-time precipitation — all client-side.",
  applicationName: "Biosphere1",
  appleWebApp: {
    capable: true,
    title: "Biosphere1",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#080a06",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Legacy iOS standalone-mode opt-in. Next.js' appleWebApp metadata only
          emits the modern `mobile-web-app-capable`; older iOS versions still
          look for the apple-prefixed name to launch the home-screen icon
          fullscreen instead of inside Safari chrome.
        */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/*
          Configure coi-serviceworker BEFORE it runs. `credentialless` mode
          tells the browser to strip credentials on cross-origin fetches
          instead of enforcing strict require-corp, so external APIs like
          Overpass that don't set CORP headers don't get blocked. The page
          stays crossOriginIsolated, so SharedArrayBuffer / FFmpeg keep
          working. Without this, Overpass POSTs failed with net::ERR_FAILED
          and the service worker rejected with "Failed to convert value to
          'Response'".
        */}
        <Script
          id="coi-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: "window.coi = { coepCredentialless: () => true };",
          }}
        />
        <Script src={`${basePath}/coi-serviceworker.js`} strategy="beforeInteractive" />
      </head>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
