import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "../components/FavoriteButton";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (t) => {
  if (!t) return "";
  const h    = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function Grounds() {
  const navigate = useNavigate();

  const [grounds,   setGrounds]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);

  // ── filter state ──────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [minPrice,    setMinPrice]    = useState("");
  const [maxPrice,    setMaxPrice]    = useState("");
  const [facilities,  setFacilities]  = useState({
    parking: false, shower: false, wifi: false, restaurant: false,
  });
  const [groundSize,  setGroundSize]  = useState("");   // "" | "5" | "6" | "7"
  const [groundType,  setGroundType]  = useState("");   // "" | "indoor" | "outdoor"

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchGrounds = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search",      search.trim());
    if (minPrice)      params.set("min_price",   minPrice);
    if (maxPrice)      params.set("max_price",   maxPrice);
    if (groundSize)    params.set("ground_size", groundSize);
    if (groundType)    params.set("ground_type", groundType);

    const activeFacilities = Object.entries(facilities)
      .filter(([, v]) => v).map(([k]) => k);
    if (activeFacilities.length)
      params.set("facilities", activeFacilities.join(","));

    fetch(`${BASE_URL}/api/grounds/?${params}`)
      .then(r => r.json())
      .then(data => {
        const list = data.results || data || [];
        setGrounds(list);
        setTotal(list.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, minPrice, maxPrice, facilities, groundSize, groundType]);

  useEffect(() => { fetchGrounds(); }, [fetchGrounds]);

  const clearFilters = () => {
    setSearch(""); setMinPrice(""); setMaxPrice("");
    setGroundSize(""); setGroundType("");
    setFacilities({ parking: false, shower: false, wifi: false, restaurant: false });
  };

  const hasActiveFilters =
    search || minPrice || maxPrice || groundSize || groundType ||
    Object.values(facilities).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* ── top bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Browse Futsal Grounds</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading ? "Loading..." : `${total} ground${total !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {/* search bar */}
          <div className="flex flex-1 min-w-[280px] max-w-xl gap-2">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 transition"
            />
            <button onClick={fetchGrounds}
              className="px-5 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-7">

          {/* ── FILTER SIDEBAR ─────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-24">

              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-gray-800 text-base">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters}
                    className="text-xs text-red-500 font-semibold hover:text-red-700 transition">
                    Clear all
                  </button>
                )}
              </div>

              {/* Price range */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Price Range</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min (Rs)</label>
                    <input type="number" value={minPrice}
                      onChange={e => setMinPrice(e.target.value)} placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-500 transition" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Max (Rs)</label>
                    <input type="number" value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)} placeholder="5000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-green-500 transition" />
                  </div>
                </div>
              </div>

              {/* Ground Size */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ground Size</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {["", "5", "6", "7"].map(s => (
                    <button key={s} type="button"
                      onClick={() => setGroundSize(s === groundSize ? "" : s)}
                      className={`py-2 rounded-lg text-xs font-bold border transition
                        ${groundSize === s && s !== ""
                          ? "bg-green-500 text-white border-green-500"
                          : s === "" && groundSize === ""
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {s === "" ? "All" : `${s}v${s}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ground Type */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ground Type</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {["", "indoor", "outdoor"].map(t => (
                    <button key={t} type="button"
                      onClick={() => setGroundType(t === groundType ? "" : t)}
                      className={`py-2 rounded-lg text-xs font-bold border capitalize transition
                        ${groundType === t && t !== ""
                          ? "bg-green-500 text-white border-green-500"
                          : t === "" && groundType === ""
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {t === "" ? "All" : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Amenities</p>
                <div className="space-y-2.5">
                  {[
                    { key: "parking",    label: "🅿️ Parking"    },
                    { key: "shower",     label: "🚿 Shower"     },
                    { key: "wifi",       label: "📶 WiFi"       },
                    { key: "restaurant", label: "🍽️ Restaurant" },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setFacilities(p => ({ ...p, [key]: !p[key] }))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition
                          ${facilities[key]
                            ? "bg-green-500 border-green-500"
                            : "bg-white border-gray-300 group-hover:border-green-400"}`}>
                        {facilities[key] && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <span className="text-sm text-gray-600 font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={fetchGrounds}
                className="w-full py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition text-sm">
                Apply Filters
              </button>
            </div>
          </div>

          {/* ── GROUNDS GRID ───────────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-9">

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm">Loading grounds...</p>
                </div>
              </div>
            ) : grounds.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-6xl mb-4">🏟️</p>
                <h3 className="text-xl font-black text-gray-700 mb-2">No grounds found</h3>
                <p className="text-gray-400 text-sm mb-6">Try adjusting your filters</p>
                <button onClick={clearFilters}
                  className="px-6 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {grounds.map(ground => {
                  const imgSrc = ground.image
                    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
                    : null;
                  return (
                    <div key={ground.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200 group">

                      {/* image */}
                      <div className="relative h-44 overflow-hidden bg-gray-100">
                        {imgSrc
                          ? <img src={imgSrc} alt={ground.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                          : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-50 to-emerald-100">⚽</div>}

                        {/* price badge */}
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">
                          Rs {ground.price_per_hour}/hr
                        </div>

                        {/* favorite button */}
                        <div className="absolute top-3 right-3">
                          <FavoriteButton groundId={ground.id} size="sm" />
                        </div>

                        {/* size + type badges */}
                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                          {ground.ground_size && (
                            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg">
                              {ground.ground_size}v{ground.ground_size}
                            </span>
                          )}
                          {ground.ground_type && (
                            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg capitalize">
                              {ground.ground_type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* body */}
                      <div className="p-5">
                        <div className="mb-3">
                          <h3 className="font-black text-gray-900 text-base leading-tight truncate">{ground.name}</h3>
                          <p className="text-gray-500 text-xs mt-0.5">📍 {ground.location}</p>
                        </div>

                        {/* hours */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                          <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-medium">
                            🕐 {toLabel(ground.opening_time)}
                          </span>
                          <span>—</span>
                          <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-medium">
                            {toLabel(ground.closing_time)}
                          </span>
                        </div>

                        {/* description */}
                        {ground.description && (
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-4">
                            {ground.description}
                          </p>
                        )}

                        {/* actions */}
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/book/${ground.id}`)}
                            className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl text-xs hover:bg-green-600 transition">
                            ⚽ Book Now
                          </button>
                          <button onClick={() => navigate(`/grounds/${ground.id}`)}
                            className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 transition">
                            Details
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
