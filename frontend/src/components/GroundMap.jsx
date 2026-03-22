/**
 * GroundMap.jsx
 *
 * Read-only map showing a ground's pin + directions button.
 * Used in GroundDetail and GroundDetail-like views.
 *
 * Props:
 *   lat        {number|string}
 *   lng        {number|string}
 *   name       {string}        — ground name shown in popup
 *   location   {string}        — address text shown below map
 *   height     {string}        — default "260px"
 */

import { useEffect, useRef, useState } from "react";

let _leafletReady = false;
let _callbacks = [];

function loadLeaflet(cb) {
  if (typeof window === "undefined") return;
  if (window.L) { cb(window.L); return; }
  if (_leafletReady) { _callbacks.push(cb); return; }
  _callbacks.push(cb);

  const link = document.createElement("link");
  link.rel   = "stylesheet";
  link.href  = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
  document.head.appendChild(link);

  const script   = document.createElement("script");
  script.src     = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
  script.onload  = () => {
    _leafletReady = true;
    _callbacks.forEach(fn => fn(window.L));
    _callbacks = [];
  };
  document.head.appendChild(script);
}

export default function GroundMap({ lat, lng, name = "Ground", location = "", height = "260px" }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const hasCoords = lat != null && lng != null
    && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  useEffect(() => {
    if (!hasCoords) return;

    loadLeaflet((L) => {
      if (!containerRef.current || mapRef.current) return;

      const pos = [parseFloat(lat), parseFloat(lng)];
      const map = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
      }).setView(pos, 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom green futsal pin
      const pinIcon = L.divIcon({
        html: `
          <div style="position:relative;width:40px;height:48px;">
            <div style="
              width:36px;height:36px;background:#16a34a;border:3px solid white;
              border-radius:50% 50% 50% 0;transform:rotate(-45deg);
              box-shadow:0 3px 10px rgba(0,0,0,0.3);
              position:absolute;top:0;left:2px;
            "></div>
            <div style="
              position:absolute;top:6px;left:10px;
              font-size:14px;transform:rotate(45deg);
            ">⚽</div>
          </div>
        `,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -50],
        className: "",
      });

      const marker = L.marker(pos, { icon: pinIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:system-ui;padding:4px 2px;min-width:140px;">
          <p style="font-weight:800;font-size:14px;margin:0 0 4px;color:#111;">${name}</p>
          <p style="font-size:12px;color:#666;margin:0;">📍 ${location}</p>
        </div>
      `).openPopup();

      mapRef.current = map;
      setLoaded(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng]);

  const googleMapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : null;

  const openStreetUrl = hasCoords
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${lat},${lng}`
    : null;

  if (!hasCoords) return null;

  return (
    <div className="space-y-3">
      {/* map */}
      <div
        className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {!loaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-7 h-7 rounded-full border-[3px] border-green-500 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-xs">Loading map…</p>
            </div>
          </div>
        )}
      </div>

      {/* directions row */}
      <div className="flex gap-2">
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl text-sm hover:bg-blue-100 transition"
        >
          <span>🗺️</span> Google Maps
        </a>
        <a
          href={openStreetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 text-green-700 font-bold rounded-xl text-sm hover:bg-green-100 transition"
        >
          <span>🧭</span> OpenStreetMap
        </a>
        <button
          type="button"
          onClick={() => {
            const text = `${name}\n${location}\nhttps://www.google.com/maps?q=${lat},${lng}`;
            navigator.clipboard?.writeText(text).then(() => {
              alert("Location copied to clipboard!");
            });
          }}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-100 transition"
          title="Copy location"
        >
          📋
        </button>
      </div>
    </div>
  );
}
