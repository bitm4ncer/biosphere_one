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
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
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
async function applyBasemap(map, basemap) {
    if (basemap.kind === "raster") {
        map.setStyle(rasterStyle(basemap));
        return;
    }
    map.setStyle(basemap.url);
}
function LiveMap() {
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
                "LiveMap.useEffect": ()=>{
                    map.resize();
                }
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
        }
    }["LiveMap.useEffect"], [
        active
    ]);
    const activeBm = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].find((b)=>b.id === active);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative h-full w-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: containerRef,
                className: "h-full w-full"
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 97,
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
                                lineNumber: 101,
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
                                        lineNumber: 106,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 104,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 100,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-auto rounded-lg border border-neutral-700 bg-neutral-900/85 px-3 py-1.5 font-mono text-[11px] text-neutral-400 shadow backdrop-blur",
                        children: [
                            view.center[1].toFixed(4),
                            "°, ",
                            view.center[0].toFixed(4),
                            "° · z",
                            view.zoom.toFixed(1),
                            activeBm?.maxzoom != null && view.zoom > activeBm.maxzoom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "ml-2 text-amber-400",
                                children: "(upsampled)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 125,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 122,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 96,
        columnNumber: 5
    }, this);
}
_s(LiveMap, "NUf2uUYVDXtm1RLFcsm615aad3g=");
_c = LiveMap;
var _c;
__turbopack_context__.k.register(_c, "LiveMap");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Map.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/Map.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_0vjpu1z._.js.map