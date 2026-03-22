/**
 * LocationPicker.jsx
 *
 * A self-contained map component for picking a GPS location.
 * Uses Leaflet + OpenStreetMap (no API key required).
 *
 * Props:
 *   lat        {number|null}  — current latitude
 *   lng        {number|null}  — current longitude
 *   onChange   {fn}           — called with { lat, lng } when pin moves
 *   height     {string}       — CSS height, default "320px"
 *   readOnly   {bool}         — if true, shows pin but no dragging/clicking
 */

import { useEffect, useRef, useState } from "react";

// Leaflet is loaded via CDN script tag injected once
let leafletReady = false;
let leafletCallbacks = [];

function loadLeaflet(cb) {
  if (typeof window === "undefined") return;
  if (window.L) { cb(window.L); return; }
  if (leafletReady) { leafletCallbacks.push(cb); return; }

  leafletCallbacks.push(cb);

  // CSS
  const link = document.createElement("link");
  link.rel  = "stylesheet";
  link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  document.head.appendChild(link);

  // JS
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  script.onload = () => {
    leafletReady = true;
    leafletCallbacks.forEach(fn => fn(window.L));
    leafletCallbacks = [];
  };
  document.head.appendChild(script);
}

// Default center: Kathmandu, Nepal
const DEFAULT_CENTER = [27.7172, 85.3240];
const DEFAULT_ZOOM   = 13;

export default function LocationPicker({
  lat,
  lng,
  onChange,
  height = "320px",
  readOnly = false,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery]   = useState("");
  const [error, setError]   = useState("");

  const hasPin = lat != null && lng != null;

  // ── init map ──────────────────────────────────────────────────
  useEffect(() => {
    loadLeaflet((L) => {
      if (!containerRef.current || mapRef.current) return;

      const center = hasPin ? [parseFloat(lat), parseFloat(lng)] : DEFAULT_CENTER;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(center, DEFAULT_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom pin icon
      const pinIcon = L.divIcon({
        html: `<div style="
          width:32px;height:32px;background:#22c55e;border:3px solid white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        className: "",
      });

      if (hasPin) {
        const marker = L.marker([parseFloat(lat), parseFloat(lng)], {
          icon: pinIcon,
          draggable: !readOnly,
        }).addTo(map);

        if (!readOnly) {
          marker.on("dragend", (e) => {
            const pos = e.target.getLatLng();
            onChange({ lat: pos.lat.toFixed(7), lng: pos.lng.toFixed(7) });
          });
        }
        markerRef.current = marker;
      }

      if (!readOnly) {
        map.on("click", (e) => {
          const { lat: clat, lng: clng } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([clat, clng]);
          } else {
            const marker = L.marker([clat, clng], {
              icon: pinIcon,
              draggable: true,
            }).addTo(map);
            marker.on("dragend", (ev) => {
              const pos = ev.target.getLatLng();
              onChange({ lat: pos.lat.toFixed(7), lng: pos.lng.toFixed(7) });
            });
            markerRef.current = marker;
          }
          onChange({ lat: clat.toFixed(7), lng: clng.toFixed(7) });
        });
      }

      mapRef.current = map;
      setLoaded(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // run once

  // ── update marker when lat/lng prop changes externally ───────
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    const pinIcon = L.divIcon({
      html: `<div style="
        width:32px;height:32px;background:#22c55e;border:3px solid white;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      className: "",
    });

    if (lat != null && lng != null) {
      const pos = [parseFloat(lat), parseFloat(lng)];
      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        const marker = L.marker(pos, { icon: pinIcon, draggable: !readOnly }).addTo(mapRef.current);
        if (!readOnly) {
          marker.on("dragend", (e) => {
            const p = e.target.getLatLng();
            onChange({ lat: p.lat.toFixed(7), lng: p.lng.toFixed(7) });
          });
        }
        markerRef.current = marker;
      }
      mapRef.current.panTo(pos);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng]);

  // ── geocode search ────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=np`;
      const res  = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data.length === 0) { setError("Location not found. Try a more specific name."); return; }
      const { lat: rlat, lon: rlon } = data[0];
      onChange({ lat: parseFloat(rlat).toFixed(7), lng: parseFloat(rlon).toFixed(7) });
      mapRef.current?.setView([parseFloat(rlat), parseFloat(rlon)], 16);
    } catch {
      setError("Search failed. Check your connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: mlat, longitude: mlng } = pos.coords;
        onChange({ lat: mlat.toFixed(7), lng: mlng.toFixed(7) });
        mapRef.current?.setView([mlat, mlng], 16);
      },
      () => setError("Could not get your location. Please allow location access.")
    );
  };

  return (
    <div className="space-y-2">
      {/* search bar — hidden in readOnly mode */}
      {!readOnly && (
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Search location in Nepal…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-200 transition"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex-shrink-0"
            >
              {searching ? "…" : "Search"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            title="Use my current location"
            className="px-3 py-2.5 bg-blue-50 border border-blue-200 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-100 transition flex-shrink-0"
          >
            📍 My Location
          </button>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">⚠ {error}</p>
      )}

      {/* map container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm"
           style={{ height }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* loading overlay */}
        {!loaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: "3px" }} />
              <p className="text-gray-500 text-xs">Loading map…</p>
            </div>
          </div>
        )}

        {/* instruction overlay — shown when no pin yet */}
        {loaded && !hasPin && !readOnly && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span>🖱️</span> Click anywhere on the map to drop a pin
            </div>
          </div>
        )}

        {/* no-location placeholder for readOnly with no pin */}
        {readOnly && !hasPin && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-3xl mb-1">📍</p>
              <p className="text-gray-400 text-sm">No location set</p>
            </div>
          </div>
        )}
      </div>

      {/* coordinate display */}
      {hasPin && (
        <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-green-500 font-black">✓</span>
          <span>
            <span className="font-semibold text-gray-700">Lat:</span> {parseFloat(lat).toFixed(5)}
            &nbsp;&nbsp;
            <span className="font-semibold text-gray-700">Lng:</span> {parseFloat(lng).toFixed(5)}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange({ lat: null, lng: null })}
              className="ml-auto text-red-400 hover:text-red-600 font-semibold transition"
            >
              Remove pin
            </button>
          )}
        </div>
      )}
    </div>
  );
}
