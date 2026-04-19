(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/basemaps.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASEMAPS",
    ()=>BASEMAPS,
    "DEFAULT_BASEMAP_ID",
    ()=>DEFAULT_BASEMAP_ID
]);
const EOX_ATTRIB = '<a href="https://s2maps.eu" target="_blank" rel="noreferrer">Sentinel-2 cloudless</a> by <a href="https://eox.at" target="_blank" rel="noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data)';
const CARTO_ATTRIB = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';
const BASEMAPS = [
    {
        id: "s2cloudless-2024",
        label: "Sentinel-2 · 2024",
        kind: "raster",
        url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
        maxzoom: 15,
        attribution: `${EOX_ATTRIB} 2024`
    },
    {
        id: "s2cloudless-2023",
        label: "Sentinel-2 · 2023",
        kind: "raster",
        url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg",
        maxzoom: 15,
        attribution: `${EOX_ATTRIB} 2023`
    },
    {
        id: "terrain",
        label: "Terrain",
        kind: "raster",
        url: "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg",
        maxzoom: 12,
        attribution: EOX_ATTRIB
    },
    {
        id: "streets-dark",
        label: "Streets · dark",
        kind: "style",
        url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        maxzoom: 19,
        attribution: CARTO_ATTRIB
    },
    {
        id: "streets-light",
        label: "Streets · light",
        kind: "style",
        url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        maxzoom: 19,
        attribution: CARTO_ATTRIB
    }
];
const DEFAULT_BASEMAP_ID = "s2cloudless-2024";
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/sentinel/evalscript.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TRUE_COLOR_LEAST_CC_EVALSCRIPT",
    ()=>TRUE_COLOR_LEAST_CC_EVALSCRIPT
]);
const TRUE_COLOR_LEAST_CC_EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B02", "B03", "B04"] }],
    output: { bands: 3, sampleType: "AUTO" },
    mosaicking: "SIMPLE"
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
`;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/sentinel/process.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchFrame",
    ()=>fetchFrame
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/endpoints.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$evalscript$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/evalscript.ts [app-client] (ecmascript)");
;
;
async function fetchFrame(params) {
    const { bbox, from, to, width, height, accessToken, evalscript } = params;
    const body = {
        input: {
            bounds: {
                bbox,
                properties: {
                    crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
                }
            },
            data: [
                {
                    type: "sentinel-2-l2a",
                    dataFilter: {
                        timeRange: {
                            from,
                            to
                        },
                        mosaickingOrder: "leastCC"
                    }
                }
            ]
        },
        output: {
            width,
            height,
            responses: [
                {
                    identifier: "default",
                    format: {
                        type: "image/png"
                    }
                }
            ]
        },
        evalscript: evalscript ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$evalscript$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TRUE_COLOR_LEAST_CC_EVALSCRIPT"]
    };
    const res = await fetch(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CDSE_PROCESS_URL"], {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            Accept: "image/png"
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text().catch(()=>"");
        throw new Error(`Process API failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.blob();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/sentinel/latest-overlay.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchLatestOverlay",
    ()=>fetchLatestOverlay,
    "pickFetchResolution",
    ()=>pickFetchResolution
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$process$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/process.ts [app-client] (ecmascript)");
;
const EARTH_RADIUS_M = 6378137;
function bboxMeters(bbox) {
    const [west, south, east, north] = bbox;
    const latMid = (north + south) / 2 * (Math.PI / 180);
    const wm = (east - west) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(latMid);
    const hm = (north - south) * (Math.PI / 180) * EARTH_RADIUS_M;
    return {
        wm: Math.abs(wm),
        hm: Math.abs(hm)
    };
}
function pickFetchResolution(bbox, maxPixelsPerSide = 2048) {
    const { wm, hm } = bboxMeters(bbox);
    const longestMeters = Math.max(wm, hm);
    const shortestMeters = Math.min(wm, hm);
    const aspect = wm / hm;
    const pixelsLongestAt10m = longestMeters / 10;
    const longest = Math.min(maxPixelsPerSide, Math.max(256, Math.round(pixelsLongestAt10m)));
    const shortest = Math.max(256, Math.round(longest * shortestMeters / longestMeters));
    return aspect >= 1 ? {
        width: longest,
        height: shortest
    } : {
        width: shortest,
        height: longest
    };
}
async function fetchLatestOverlay({ bbox, accessToken, daysBack = 14, maxPixelsPerSide = 2048 }) {
    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const fromIso = from.toISOString();
    const toIso = now.toISOString();
    const { width, height } = pickFetchResolution(bbox, maxPixelsPerSide);
    const blob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$process$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchFrame"])({
        bbox,
        from: fromIso,
        to: toIso,
        width,
        height,
        accessToken
    });
    return {
        blob,
        from: fromIso,
        to: toIso,
        bbox,
        width,
        height
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Map.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LiveMap",
    ()=>LiveMap
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/maplibre-gl/dist/maplibre-gl.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/basemaps.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$latest$2d$overlay$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/latest-overlay.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const OVERLAY_SOURCE_ID = "latest-overlay";
const OVERLAY_LAYER_ID = "latest-overlay-layer";
const MIN_FETCH_ZOOM = 8;
function rasterStyle(basemap) {
    return {
        version: 8,
        sources: {
            base: {
                type: "raster",
                tiles: [
                    basemap.url
                ],
                tileSize: basemap.tileSize ?? 256,
                attribution: basemap.attribution,
                maxzoom: basemap.maxzoom ?? 18
            }
        },
        layers: [
            {
                id: "base",
                type: "raster",
                source: "base"
            }
        ]
    };
}
function applyBasemap(map, basemap) {
    if (basemap.kind === "raster") {
        map.setStyle(rasterStyle(basemap));
    } else {
        map.setStyle(basemap.url);
    }
}
function addOverlay(map, url, bbox, opacity) {
    const [west, south, east, north] = bbox;
    const coordinates = [
        [
            west,
            north
        ],
        [
            east,
            north
        ],
        [
            east,
            south
        ],
        [
            west,
            south
        ]
    ];
    if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
    if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
    map.addSource(OVERLAY_SOURCE_ID, {
        type: "image",
        url,
        coordinates
    });
    map.addLayer({
        id: OVERLAY_LAYER_ID,
        type: "raster",
        source: OVERLAY_SOURCE_ID,
        paint: {
            "raster-opacity": opacity,
            "raster-fade-duration": 0
        }
    });
}
function removeOverlay(map) {
    if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
    if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
}
function LiveMap({ credentials }) {
    _s();
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [active, setActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_BASEMAP_ID"]);
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        center: [
            6.775,
            51.2277
        ],
        zoom: 12
    });
    const [projection, setProjection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("mercator");
    const [overlay, setOverlay] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [fetchState, setFetchState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        kind: "idle"
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if (!containerRef.current || mapRef.current) return;
            const initial = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].find({
                "LiveMap.useEffect": (b)=>b.id === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_BASEMAP_ID"]
            }["LiveMap.useEffect"]) ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"][0];
            const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Map({
                container: containerRef.current,
                style: initial.kind === "raster" ? rasterStyle(initial) : initial.url,
                center: view.center,
                zoom: view.zoom,
                minZoom: 2,
                maxZoom: 18,
                attributionControl: {
                    compact: true
                },
                hash: true
            });
            mapRef.current = map;
            map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].NavigationControl({
                showCompass: true
            }), "top-right");
            map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScaleControl"]({
                maxWidth: 120,
                unit: "metric"
            }), "bottom-left");
            map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].FullscreenControl(), "top-right");
            map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].GeolocateControl({
                trackUserLocation: false
            }), "top-right");
            map.on("moveend", {
                "LiveMap.useEffect": ()=>{
                    const c = map.getCenter();
                    setView({
                        center: [
                            c.lng,
                            c.lat
                        ],
                        zoom: map.getZoom()
                    });
                }
            }["LiveMap.useEffect"]);
            const resizeObserver = new ResizeObserver({
                "LiveMap.useEffect": ()=>map.resize()
            }["LiveMap.useEffect"]);
            resizeObserver.observe(containerRef.current);
            return ({
                "LiveMap.useEffect": ()=>{
                    resizeObserver.disconnect();
                    map.remove();
                    mapRef.current = null;
                }
            })["LiveMap.useEffect"];
        }
    }["LiveMap.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map) return;
            const basemap = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].find({
                "LiveMap.useEffect.basemap": (b)=>b.id === active
            }["LiveMap.useEffect.basemap"]);
            if (!basemap) return;
            applyBasemap(map, basemap);
            const reapply = {
                "LiveMap.useEffect.reapply": ()=>{
                    map.setProjection({
                        type: projection
                    });
                    if (overlay) addOverlay(map, overlay.url, overlay.bbox, overlay.opacity);
                }
            }["LiveMap.useEffect.reapply"];
            if (map.isStyleLoaded()) {
                setTimeout(reapply, 0);
            } else {
                map.once("load", reapply);
            }
        }
    }["LiveMap.useEffect"], [
        active
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map) return;
            const apply = {
                "LiveMap.useEffect.apply": ()=>map.setProjection({
                        type: projection
                    })
            }["LiveMap.useEffect.apply"];
            if (map.isStyleLoaded()) apply();
            else map.once("load", apply);
        }
    }["LiveMap.useEffect"], [
        projection
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map || !overlay) return;
            if (map.getLayer(OVERLAY_LAYER_ID)) {
                map.setPaintProperty(OVERLAY_LAYER_ID, "raster-opacity", overlay.opacity);
            }
        }
    }["LiveMap.useEffect"], [
        overlay?.opacity
    ]);
    const handleFetchLatest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "LiveMap.useCallback[handleFetchLatest]": async ()=>{
            const map = mapRef.current;
            if (!map || !credentials) return;
            if (map.getZoom() < MIN_FETCH_ZOOM) {
                setFetchState({
                    kind: "error",
                    message: `Zoom in to at least z${MIN_FETCH_ZOOM} before fetching`
                });
                return;
            }
            setFetchState({
                kind: "loading"
            });
            try {
                const bounds = map.getBounds();
                const bbox = [
                    bounds.getWest(),
                    bounds.getSouth(),
                    bounds.getEast(),
                    bounds.getNorth()
                ];
                const token = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccessToken"])(credentials);
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$latest$2d$overlay$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchLatestOverlay"])({
                    bbox,
                    accessToken: token,
                    daysBack: 14,
                    maxPixelsPerSide: 2048
                });
                const url = URL.createObjectURL(result.blob);
                setOverlay({
                    "LiveMap.useCallback[handleFetchLatest]": (prev)=>{
                        if (prev) URL.revokeObjectURL(prev.url);
                        return {
                            url,
                            bbox: result.bbox,
                            from: result.from,
                            to: result.to,
                            opacity: 1
                        };
                    }
                }["LiveMap.useCallback[handleFetchLatest]"]);
                addOverlay(map, url, result.bbox, 1);
                setFetchState({
                    kind: "idle"
                });
            } catch (err) {
                setFetchState({
                    kind: "error",
                    message: err instanceof Error ? err.message : String(err)
                });
            }
        }
    }["LiveMap.useCallback[handleFetchLatest]"], [
        credentials
    ]);
    function handleClearOverlay() {
        const map = mapRef.current;
        if (!map) return;
        removeOverlay(map);
        setOverlay((prev)=>{
            if (prev) URL.revokeObjectURL(prev.url);
            return null;
        });
        setFetchState({
            kind: "idle"
        });
    }
    function handleOpacityChange(opacity) {
        setOverlay((prev)=>prev ? {
                ...prev,
                opacity
            } : prev);
    }
    function handleGeocodeSelect(result) {
        const map = mapRef.current;
        if (!map) return;
        if (result.extent) {
            const [west, north, east, south] = result.extent;
            map.fitBounds([
                [
                    west,
                    south
                ],
                [
                    east,
                    north
                ]
            ], {
                padding: 60,
                duration: 900,
                maxZoom: 15
            });
        } else {
            const cat = result.category;
            let zoom = 14;
            if (cat === "city" || cat === "town") zoom = 12;
            else if (cat === "village" || cat === "suburb") zoom = 13;
            else if (cat === "country") zoom = 5;
            else if (cat === "state" || cat === "region") zoom = 7;
            else if (cat === "house" || cat === "building") zoom = 17;
            map.flyTo({
                center: result.coordinates,
                zoom,
                duration: 900
            });
        }
    }
    const activeBm = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].find((b)=>b.id === active);
    const canFetch = credentials !== null && view.zoom >= MIN_FETCH_ZOOM;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative h-full w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: containerRef,
                className: "h-full w-full"
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 260,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-auto rounded-xl border border-neutral-700 bg-neutral-900/85 p-2 text-xs text-neutral-200 shadow-xl backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500",
                                children: "Basemap"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 264,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col gap-1",
                                children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].map((b)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>setActive(b.id),
                                        className: `rounded-lg px-2.5 py-1.5 text-left transition-colors ${active === b.id ? "bg-sky-500/20 text-sky-200 ring-1 ring-inset ring-sky-500/50" : "text-neutral-300 hover:bg-neutral-800"}`,
                                        children: b.label
                                    }, b.id, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 269,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 267,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 263,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-auto flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/85 px-2 py-1.5 font-mono text-[11px] text-neutral-400 shadow backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: [
                                    view.center[1].toFixed(4),
                                    "°, ",
                                    view.center[0].toFixed(4),
                                    "° · z",
                                    view.zoom.toFixed(1)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 286,
                                columnNumber: 11
                            }, this),
                            activeBm?.maxzoom != null && view.zoom > activeBm.maxzoom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-amber-400",
                                children: "(upsampled)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 291,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mx-1 h-3 w-px bg-neutral-700",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 293,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectionToggle, {
                                active: projection,
                                onChange: setProjection
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 294,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 285,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-auto flex flex-col items-stretch gap-2 rounded-xl border border-neutral-700 bg-neutral-900/85 p-2 text-xs shadow-xl backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500",
                                children: "Latest imagery"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 301,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: handleFetchLatest,
                                disabled: !canFetch || fetchState.kind === "loading",
                                className: "rounded-lg bg-sky-500 px-3 py-1.5 font-medium text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400",
                                children: fetchState.kind === "loading" ? "Fetching…" : overlay ? "Refresh overlay" : "Fetch for this view"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 304,
                                columnNumber: 11
                            }, this),
                            !credentials && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[180px] text-[11px] text-neutral-400",
                                children: "Add credentials in the header to enable live fetches."
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 317,
                                columnNumber: 13
                            }, this),
                            credentials && view.zoom < MIN_FETCH_ZOOM && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[180px] text-[11px] text-amber-400",
                                children: [
                                    "Zoom in to z",
                                    MIN_FETCH_ZOOM,
                                    " or closer"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 322,
                                columnNumber: 13
                            }, this),
                            fetchState.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[220px] break-words text-[11px] text-red-400",
                                children: fetchState.message
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 327,
                                columnNumber: 13
                            }, this),
                            overlay && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2 pt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] uppercase text-neutral-500",
                                                children: "Opacity"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Map.tsx",
                                                lineNumber: 334,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "range",
                                                min: 0,
                                                max: 1,
                                                step: 0.05,
                                                value: overlay.opacity,
                                                onChange: (e)=>handleOpacityChange(Number(e.target.value)),
                                                className: "w-24 accent-sky-400"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/Map.tsx",
                                                lineNumber: 335,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "w-8 text-right text-[10px] text-neutral-400",
                                                children: [
                                                    Math.round(overlay.opacity * 100),
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/Map.tsx",
                                                lineNumber: 344,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 333,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-[10px] text-neutral-500",
                                        children: "last 14 days · live data"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 348,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: handleClearOverlay,
                                        className: "rounded-lg border border-neutral-700 px-3 py-1 text-neutral-300 hover:bg-neutral-800",
                                        children: "Clear overlay"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 349,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 300,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 262,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 259,
        columnNumber: 5
    }, this);
}
_s(LiveMap, "KrPcRWmKZsWRw/wcVOZr6l+ijNY=");
_c = LiveMap;
function ProjectionToggle({ active, onChange }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex overflow-hidden rounded-md border border-neutral-700",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>onChange("mercator"),
                title: "Flat (Mercator)",
                "aria-label": "Flat projection",
                className: `flex h-5 w-5 items-center justify-center transition-colors ${active === "mercator" ? "bg-sky-500/25 text-sky-200" : "text-neutral-400 hover:text-neutral-200"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    viewBox: "0 0 16 16",
                    className: "h-3 w-3",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: "2",
                            y: "3.5",
                            width: "12",
                            height: "9",
                            rx: "1"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 385,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2 8h12M6 3.5v9M10 3.5v9"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 386,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 384,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 373,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>onChange("globe"),
                title: "Globe (sphere)",
                "aria-label": "Globe projection",
                className: `flex h-5 w-5 items-center justify-center transition-colors ${active === "globe" ? "bg-sky-500/25 text-sky-200" : "text-neutral-400 hover:text-neutral-200"}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    viewBox: "0 0 16 16",
                    className: "h-3 w-3",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: "8",
                            cy: "8",
                            r: "5.5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 401,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: "8",
                            cy: "8",
                            rx: "2.5",
                            ry: "5.5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 402,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2.5 8h11"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 403,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 400,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 389,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 372,
        columnNumber: 5
    }, this);
}
_c1 = ProjectionToggle;
var _c, _c1;
__turbopack_context__.k.register(_c, "LiveMap");
__turbopack_context__.k.register(_c1, "ProjectionToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Map.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/Map.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_0dlj7id._.js.map