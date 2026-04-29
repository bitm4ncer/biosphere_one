"use client";

/**
 * IndexedDB wrapper for the rail-network tile cache.
 *
 * Stores per-tile Overpass responses keyed by slippy-map coords ("z/x/y")
 * so subsequent visits to the same area render rails instantly from
 * disk, without hitting Overpass at all. Falls back to a no-op on
 * environments that don't expose IndexedDB (SSR, private mode in some
 * browsers) — callers should treat every operation as best-effort.
 *
 * Schema: one object store `tiles` with key=tile id and a `ts` index for
 * expiry. Bumping DB_VERSION drops the old store entirely so a schema
 * change never has to write a migration.
 */

const DB_NAME = "biosphere1-rail-tiles";
const DB_VERSION = 1;
const STORE = "tiles";
/** 14 days. Railways change rarely — long TTL is fine. */
const TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface StoredRailTile {
  key: string;
  ts: number;
  lines: GeoJSON.Feature<GeoJSON.LineString>[];
  stations: { id: string; name: string; lat: number; lon: number }[];
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Schema bumps drop the old store entirely — simpler than writing
      // per-version migrations for a cache that's safe to lose.
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }
      const s = db.createObjectStore(STORE, { keyPath: "key" });
      s.createIndex("ts", "ts");
    };
  });
  return dbPromise;
}

/**
 * Look up a cached tile. Returns null if missing, expired, or if the
 * IDB layer is unavailable for any reason.
 */
export async function railTileGet(
  key: string,
): Promise<StoredRailTile | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise<StoredRailTile | null>((resolve) => {
    let req: IDBRequest;
    try {
      const tx = db.transaction(STORE, "readonly");
      req = tx.objectStore(STORE).get(key);
    } catch {
      return resolve(null);
    }
    req.onsuccess = () => {
      const v = req.result as StoredRailTile | undefined;
      if (!v) return resolve(null);
      if (Date.now() - v.ts > TTL_MS) return resolve(null);
      resolve(v);
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Persist a tile. Best-effort — never throws or rejects.
 */
export async function railTileSet(
  key: string,
  data: {
    lines: GeoJSON.Feature<GeoJSON.LineString>[];
    stations: { id: string; name: string; lat: number; lon: number }[];
  },
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, ts: Date.now(), ...data });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Remove every tile older than the TTL. Run once on app start. */
export async function railTilePurgeExpired(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const cutoff = Date.now() - TTL_MS;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const idx = tx.objectStore(STORE).index("ts");
      const range = IDBKeyRange.upperBound(cutoff);
      const req = idx.openCursor(range);
      req.onsuccess = () => {
        const c = req.result as IDBCursorWithValue | null;
        if (!c) return;
        c.delete();
        c.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Wipe everything (debug / "clear cache" affordance). */
export async function railTileClear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}
