/*! coi-serviceworker (custom build, based on v0.1.7 by Guido Zuidhof, MIT)
 *
 * Difference from upstream:
 *   - Cross-origin requests are passed through to the browser without
 *     re-fetching them inside the service worker. Re-wrapping a
 *     cross-origin response (especially POSTs that need CORS preflight)
 *     was failing with "Failed to fetch" / "Failed to convert value to
 *     'Response'" — visible as 100+ red errors when Overpass was queried.
 *     COEP/COOP only applies to resources loaded into THIS document, so
 *     bypassing cross-origin in the SW is correct.
 *   - Defaults to credentialless COEP. Page stays crossOriginIsolated,
 *     SharedArrayBuffer / FFmpeg keep working, and external APIs without
 *     CORP headers are not blocked.
 */

let coepCredentialless = true;

if (typeof window === "undefined") {
  // ── Service worker context ────────────────────────────────────────────
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) =>
    event.waitUntil(self.clients.claim()),
  );
  self.addEventListener("message", (event) => {
    if (!event.data) return;
    if (event.data.type === "deregister") {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => {
          clients.forEach((c) => c.navigate(c.url));
        });
    } else if (event.data.type === "coepCredentialless") {
      coepCredentialless = event.data.value;
    }
  });
  self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (
      request.cache === "only-if-cached" &&
      request.mode !== "same-origin"
    ) {
      return;
    }
    // Bypass cross-origin requests — they don't need COEP/COOP rewriting,
    // and re-fetching POST/CORS requests inside the SW is fragile.
    let url;
    try {
      url = new URL(request.url);
    } catch {
      return;
    }
    if (url.origin !== self.location.origin) return;

    const r =
      coepCredentialless && request.mode === "no-cors"
        ? new Request(request, { credentials: "omit" })
        : request;

    event.respondWith(
      fetch(r)
        .then((response) => {
          if (response.status === 0) return response;
          const newHeaders = new Headers(response.headers);
          newHeaders.set(
            "Cross-Origin-Embedder-Policy",
            coepCredentialless ? "credentialless" : "require-corp",
          );
          if (!coepCredentialless) {
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
          }
          newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((err) => {
          console.error(err);
          return Response.error();
        }),
    );
  });
} else {
  // ── Page context (registers the SW + sends config) ────────────────────
  (() => {
    const config = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      coepCredentialless: () => true,
      doReload: () => window.location.reload(),
      quiet: false,
      ...window.coi,
    };
    const nav = navigator;

    if (nav.serviceWorker && nav.serviceWorker.controller) {
      nav.serviceWorker.controller.postMessage({
        type: "coepCredentialless",
        value: config.coepCredentialless(),
      });
      if (config.shouldDeregister()) {
        nav.serviceWorker.controller.postMessage({ type: "deregister" });
      }
    }

    if (window.crossOriginIsolated === false && config.shouldRegister()) {
      if (window.isSecureContext) {
        nav.serviceWorker
          ?.register(window.document.currentScript.src)
          .then(
            (reg) => {
              if (!config.quiet) {
                console.log("COOP/COEP Service Worker registered", reg.scope);
              }
              reg.addEventListener("updatefound", () => {
                if (!config.quiet) {
                  console.log("Reloading page for updated COOP/COEP SW.");
                }
                config.doReload();
              });
              if (reg.active && !nav.serviceWorker.controller) {
                if (!config.quiet) {
                  console.log("Reloading page for COOP/COEP SW.");
                }
                config.doReload();
              }
            },
            (err) => {
              if (!config.quiet) {
                console.error(
                  "COOP/COEP Service Worker failed to register:",
                  err,
                );
              }
            },
          );
      } else if (!config.quiet) {
        console.log(
          "COOP/COEP Service Worker not registered, a secure context is required.",
        );
      }
    }
  })();
}
