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
"[project]/src/lib/geocode.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "geocode",
    ()=>geocode
]);
const PHOTON_URL = "https://photon.komoot.io/api/";
function buildLabel(p) {
    const parts = [];
    if (p.name) parts.push(p.name);
    if (p.housenumber && p.street && !p.name?.includes(p.street)) {
        parts.push(`${p.street} ${p.housenumber}`);
    } else if (p.street && !p.name?.includes(p.street)) {
        parts.push(p.street);
    }
    const place = p.city ?? p.district ?? p.state;
    if (place && !parts.includes(place)) parts.push(place);
    if (p.country && p.country !== place) parts.push(p.country);
    return parts.filter(Boolean).join(", ");
}
async function geocode(query, options = {}) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const params = new URLSearchParams({
        q: trimmed,
        limit: String(options.limit ?? 6)
    });
    const res = await fetch(`${PHOTON_URL}?${params}`, {
        signal: options.signal,
        headers: {
            Accept: "application/json"
        }
    });
    if (!res.ok) throw new Error(`Geocoder error: ${res.status}`);
    const data = await res.json();
    return data.features.map((f, i)=>{
        const p = f.properties;
        const coordinates = f.geometry.coordinates;
        const id = `${p.osm_type ?? "?"}-${p.osm_id ?? i}`;
        const label = buildLabel(p);
        return {
            id,
            name: p.name ?? label.split(",")[0] ?? "",
            label,
            coordinates,
            extent: p.extent,
            type: p.type,
            category: p.osm_value ?? p.osm_key
        };
    });
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/SearchBox.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SearchBox",
    ()=>SearchBox
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$geocode$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/geocode.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function SearchBox({ onSelect }) {
    _s();
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        kind: "idle"
    });
    const [focused, setFocused] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [highlight, setHighlight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const abortRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const boxRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SearchBox.useEffect": ()=>{
            if (query.trim().length < 2) {
                setState({
                    kind: "idle"
                });
                abortRef.current?.abort();
                return;
            }
            const timer = setTimeout({
                "SearchBox.useEffect.timer": async ()=>{
                    abortRef.current?.abort();
                    const ctrl = new AbortController();
                    abortRef.current = ctrl;
                    setState({
                        kind: "loading"
                    });
                    try {
                        const results = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$geocode$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["geocode"])(query, {
                            signal: ctrl.signal,
                            limit: 6
                        });
                        if (!ctrl.signal.aborted) {
                            setState({
                                kind: "ok",
                                results
                            });
                            setHighlight(0);
                        }
                    } catch (err) {
                        if (ctrl.signal.aborted) return;
                        setState({
                            kind: "error",
                            message: err instanceof Error ? err.message : String(err)
                        });
                    }
                }
            }["SearchBox.useEffect.timer"], 300);
            return ({
                "SearchBox.useEffect": ()=>clearTimeout(timer)
            })["SearchBox.useEffect"];
        }
    }["SearchBox.useEffect"], [
        query
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SearchBox.useEffect": ()=>{
            function handleClickOutside(e) {
                if (!boxRef.current?.contains(e.target)) setFocused(false);
            }
            document.addEventListener("mousedown", handleClickOutside);
            return ({
                "SearchBox.useEffect": ()=>document.removeEventListener("mousedown", handleClickOutside)
            })["SearchBox.useEffect"];
        }
    }["SearchBox.useEffect"], []);
    function choose(r) {
        onSelect(r);
        setQuery(r.label || r.name);
        setFocused(false);
    }
    function handleKey(e) {
        if (state.kind !== "ok" || !state.results.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h)=>Math.min(h + 1, state.results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h)=>Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            choose(state.results[highlight]);
        } else if (e.key === "Escape") {
            setFocused(false);
        }
    }
    const showDropdown = focused && query.trim().length >= 2 && (state.kind === "loading" || state.kind === "ok" || state.kind === "error");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: boxRef,
        className: "pointer-events-auto w-64 rounded-xl border border-neutral-700 bg-neutral-900/85 text-xs shadow-xl backdrop-blur",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 px-2.5 py-1.5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        viewBox: "0 0 16 16",
                        className: "h-3.5 w-3.5 shrink-0 text-neutral-500",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "1.5",
                        strokeLinecap: "round",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: "7",
                                cy: "7",
                                r: "4.5"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBox.tsx",
                                lineNumber: 103,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "m10.5 10.5 3 3"
                            }, void 0, false, {
                                fileName: "[project]/src/components/SearchBox.tsx",
                                lineNumber: 104,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 95,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "text",
                        value: query,
                        onChange: (e)=>setQuery(e.target.value),
                        onFocus: ()=>setFocused(true),
                        onKeyDown: handleKey,
                        placeholder: "Search places, streets, POIs",
                        className: "w-full bg-transparent text-neutral-100 placeholder:text-neutral-500 focus:outline-none",
                        spellCheck: false,
                        autoComplete: "off"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this),
                    query && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>{
                            setQuery("");
                            setState({
                                kind: "idle"
                            });
                        },
                        className: "text-neutral-500 hover:text-neutral-200",
                        "aria-label": "Clear",
                        children: "✕"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 118,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/SearchBox.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            showDropdown && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-t border-neutral-800",
                children: [
                    state.kind === "loading" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 py-2 text-neutral-500",
                        children: "Searching…"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 135,
                        columnNumber: 13
                    }, this),
                    state.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 py-2 text-red-400",
                        children: state.message
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 138,
                        columnNumber: 13
                    }, this),
                    state.kind === "ok" && state.results.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 py-2 text-neutral-500",
                        children: "No matches"
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 141,
                        columnNumber: 13
                    }, this),
                    state.kind === "ok" && state.results.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "max-h-72 overflow-y-auto",
                        children: state.results.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>choose(r),
                                    onMouseEnter: ()=>setHighlight(i),
                                    className: `block w-full px-3 py-1.5 text-left transition-colors ${highlight === i ? "bg-sky-500/20 text-sky-100" : "text-neutral-200 hover:bg-neutral-800"}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "truncate font-medium",
                                            children: r.name || r.label
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/SearchBox.tsx",
                                            lineNumber: 157,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "truncate text-[10px] text-neutral-500",
                                            children: [
                                                r.label.replace(r.name ? `${r.name}, ` : "", "") || "—",
                                                r.category && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-1.5 rounded bg-neutral-800 px-1 py-0.5 text-neutral-400",
                                                    children: r.category
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/SearchBox.tsx",
                                                    lineNumber: 161,
                                                    columnNumber: 25
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/SearchBox.tsx",
                                            lineNumber: 158,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/SearchBox.tsx",
                                    lineNumber: 147,
                                    columnNumber: 19
                                }, this)
                            }, r.id, false, {
                                fileName: "[project]/src/components/SearchBox.tsx",
                                lineNumber: 146,
                                columnNumber: 17
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/SearchBox.tsx",
                        lineNumber: 144,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/SearchBox.tsx",
                lineNumber: 133,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/SearchBox.tsx",
        lineNumber: 90,
        columnNumber: 5
    }, this);
}
_s(SearchBox, "4EUnEwtnIDlhB1Q5YB2fAtLGbqk=");
_c = SearchBox;
var _c;
__turbopack_context__.k.register(_c, "SearchBox");
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SearchBox.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const OVERLAY_SOURCE_ID = "latest-overlay";
const OVERLAY_LAYER_ID = "latest-overlay-layer";
const RADAR_SOURCE_ID = "weather-radar";
const RADAR_LAYER_ID = "weather-radar-layer";
const MIN_FETCH_ZOOM = 8;
const ANIM_INTERVAL_MS = 500;
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
function addRadarLayer(map, tileUrl, opacity) {
    if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
    if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
    map.addSource(RADAR_SOURCE_ID, {
        type: "raster",
        tiles: [
            tileUrl
        ],
        tileSize: 256,
        attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a>'
    });
    map.addLayer({
        id: RADAR_LAYER_ID,
        type: "raster",
        source: RADAR_SOURCE_ID,
        paint: {
            "raster-opacity": opacity,
            "raster-fade-duration": 0
        }
    });
}
function removeRadarLayer(map) {
    if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
    if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);
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
    const [weatherOn, setWeatherOn] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [weatherMaps, setWeatherMaps] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [radarFrameIndex, setRadarFrameIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [radarPlaying, setRadarPlaying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [radarOpacity, setRadarOpacity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0.8);
    const [weatherError, setWeatherError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
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
                lineNumber: 292,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SearchBox"], {
                        onSelect: handleGeocodeSelect
                    }, void 0, false, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 295,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-auto rounded-xl border border-neutral-700 bg-neutral-900/85 p-2 text-xs text-neutral-200 shadow-xl backdrop-blur",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500",
                                children: "Basemap"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 298,
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
                                        lineNumber: 303,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 301,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 297,
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
                                lineNumber: 320,
                                columnNumber: 11
                            }, this),
                            activeBm?.maxzoom != null && view.zoom > activeBm.maxzoom && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-amber-400",
                                children: "(upsampled)"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 325,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mx-1 h-3 w-px bg-neutral-700",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 327,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectionToggle, {
                                active: projection,
                                onChange: setProjection
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 328,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 319,
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
                                lineNumber: 335,
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
                                lineNumber: 338,
                                columnNumber: 11
                            }, this),
                            !credentials && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[180px] text-[11px] text-neutral-400",
                                children: "Add credentials in the header to enable live fetches."
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 351,
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
                                lineNumber: 356,
                                columnNumber: 13
                            }, this),
                            fetchState.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[220px] break-words text-[11px] text-red-400",
                                children: fetchState.message
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 361,
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
                                                lineNumber: 368,
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
                                                lineNumber: 369,
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
                                                lineNumber: 378,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 367,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-[10px] text-neutral-500",
                                        children: "last 14 days · live data"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 382,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: handleClearOverlay,
                                        className: "rounded-lg border border-neutral-700 px-3 py-1 text-neutral-300 hover:bg-neutral-800",
                                        children: "Clear overlay"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 383,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 334,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 294,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 291,
        columnNumber: 5
    }, this);
}
_s(LiveMap, "2zeKfJGMPBnCeYXGib4fCRDRbY8=");
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
                            lineNumber: 419,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2 8h12M6 3.5v9M10 3.5v9"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 420,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 418,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 407,
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
                            lineNumber: 435,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: "8",
                            cy: "8",
                            rx: "2.5",
                            ry: "5.5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 436,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2.5 8h11"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 437,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 434,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 423,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 406,
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

//# sourceMappingURL=src_0lew78c._.js.map