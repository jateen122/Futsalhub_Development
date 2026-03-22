import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FavoriteButton from "../components/FavoriteButton";
import GroundMap from "../components/GroundMap";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (t) => {
  if (!t) return "—";
  const h    = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function GroundDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [ground,   setGround]  = useState(null);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then(r => r.json())
      .then(data => {
        const list  = data.results || data || [];
        const found = list.find(g => String(g.id) === String(id));
        setGround(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4 pt-20">
        <div>
          <p className="text-5xl mb-4">⚽</p>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Ground not found</h2>
          <button onClick={() => navigate("/grounds")}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition mt-3 text-sm">
            Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;

  const facilitiesList = ground.facilities
    ? ground.facilities.split(",").map(f => f.trim()).filter(Boolean)
    : [];

  const hasLocation = ground.latitude != null && ground.longitude != null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 text-sm">
        <button onClick={() => navigate("/grounds")}
          className="text-gray-400 hover:text-gray-700 transition font-medium">Grounds</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold truncate">{ground.name}</span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-7">

          {/* ── LEFT column: image + map ── */}
          <div className="col-span-12 lg:col-span-5 space-y-5">

            {/* Image */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
              {imgSrc
                ? <img src={imgSrc} alt={ground.name} className="w-full h-72 object-cover" />
                : <div className="w-full h-72 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-8xl">⚽</div>}
            </div>

            {/* Map section */}
            {hasLocation && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location on Map</p>
                    <p className="text-gray-600 text-sm mt-0.5">📍 {ground.location}</p>
                  </div>
                  <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2.5 py-1 rounded font-bold">
                    📌 Pinned
                  </span>
                </div>
                <GroundMap
                  lat={ground.latitude}
                  lng={ground.longitude}
                  name={ground.name}
                  location={ground.location}
                  height="240px"
                />
              </div>
            )}

            {/* No location fallback */}
            {!hasLocation && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Location</p>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
                  <p className="text-3xl mb-2">📍</p>
                  <p className="text-gray-600 font-semibold text-sm">{ground.location}</p>
                  <p className="text-gray-400 text-xs mt-1">Exact map location not available</p>
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(ground.location + " Nepal")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition"
                  >
                    🗺️ Search on Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT column: details ── */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">

              {/* Title row */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-gray-900 leading-tight">{ground.name}</h1>
                  <p className="text-gray-500 text-sm mt-1">📍 {ground.location}</p>
                  {/* size + type badges */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {ground.ground_size && (
                      <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded">
                        ⚽ {ground.ground_size}v{ground.ground_size}
                      </span>
                    )}
                    {ground.ground_type && (
                      <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded capitalize">
                        {ground.ground_type === "indoor" ? "🏠" : "☀️"} {ground.ground_type}
                      </span>
                    )}
                    {hasLocation && (
                      <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded">
                        📌 Mapped
                      </span>
                    )}
                  </div>
                </div>
                {/* price + favorite */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FavoriteButton groundId={ground.id} size="md" />
                  <div className="text-right">
                    <p className="text-green-600 font-black text-xl">Rs {ground.price_per_hour}</p>
                    <p className="text-gray-400 text-xs">per hour</p>
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  ["🕐 Opens",  toLabel(ground.opening_time)],
                  ["🕕 Closes", toLabel(ground.closing_time)],
                  ["👤 Owner",  ground.owner || "—"],
                  ["💰 Price",  `Rs ${ground.price_per_hour} / hr`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-gray-400 text-xs font-semibold mb-1">{k}</p>
                    <p className="text-gray-800 font-semibold text-sm">{v}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {ground.description && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">About</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{ground.description}</p>
                </div>
              )}

              {/* Facilities */}
              {facilitiesList.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Facilities</p>
                  <div className="flex flex-wrap gap-2">
                    {facilitiesList.map(f => (
                      <span key={f} className="px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium capitalize">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick directions row (if location available) */}
              {hasLocation && (
                <div className="flex gap-2 mb-4">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ground.latitude},${ground.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-100 transition"
                  >
                    🗺️ Get Directions
                  </a>
                  <a
                    href={`https://www.google.com/maps?q=${ground.latitude},${ground.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-100 transition"
                  >
                    📌 View on Map
                  </a>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3">
                <button onClick={() => navigate(`/book/${ground.id}`)}
                  className="flex-1 py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition shadow-sm text-sm">
                  ⚽ Book This Ground
                </button>
                <button onClick={() => navigate("/grounds")}
                  className="px-5 py-3.5 bg-gray-100 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition text-sm">
                  ← Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
