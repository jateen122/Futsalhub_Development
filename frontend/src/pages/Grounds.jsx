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

  // Filter Panel Component
  const FilterPanel = () => (
    <div className="space-y-8">
      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-100 transition"
        >
          <X size={16} /> Clear All Filters
        </button>
      )}

      {/* Search inside filter (for mobile) */}
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">SEARCH</p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ground name or location..."
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
        />
      </div>

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
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Max (Rs)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="5000"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-400"
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
                  ? "bg-amber-500 text-white border-amber-500"
                  : s === "" && groundSize === ""
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              {s === "" ? "All Sizes" : `${s}v${s}`}
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
                  ? "bg-amber-500 text-white border-amber-500"
                  : t === "" && groundType === ""
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"}`}
            >
              {t === "" ? "All Types" : t}
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
                className="w-4 h-4 accent-amber-500 border-gray-300 rounded"
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
        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition text-base"
      >
        Apply Filters
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="w-full px-4 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Browse Grounds</h1>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? "Searching..." : `${total} grounds available`}
            </p>
          </div>

          <div className="flex-1 max-w-2xl flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchGrounds()}
              placeholder="Search by name or location..."
              className="flex-1 border border-gray-200 rounded-3xl px-5 py-3.5 text-base focus:outline-none focus:border-amber-400 transition"
            />
            <button 
              onClick={fetchGrounds}
              className="px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-3xl transition shadow-sm whitespace-nowrap"
            >
              Search
            </button>
          </div>

          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center gap-2 px-5 py-3.5 bg-white border border-gray-200 rounded-3xl text-sm font-medium hover:bg-gray-50 transition"
          >
            <SlidersHorizontal size={18} />
            Filters
          </button>
        </div>
      </div>

      <div className="flex w-full">

        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 border-r border-gray-100 bg-white min-h-[calc(100vh-80px)] p-6 sticky top-20 overflow-auto">
          <FilterPanel />
        </aside>

        {/* Main Grounds Grid */}
        <div className="flex-1 min-w-0 px-4 lg:px-8 py-8">

          {/* Mobile Filter Drawer */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden bg-black/60" onClick={() => setSidebarOpen(false)}>
              <div 
                onClick={(e) => e.stopImmediatePropagation()}
                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-auto p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Filters</h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-gray-400">
                    <X size={28} />
                  </button>
                </div>
                <FilterPanel />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500">Loading grounds...</p>
              </div>
            </div>
          ) : grounds.length === 0 ? (
            <div className="text-center py-32">
              <h3 className="text-2xl font-bold text-gray-900">No grounds found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your filters</p>
              <button 
                onClick={clearFilters}
                className="mt-8 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {grounds.map((ground) => {
                const imgSrc = ground.image
                  ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
                  : null;

                return (
                  <div 
                    key={ground.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-52 overflow-hidden">
                      {imgSrc ? (
                        <img 
                          src={imgSrc} 
                          alt={ground.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-6xl text-amber-300">
                          GROUND
                        </div>
                      )}

                      {/* Price badge */}
                      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow text-lg font-bold text-emerald-700">
                        Rs {ground.price_per_hour}
                      </div>

                      {/* Favorite */}
                      <div className="absolute top-4 right-4">
                        <FavoriteButton groundId={ground.id} size="md" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-xl text-gray-900 line-clamp-2 mb-1">{ground.name}</h3>
                      
                      <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                        <MapPin size={16} />
                        <span className="truncate">{ground.location}</span>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 text-gray-600 text-sm mb-5">
                        <Clock size={16} className="text-amber-600" />
                        <span>{toLabel(ground.opening_time)} — {toLabel(ground.closing_time)}</span>
                      </div>

                      {/* Size & Type */}
                      <div className="flex gap-2 mb-auto">
                        {ground.ground_size && (
                          <span className="text-xs font-semibold px-4 py-2 bg-amber-100 text-amber-700 rounded-2xl">
                            {ground.ground_size}v{ground.ground_size}
                          </span>
                        )}
                        {ground.ground_type && (
                          <span className="text-xs font-semibold px-4 py-2 bg-purple-100 text-purple-700 rounded-2xl capitalize">
                            {ground.ground_type}
                          </span>
                        )}
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-2 mt-6">
                        <button 
                          onClick={() => navigate(`/grounds/${ground.id}`)}
                          className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 font-semibold rounded-2xl text-sm transition"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => navigate(`/book/${ground.id}`)}
                          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl text-sm transition"
                        >
                          Book Now
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
  );
}