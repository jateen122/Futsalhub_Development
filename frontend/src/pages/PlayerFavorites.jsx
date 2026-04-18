// frontend/src/pages/PlayerFavorites.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, ArrowLeft, BookOpen, Info, Heart } from "lucide-react";

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

  const fetchFavorites = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/api/grounds/favorites/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError("Could not load favorites");
        return;
      }

      const data = await res.json();
      setFavorites(data.favorites || data.results || data || []);
    } catch (err) {
      console.error(err);
      setError("Network error. Please make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 w-full">

      {/* Top Bar - Full width */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40 w-full">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-12 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-base transition"
            >
              <ArrowLeft size={18} /> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Favorites</h1>
          </div>

          <p className="text-gray-500 text-sm">
            {favorites.length} favorite{favorites.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Main Content - FULL WIDTH OF SCREEN */}
      <div className="w-full px-6 md:px-10 lg:px-12 py-8">

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-32 w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Loading favorites...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-6 text-center max-w-md mx-auto">
            <p className="font-medium">{error}</p>
            <button
              onClick={fetchFavorites}
              className="mt-4 px-6 py-3 bg-red-600 text-white rounded-2xl text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : favorites.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl py-20 text-center border border-gray-100 shadow-sm max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
              <Heart size={32} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">No favorites yet</h3>
            <p className="text-gray-500 mt-2">
              You haven’t saved any grounds. Browse and click the heart icon to add them here.
            </p>
            <button
              onClick={() => navigate("/grounds")}
              className="mt-8 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-3xl transition"
            >
              Browse Grounds
            </button>
          </div>
        ) : (
          /* Favorites Grid - Full width cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 w-full">
            {favorites.map((fav) => {
              const imgSrc = fav.image
                ? fav.image.startsWith("http")
                  ? fav.image
                  : `${BASE_URL}${fav.image}`
                : null;

              return (
                <div
                  key={fav.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group flex flex-col w-full"
                >
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={fav.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-6xl text-amber-300">
                        GROUND
                      </div>
                    )}

                    {/* Price badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow text-lg font-bold text-emerald-700">
                      Rs {fav.price_per_hour}
                    </div>

                    {/* Remove favorite button */}
                    <button
                      onClick={() => handleRemove(fav.ground_id)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 shadow-sm transition"
                    >
                      <Heart size={18} fill="currentColor" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-xl text-gray-900 line-clamp-2 mb-1">{fav.name}</h3>

                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                      <MapPin size={16} />
                      <span className="truncate">{fav.location}</span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-gray-600 text-sm mb-5">
                      <Clock size={16} className="text-amber-600" />
                      <span>
                        {toLabel(fav.opening_time)} — {toLabel(fav.closing_time)}
                      </span>
                    </div>

                    {/* Size & Type */}
                    <div className="flex gap-2 mb-auto">
                      {fav.ground_size && (
                        <span className="text-xs font-semibold px-4 py-2 bg-amber-100 text-amber-700 rounded-2xl">
                          {fav.ground_size}v{fav.ground_size}
                        </span>
                      )}
                      {fav.ground_type && (
                        <span className="text-xs font-semibold px-4 py-2 bg-purple-100 text-purple-700 rounded-2xl capitalize">
                          {fav.ground_type}
                        </span>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-6">
                      <button
                        onClick={() => navigate(`/grounds/${fav.ground_id}`)}
                        className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 font-semibold rounded-2xl text-sm transition"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => navigate(`/book/${fav.ground_id}`)}
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
  );
}