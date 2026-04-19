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
const GIBS_ATTRIB = '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a>';
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
        id: "night",
        label: "Night · Black Marble",
        kind: "raster",
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
        maxzoom: 8,
        attribution: `${GIBS_ATTRIB} · VIIRS Black Marble (2016)`
    },
    {
        id: "terrain",
        label: "Terrain",
        kind: "raster",
        url: "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg",
        maxzoom: 11,
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
"[project]/src/lib/settings.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSettings",
    ()=>useSettings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/basemaps.ts [app-client] (ecmascript)");
"use client";
;
;
;
const useSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persist"])((set)=>({
        basemapId: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_BASEMAP_ID"],
        projection: "mercator",
        weatherOn: false,
        weatherOpacity: 0.8,
        setBasemapId: (id)=>set({
                basemapId: id
            }),
        setProjection: (p)=>set({
                projection: p
            }),
        setWeatherOn: (on)=>set({
                weatherOn: on
            }),
        setWeatherOpacity: (o)=>set({
                weatherOpacity: o
            })
    }), {
    name: "biosphere1:settings",
    version: 2,
    storage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createJSONStorage"])(()=>localStorage),
    partialize: (state)=>({
            basemapId: state.basemapId,
            projection: state.projection,
            weatherOn: state.weatherOn,
            weatherOpacity: state.weatherOpacity
        }),
    migrate: (persisted, _version)=>{
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted;
        delete p.weatherMode;
        return p;
    }
}));
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
"[project]/src/lib/gibs.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "gibsDateNDaysAgo",
    ()=>gibsDateNDaysAgo,
    "gibsTileUrl",
    ()=>gibsTileUrl,
    "gibsYesterday",
    ()=>gibsYesterday
]);
function gibsTileUrl({ layer, date, level = 9 }) {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.jpg`;
}
function gibsYesterday() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}
function gibsDateNDaysAgo(n) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    return d.toISOString().slice(0, 10);
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/maplibre-gl/dist/maplibre-gl.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/basemaps.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/settings.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$sentinel$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/sentinel/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/SearchBox.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gibs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/gibs.ts [app-client] (ecmascript)");
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
;
const CLOUDS_DAYS_BACK = 7;
const CLOUDS_ANIM_INTERVAL_MS = 900;
const CLOUDS_COMPOSITE_LAYERS = [
    "VIIRS_SNPP_CorrectedReflectance_TrueColor"
];
const OVERLAY_SOURCE_ID = "timeline-overlay";
const OVERLAY_LAYER_ID = "timeline-overlay-layer";
const SECTOR_SOURCE_ID = "timeline-sector";
const SECTOR_LAYER_ID = "timeline-sector-outline";
const TIMELINE_DAYS_BACK = 365;
const WEATHER_SOURCE_ID = "weather";
const WEATHER_LAYER_ID = "weather-layer";
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
const WEATHER_MAXZOOM = 7;
function ensureWeatherLayer(map, urls, opacity) {
    if (map.getLayer(WEATHER_LAYER_ID)) return;
    if (map.getSource(WEATHER_SOURCE_ID)) map.removeSource(WEATHER_SOURCE_ID);
    map.addSource(WEATHER_SOURCE_ID, {
        type: "raster",
        tiles: urls,
        tileSize: 256,
        maxzoom: WEATHER_MAXZOOM,
        attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a>'
    });
    map.addLayer({
        id: WEATHER_LAYER_ID,
        type: "raster",
        source: WEATHER_SOURCE_ID,
        maxzoom: 8,
        paint: {
            "raster-opacity": opacity,
            "raster-fade-duration": 0
        }
    });
}
function updateWeatherTiles(map, urls) {
    const source = map.getSource(WEATHER_SOURCE_ID);
    if (source?.setTiles) source.setTiles(urls);
}
function updateWeatherOpacity(map, opacity) {
    if (map.getLayer(WEATHER_LAYER_ID)) {
        map.setPaintProperty(WEATHER_LAYER_ID, "raster-opacity", opacity);
    }
}
function removeWeatherLayer(map) {
    if (map.getLayer(WEATHER_LAYER_ID)) map.removeLayer(WEATHER_LAYER_ID);
    if (map.getSource(WEATHER_SOURCE_ID)) map.removeSource(WEATHER_SOURCE_ID);
}
function bboxCoordinates(bbox) {
    const [west, south, east, north] = bbox;
    return [
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
}
function setOverlay(map, url, bbox, opacity) {
    const coords = bboxCoordinates(bbox);
    if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
    if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
    map.addSource(OVERLAY_SOURCE_ID, {
        type: "image",
        url,
        coordinates: coords
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
function setSectorOutline(map, bbox) {
    const [west, south, east, north] = bbox;
    const ring = [
        [
            west,
            south
        ],
        [
            east,
            south
        ],
        [
            east,
            north
        ],
        [
            west,
            north
        ],
        [
            west,
            south
        ]
    ];
    const geojson = {
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: ring
        },
        properties: {}
    };
    const existing = map.getSource(SECTOR_SOURCE_ID);
    if (existing?.setData) {
        existing.setData(geojson);
        return;
    }
    map.addSource(SECTOR_SOURCE_ID, {
        type: "geojson",
        data: geojson
    });
    map.addLayer({
        id: SECTOR_LAYER_ID,
        type: "line",
        source: SECTOR_SOURCE_ID,
        paint: {
            "line-color": "#ffffff",
            "line-width": 2,
            "line-opacity": 0.9
        }
    });
}
function removeSectorOutline(map) {
    if (map.getLayer(SECTOR_LAYER_ID)) map.removeLayer(SECTOR_LAYER_ID);
    if (map.getSource(SECTOR_SOURCE_ID)) map.removeSource(SECTOR_SOURCE_ID);
}
function LiveMap({ credentials }) {
    _s();
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const { basemapId: active, projection, weatherOn, weatherOpacity, setBasemapId: setActive, setProjection, setWeatherOn, setWeatherOpacity } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettings"])();
    const [view, setView] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        center: [
            6.775,
            51.2277
        ],
        zoom: 12
    });
    const [sector, setSector] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [snapshots, setSnapshots] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [snapshotIndex, setSnapshotIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(-1);
    const [overlayUrl, setOverlayUrl] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [overlayOpacity, setOverlayOpacity] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [timelineState, setTimelineState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        kind: "idle"
    });
    const [weatherFrameIndex, setWeatherFrameIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(CLOUDS_DAYS_BACK - 1);
    const [weatherPlaying, setWeatherPlaying] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [weatherLoading, setWeatherLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if (!containerRef.current || mapRef.current) return;
            const initial = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$basemaps$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASEMAPS"].find({
                "LiveMap.useEffect": (b)=>b.id === active
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
            map.once("load", {
                "LiveMap.useEffect": ()=>map.setProjection({
                        type: projection
                    })
            }["LiveMap.useEffect"]);
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
            map.on("error", {
                "LiveMap.useEffect": (e)=>{
                    const msg = e?.error?.message ?? "";
                    if (msg.includes("Failed to fetch") || msg.includes("AJAXError") || msg.includes("reading 'signal'") || msg.includes("aborted")) {
                        return;
                    }
                    console.warn("[map]", e.error);
                }
            }["LiveMap.useEffect"]);
            if ("TURBOPACK compile-time truthy", 1) {
                window.__map = map;
            }
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
                    if (sector) setSectorOutline(map, sector);
                    if (overlayUrl && sector) setOverlay(map, overlayUrl, sector, overlayOpacity);
                }
            }["LiveMap.useEffect.reapply"];
            if (map.isStyleLoaded()) {
                setTimeout(reapply, 0);
            } else {
                map.once("load", reapply);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["LiveMap.useEffect"], [
        active
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map) return;
            const apply = {
                "LiveMap.useEffect.apply": ()=>{
                    try {
                        map.setProjection({
                            type: projection
                        });
                    } catch  {
                    // style not yet loaded
                    }
                }
            }["LiveMap.useEffect.apply"];
            apply();
            map.on("style.load", apply);
            return ({
                "LiveMap.useEffect": ()=>{
                    map.off("style.load", apply);
                }
            })["LiveMap.useEffect"];
        }
    }["LiveMap.useEffect"], [
        projection
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map) return;
            if (map.getLayer(OVERLAY_LAYER_ID)) {
                map.setPaintProperty(OVERLAY_LAYER_ID, "raster-opacity", overlayOpacity);
            }
        }
    }["LiveMap.useEffect"], [
        overlayOpacity
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if (!weatherOn) {
                const map = mapRef.current;
                if (map) removeWeatherLayer(map);
                setWeatherLoading(false);
            }
        }
    }["LiveMap.useEffect"], [
        weatherOn
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map || !weatherOn) return;
            const onSourceData = {
                "LiveMap.useEffect.onSourceData": (e)=>{
                    if (e.sourceId !== WEATHER_SOURCE_ID) return;
                    const src = map.getSource(WEATHER_SOURCE_ID);
                    if (!src) return;
                    setWeatherLoading(!map.isSourceLoaded(WEATHER_SOURCE_ID));
                }
            }["LiveMap.useEffect.onSourceData"];
            map.on("sourcedata", onSourceData);
            map.on("sourcedataloading", onSourceData);
            return ({
                "LiveMap.useEffect": ()=>{
                    map.off("sourcedata", onSourceData);
                    map.off("sourcedataloading", onSourceData);
                }
            })["LiveMap.useEffect"];
        }
    }["LiveMap.useEffect"], [
        weatherOn
    ]);
    const weatherFrames = (()=>{
        const all = [];
        for(let i = CLOUDS_DAYS_BACK; i >= 1; i -= 1){
            const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gibs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gibsDateNDaysAgo"])(i);
            all.push({
                time: Date.parse(date) / 1000,
                date,
                urls: CLOUDS_COMPOSITE_LAYERS.map((layer)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$gibs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gibsTileUrl"])({
                        layer,
                        date
                    }))
            });
        }
        return all;
    })();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            if (!weatherOn || !weatherPlaying || weatherFrames.length === 0) return;
            const id = setInterval({
                "LiveMap.useEffect.id": ()=>{
                    setWeatherFrameIndex({
                        "LiveMap.useEffect.id": (i)=>(i + 1) % weatherFrames.length
                    }["LiveMap.useEffect.id"]);
                }
            }["LiveMap.useEffect.id"], CLOUDS_ANIM_INTERVAL_MS);
            return ({
                "LiveMap.useEffect": ()=>clearInterval(id)
            })["LiveMap.useEffect"];
        }
    }["LiveMap.useEffect"], [
        weatherOn,
        weatherPlaying,
        weatherFrames.length
    ]);
    const currentWeatherUrls = weatherFrames[weatherFrameIndex]?.urls;
    const weatherUrlsKey = currentWeatherUrls?.join("|") ?? "";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map || !weatherOn || !currentWeatherUrls) return;
            const apply = {
                "LiveMap.useEffect.apply": ()=>{
                    ensureWeatherLayer(map, currentWeatherUrls, weatherOpacity);
                    updateWeatherTiles(map, currentWeatherUrls);
                }
            }["LiveMap.useEffect.apply"];
            if (map.isStyleLoaded()) {
                apply();
            } else {
                map.once("style.load", apply);
            }
            map.on("style.load", apply);
            return ({
                "LiveMap.useEffect": ()=>map.off("style.load", apply)
            })["LiveMap.useEffect"];
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["LiveMap.useEffect"], [
        weatherOn,
        active,
        weatherUrlsKey
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "LiveMap.useEffect": ()=>{
            const map = mapRef.current;
            if (!map || !weatherOn) return;
            updateWeatherOpacity(map, weatherOpacity);
        }
    }["LiveMap.useEffect"], [
        weatherOn,
        weatherOpacity
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
                const result = await fetchLatestOverlay({
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
                lineNumber: 472,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$SearchBox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SearchBox"], {
                        onSelect: handleGeocodeSelect
                    }, void 0, false, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 475,
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
                                lineNumber: 478,
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
                                        lineNumber: 483,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 481,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 477,
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
                                lineNumber: 500,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mx-1 h-3 w-px bg-neutral-700",
                                "aria-hidden": true
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 504,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectionToggle, {
                                active: projection,
                                onChange: setProjection
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 505,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 499,
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
                                lineNumber: 512,
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
                                lineNumber: 515,
                                columnNumber: 11
                            }, this),
                            !credentials && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[180px] text-[11px] text-neutral-400",
                                children: "Add credentials in the header to enable live fetches."
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 528,
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
                                lineNumber: 533,
                                columnNumber: 13
                            }, this),
                            fetchState.kind === "error" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "max-w-[220px] break-words text-[11px] text-red-400",
                                children: fetchState.message
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 538,
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
                                                lineNumber: 545,
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
                                                lineNumber: 546,
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
                                                lineNumber: 555,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 544,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-[10px] text-neutral-500",
                                        children: "last 14 days · live data"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 559,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: handleClearOverlay,
                                        className: "rounded-lg border border-neutral-700 px-3 py-1 text-neutral-300 hover:bg-neutral-800",
                                        children: "Clear overlay"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 560,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 511,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(WeatherPanel, {
                        enabled: weatherOn,
                        onToggle: setWeatherOn,
                        frames: weatherFrames,
                        frameIndex: weatherFrameIndex,
                        onFrameIndex: setWeatherFrameIndex,
                        isPlaying: weatherPlaying,
                        onPlayingChange: setWeatherPlaying,
                        opacity: weatherOpacity,
                        onOpacityChange: setWeatherOpacity,
                        loading: weatherLoading
                    }, void 0, false, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 571,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 474,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 471,
        columnNumber: 5
    }, this);
}
_s(LiveMap, "/XwVv4SdUoihF57X/nBN6UHmATQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$settings$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSettings"]
    ];
});
_c = LiveMap;
function WeatherPanel({ enabled, onToggle, frames, frameIndex, onFrameIndex, isPlaying, onPlayingChange, opacity, onOpacityChange, loading }) {
    const currentFrame = frames[frameIndex];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "pointer-events-auto flex flex-col items-stretch gap-2 rounded-xl border border-neutral-700 bg-neutral-900/85 p-2 text-xs shadow-xl backdrop-blur",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500",
                        children: [
                            "Clouds",
                            loading && enabled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400",
                                "aria-label": "Loading tiles"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 621,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 618,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(PillToggle, {
                        enabled: enabled,
                        onToggle: ()=>onToggle(!enabled)
                    }, void 0, false, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 624,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 617,
                columnNumber: 7
            }, this),
            enabled && frames.length > 0 && currentFrame && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                onClick: ()=>onPlayingChange(!isPlaying),
                                className: "flex h-6 w-6 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800",
                                "aria-label": isPlaying ? "Pause" : "Play",
                                children: isPlaying ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    viewBox: "0 0 10 10",
                                    className: "h-2.5 w-2.5",
                                    fill: "currentColor",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                            x: "1.5",
                                            y: "1",
                                            width: "2",
                                            height: "8"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Map.tsx",
                                            lineNumber: 638,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                            x: "6.5",
                                            y: "1",
                                            width: "2",
                                            height: "8"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/Map.tsx",
                                            lineNumber: 639,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/Map.tsx",
                                    lineNumber: 637,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    viewBox: "0 0 10 10",
                                    className: "h-2.5 w-2.5",
                                    fill: "currentColor",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M2 1 L9 5 L2 9 Z"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/Map.tsx",
                                        lineNumber: 643,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/Map.tsx",
                                    lineNumber: 642,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 630,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: 0,
                                max: frames.length - 1,
                                step: 1,
                                value: frameIndex,
                                onChange: (e)=>{
                                    onPlayingChange(false);
                                    onFrameIndex(Number(e.target.value));
                                },
                                className: "flex-1 accent-sky-400"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 647,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 629,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between text-[10px]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-neutral-400",
                                children: new Date(currentFrame.time * 1000).toLocaleDateString([], {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric"
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 662,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-neutral-500",
                                children: [
                                    frameIndex + 1,
                                    "/",
                                    frames.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 669,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 661,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] uppercase text-neutral-500",
                                children: "Opacity"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 675,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: 0,
                                max: 1,
                                step: 0.05,
                                value: opacity,
                                onChange: (e)=>onOpacityChange(Number(e.target.value)),
                                className: "w-24 accent-sky-400"
                            }, void 0, false, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 676,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-8 text-right text-[10px] text-neutral-400",
                                children: [
                                    Math.round(opacity * 100),
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/Map.tsx",
                                lineNumber: 685,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 674,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-[10px] text-neutral-500",
                        children: "NASA GIBS · VIIRS SNPP true-color · daily"
                    }, void 0, false, {
                        fileName: "[project]/src/components/Map.tsx",
                        lineNumber: 690,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 616,
        columnNumber: 5
    }, this);
}
_c1 = WeatherPanel;
function PillToggle({ enabled, onToggle }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        type: "button",
        onClick: onToggle,
        className: `relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-sky-500" : "bg-neutral-700"}`,
        "aria-label": "Toggle weather",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] ${enabled ? "left-[18px]" : "left-0.5"}`
        }, void 0, false, {
            fileName: "[project]/src/components/Map.tsx",
            lineNumber: 713,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 707,
        columnNumber: 5
    }, this);
}
_c2 = PillToggle;
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
                            lineNumber: 743,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2 8h12M6 3.5v9M10 3.5v9"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 744,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 742,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 731,
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
                            lineNumber: 759,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: "8",
                            cy: "8",
                            rx: "2.5",
                            ry: "5.5"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 760,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M2.5 8h11"
                        }, void 0, false, {
                            fileName: "[project]/src/components/Map.tsx",
                            lineNumber: 761,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/Map.tsx",
                    lineNumber: 758,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/Map.tsx",
                lineNumber: 747,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/Map.tsx",
        lineNumber: 730,
        columnNumber: 5
    }, this);
}
_c3 = ProjectionToggle;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "LiveMap");
__turbopack_context__.k.register(_c1, "WeatherPanel");
__turbopack_context__.k.register(_c2, "PillToggle");
__turbopack_context__.k.register(_c3, "ProjectionToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/Map.tsx [app-client] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/Map.tsx [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_0imk82r._.js.map