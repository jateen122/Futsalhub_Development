// frontend/src/pages/Grounds.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, SlidersHorizontal, X } from "lucide-react";
import FavoriteButton from "../components/FavoriteButton";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (t) => {
  if (!t) return "";
  const h = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function Grounds() {
  const navigate = useNavigate();

  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [facilities, setFacilities] = useState({
    parking: false,
    shower: false,
    wifi: false,
    restaurant: false,
  });
  const [groundSize, setGroundSize] = useState("");
  const [groundType, setGroundType] = useState("");

  const fetchGrounds = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (groundSize) params.set("ground_size", groundSize);
    if (groundType) params.set("ground_type", groundType);

    const activeFacilities = Object.entries(facilities)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeFacilities.length) params.set("facilities", activeFacilities.join(","));

    fetch(`${BASE_URL}/api/grounds/?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        setGrounds(list);
        setTotal(list.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, minPrice, maxPrice, facilities, groundSize, groundType]);

  useEffect(() => {
    fetchGrounds();
  }, [fetchGrounds]);

  const clearFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setGroundSize("");
    setGroundType("");
    setFacilities({ parking: false, shower: false, wifi: false, restaurant: false });
  };

  const hasActiveFilters =
    search ||
    minPrice ||
    maxPrice ||
    groundSize ||
    groundType ||
    Object.values(facilities).some(Boolean);

  // ── Filter Panel (improved clean UI) ──────────────────────
  const FilterPanel = () => (
    <div className="space-y-8">
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-100 transition"
        >
          <X size={16} /> Clear All Filters
        </button>
      )}

      {/* Price Range */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-3">PRICE PER HOUR</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Min (Rs)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Max (Rs)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="5000"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400"
            />
          </div>
        </div>
      </div>

      {/* Ground Size */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-3">GROUND SIZE</p>
        <div className="flex flex-wrap gap-2">
          {["", "5", "6", "7"].map((s) => (
            <button
              key={s}
              onClick={() => setGroundSize(s === groundSize ? "" : s)}
              className={`px-5 py-3 rounded-2xl text-sm font-medium border transition-all
                ${groundSize === s && s !== ""
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : s === "" && groundSize === ""
                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              {s === "" ? "All" : `${s}v${s}`}
            </button>
          ))}
        </div>
      </div>

      {/* Ground Type */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-3">GROUND TYPE</p>
        <div className="flex flex-wrap gap-2">
          {["", "indoor", "outdoor"].map((t) => (
            <button
              key={t}
              onClick={() => setGroundType(t === groundType ? "" : t)}
              className={`px-5 py-3 rounded-2xl text-sm font-medium border capitalize transition-all
                ${groundType === t && t !== ""
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : t === "" && groundType === ""
                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              {t === "" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-3">AMENITIES</p>
        <div className="space-y-3">
          {[
            { key: "parking", label: "Parking" },
            { key: "shower", label: "Shower" },
            { key: "wifi", label: "WiFi" },
            { key: "restaurant", label: "Restaurant" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={facilities[key]}
                onChange={() => setFacilities((p) => ({ ...p, [key]: !p[key] }))}
                className="w-4 h-4 accent-yellow-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          fetchGrounds();
          setSidebarOpen(false);
        }}
        className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition text-base"
      >
        Apply Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Browse Futsal Grounds</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {loading ? "Loading…" : `${total} ground${total !== 1 ? "s" : ""} available`}
            </p>
          </div>

          <div className="flex flex-1 max-w-2xl gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchGrounds()}
              placeholder="Search by name or location..."
              className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-yellow-400 transition bg-white"
            />
            <button onClick={fetchGrounds}
              className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition shadow-sm whitespace-nowrap">
              Search
            </button>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            <SlidersHorizontal size={16} />
            Filters {hasActiveFilters && <span className="bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>}
          </button>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={22} />
              </button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT — full width ─────────────────────────────────────── */}
      <div className="w-full px-4 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* ── DESKTOP FILTER SIDEBAR ─────────────────────────────────── */}
          <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-36">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </div>
              <FilterPanel />
            </div>
          </aside>

          {/* ── GROUNDS GRID — takes ALL remaining space ────────────────── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center items-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm">Loading grounds…</p>
                </div>
              </div>
            ) : grounds.length === 0 ? (
              <div className="text-center py-32">
                <p className="text-5xl mb-4">🏟️</p>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">No grounds found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search term</p>
                <button onClick={clearFilters}
                  className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-semibold transition">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5">
                {grounds.map((ground) => {
                  const imgSrc = ground.image
                    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
                    : null;

                  return (
                    <div key={ground.id}
                      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group flex flex-col">

                      {/* Image */}
                      <div className="relative h-52 overflow-hidden flex-shrink-0">
                        {imgSrc ? (
                          <img src={imgSrc} alt={ground.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center text-5xl">⚽</div>
                        )}

                        {/* Price badge - BIGGER TEXT */}
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-900 text-lg font-bold px-4 py-2 rounded-xl shadow">
                          Rs {ground.price_per_hour}/hr
                        </div>

                        {/* Favorite */}
                        <div className="absolute top-3 right-3">
                          <FavoriteButton groundId={ground.id} size="sm" />
                        </div>

                        {/* Size & Type */}
                        <div className="absolute bottom-3 left-3 flex gap-1.5">
                          {ground.ground_size && (
                            <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium">
                              {ground.ground_size}v{ground.ground_size}
                            </span>
                          )}
                          {ground.ground_type && (
                            <span className="bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium capitalize">
                              {ground.ground_type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        {/* GROUND NAME - BIGGER TEXT */}
                        <h3 className="font-bold text-gray-900 text-2xl leading-tight mb-1 line-clamp-1">{ground.name}</h3>

                        <div className="flex items-center gap-1 text-gray-500 text-xs mb-1.5">
                          <MapPin size={12} className="flex-shrink-0" />
                          <span className="truncate">{ground.location}</span>
                        </div>

                        <div className="flex items-center gap-1 text-gray-600 text-xs mb-3">
                          <Clock size={13} className="text-yellow-600 flex-shrink-0" />
                          <span>{toLabel(ground.opening_time)} — {toLabel(ground.closing_time)}</span>
                        </div>

                        {ground.description && (
                          <p className="text-gray-500 text-xs line-clamp-2 mb-3 flex-1">{ground.description}</p>
                        )}

                        {/* Buttons - BRIGHT YELLOW */}
                        <div className="flex gap-2 mt-auto pt-1">
                          <button onClick={() => navigate(`/book/${ground.id}`)}
                            className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold rounded-xl transition text-sm shadow-sm">
                            Book Now
                          </button>
                          <button onClick={() => navigate(`/grounds/${ground.id}`)}
                            className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 font-semibold rounded-xl transition text-sm text-gray-700">
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