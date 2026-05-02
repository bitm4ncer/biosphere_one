import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BiosphereOne",
  description:
    "Live satellite imagery with weather radar. Sentinel-2 cloudless basemap, latest-available overlay on demand, real-time precipitation — all client-side.",
  applicationName: "BiosphereOne",
  appleWebApp: {
    capable: true,
    title: "BiosphereOne",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#080a06",
  width: "device-width",
  initialScale: 1,
  // Disable browser-level pinch zoom of the page itself; MapLibre handles
  // its own pinch-zoom on the map element. Without this, two-finger gestures
  // sometimes zoom the page chrome instead of the map on iOS Safari.
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
