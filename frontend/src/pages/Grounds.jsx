import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin } from "lucide-react";
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
    setFacilities({
      parking: false,
      shower: false,
      wifi: false,
      restaurant: false,
    });
  };

  const hasActiveFilters =
    search ||
    minPrice ||
    maxPrice ||
    groundSize ||
    groundType ||
    Object.values(facilities).some(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              Browse Futsal Grounds
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {loading ? "Loading..." : `${total} ground${total !== 1 ? "s" : ""} available`}
            </p>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-yellow-400 transition-all bg-white"
            />
            <button
              onClick={fetchGrounds}
              className="px-10 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition-all shadow-sm"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-12 gap-8">

          {/* Filters Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl sticky top-24">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 font-medium hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">PRICE PER HOUR</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Min (₹)</label>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Max (₹)</label>
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
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">GROUND SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {["", "5", "6", "7"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setGroundSize(s === groundSize ? "" : s)}
                      className={`px-5 py-2 rounded-2xl text-sm font-medium border transition-all
                        ${groundSize === s && s !== ""
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : s === "" && groundSize === ""
                          ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"}`}
                    >
                      {s === "" ? "All" : `${s}v${s}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ground Type */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">GROUND TYPE</p>
                <div className="flex flex-wrap gap-2">
                  {["", "indoor", "outdoor"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setGroundType(t === groundType ? "" : t)}
                      className={`px-6 py-2 rounded-2xl text-sm font-medium border capitalize transition-all
                        ${groundType === t && t !== ""
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : t === "" && groundType === ""
                          ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"}`}
                    >
                      {t === "" ? "All" : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-10">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">AMENITIES</p>
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
                        className="w-5 h-5 accent-yellow-500 rounded border-gray-300"
                      />
                      <span className="text-gray-700 text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={fetchGrounds}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition-all"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Grounds Grid - Full Space */}
          <div className="col-span-12 lg:col-span-9">
            {loading ? (
              <div className="flex justify-center items-center py-32">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500">Loading grounds...</p>
                </div>
              </div>
            ) : grounds.length === 0 ? (
              <div className="text-center py-32">
                <h3 className="text-2xl font-semibold text-gray-800">No grounds found</h3>
                <p className="text-gray-500 mt-3">Try adjusting your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-6 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {grounds.map((ground) => {
                  const imgSrc = ground.image
                    ? ground.image.startsWith("http")
                      ? ground.image
                      : `${BASE_URL}${ground.image}`
                    : null;

                  return (
                    <div
                      key={ground.id}
                      className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 group"
                    >
                      {/* Image */}
                      <div className="relative h-60 overflow-hidden">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={ground.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100" />
                        )}

                        {/* Price Badge */}
                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-gray-900 text-sm font-bold px-4 py-1.5 rounded-2xl shadow">
                          ₹ {ground.price_per_hour}/hr
                        </div>

                        {/* Favorite */}
                        <div className="absolute top-4 right-4">
                          <FavoriteButton groundId={ground.id} size="sm" />
                        </div>

                        {/* Size & Type */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                          {ground.ground_size && (
                            <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-xl backdrop-blur-sm font-medium">
                              {ground.ground_size}v{ground.ground_size}
                            </span>
                          )}
                          {ground.ground_type && (
                            <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-xl backdrop-blur-sm font-medium capitalize">
                              {ground.ground_type}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="font-semibold text-xl text-gray-900 line-clamp-1">
                          {ground.name}
                        </h3>

                        <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                          <MapPin size={16} />
                          <span className="truncate">{ground.location}</span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-600">
                          <Clock size={17} className="text-yellow-600" />
                          <span>
                            {toLabel(ground.opening_time)} — {toLabel(ground.closing_time)}
                          </span>
                        </div>

                        {ground.description && (
                          <p className="text-gray-600 text-sm mt-4 line-clamp-2">
                            {ground.description}
                          </p>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => navigate(`/book/${ground.id}`)}
                            className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition text-sm"
                          >
                            Book Now
                          </button>
                          <button
                            onClick={() => navigate(`/grounds/${ground.id}`)}
                            className="flex-1 py-3 border border-gray-300 hover:bg-gray-50 font-semibold rounded-2xl transition text-sm"
                          >
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