import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Heart,
  BookOpen,
  Info,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (t) => {
  if (!t) return "";
  const h = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function PlayerFavorites() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/grounds/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError(`Could not load favorites (${res.status})`);
        return;
      }

      const data = await res.json();
      setFavorites(data.favorites || data.results || data || []);
    } catch (err) {
      console.error(err);
      setError("Network error. Please make sure the server is running.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchFavorites();
  }, [token, navigate]);

  const handleRemove = async (groundId) => {
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/favorites/toggle/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ground_id: Number(groundId) }),
      });

      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.ground_id !== groundId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-base transition"
            >
              <ArrowLeft size={18} /> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              My Favorites
            </h1>
          </div>

          <button
            onClick={() => fetchFavorites(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 mb-6">
            <p className="font-medium text-sm">{error}</p>
            <button
              onClick={() => fetchFavorites()}
              className="mt-3 text-red-600 font-semibold text-sm hover:text-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Loading favorites...</p>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-2xl py-20 text-center border border-gray-100">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
              <Heart size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              No favorites yet
            </h3>
            <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
              You haven't saved any grounds yet. Browse grounds and click the
              heart icon to add them here.
            </p>
            <button
              onClick={() => navigate("/grounds")}
              className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition text-sm"
            >
              Browse Grounds
            </button>
          </div>
        ) : (
          // Favorites Grid
          <div className="space-y-4 pb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Your Favorites
              </h2>
              <p className="text-gray-500 mt-1 text-xs">
                {favorites.length} ground{favorites.length !== 1 ? "s" : ""}{" "}
                saved
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((fav) => {
                const imgSrc = fav.image
                  ? fav.image.startsWith("http")
                    ? fav.image
                    : `${BASE_URL}${fav.image}`
                  : null;

                return (
                  <div
                    key={fav.id}
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col"
                  >
                    {/* Image */}
                    <div className="relative h-40 overflow-hidden">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={fav.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100" />
                      )}

                      {/* Price Badge */}
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-900 text-xs font-bold px-3 py-1 rounded-lg shadow-sm">
                        Rs {fav.price_per_hour}/hr
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={() => handleRemove(fav.ground_id)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 shadow-sm transition"
                      >
                        <Heart size={16} fill="currentColor" />
                      </button>

                      {/* Size & Type */}
                      {(fav.ground_size || fav.ground_type) && (
                        <div className="absolute bottom-3 left-3 flex gap-2">
                          {fav.ground_size && (
                            <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium">
                              {fav.ground_size}v{fav.ground_size}
                            </span>
                          )}
                          {fav.ground_type && (
                            <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm font-medium capitalize">
                              {fav.ground_type}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-semibold text-base text-gray-900 line-clamp-1">
                        {fav.name}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-2 text-gray-600 text-xs">
                        <MapPin size={14} className="flex-shrink-0" />
                        <span className="truncate">{fav.location}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 text-gray-600 text-xs">
                        <Clock
                          size={14}
                          className="flex-shrink-0 text-amber-600"
                        />
                        <span>
                          {toLabel(fav.opening_time)} —{" "}
                          {toLabel(fav.closing_time)}
                        </span>
                      </div>

                      {fav.description && (
                        <p className="text-gray-600 text-xs mt-3 line-clamp-2">
                          {fav.description}
                        </p>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2.5 mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => navigate(`/book/${fav.ground_id}`)}
                          disabled={!fav.is_approved}
                          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-xl transition text-xs flex items-center justify-center gap-2"
                        >
                          <BookOpen size={14} />
                          {fav.is_approved ? "Book Now" : "Not Available"}
                        </button>
                        <button
                          onClick={() => navigate(`/grounds/${fav.ground_id}`)}
                          className="flex-1 py-2.5 border border-gray-300 hover:bg-gray-50 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-2"
                        >
                          <Info size={14} />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
