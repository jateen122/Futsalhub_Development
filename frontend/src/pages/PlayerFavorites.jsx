import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, ArrowLeft, RefreshCw } from "lucide-react";
import FavoriteButton from "../components/FavoriteButton";

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
    setLoading(true);
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

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="text-gray-500 hover:text-gray-800 transition flex items-center gap-2"
            >
              <ArrowLeft size={20} /> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
              My Favorites
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <p className="text-gray-500 text-sm">
              {loading ? "Loading..." : `${favorites.length} favorite${favorites.length !== 1 ? "s" : ""}`}
            </p>
            <button
              onClick={fetchFavorites}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-yellow-400 rounded-2xl text-sm font-medium transition"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-6 mb-10">
            <p className="font-medium">{error}</p>
            <button
              onClick={fetchFavorites}
              className="mt-4 text-red-600 font-semibold hover:underline"
            >
              Try Again
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Loading your favorites...</p>
            </div>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-32">
            <div className="mx-auto w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
              <span className="text-6xl text-yellow-300">♡</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No favorites yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              You haven't saved any grounds yet. Browse grounds and click the heart icon to add them here.
            </p>
            <button
              onClick={() => navigate("/grounds")}
              className="mt-8 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl"
            >
              Browse Grounds
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const imgSrc = fav.image
                ? fav.image.startsWith("http")
                  ? fav.image
                  : `${BASE_URL}${fav.image}`
                : null;

              return (
                <div
                  key={fav.id}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative h-60 overflow-hidden">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={fav.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100" />
                    )}

                    {/* Price Badge */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-gray-900 text-sm font-bold px-4 py-1.5 rounded-2xl shadow">
                      ₹ {fav.price_per_hour}/hr
                    </div>

                    {/* Favorite Button (to remove) */}
                    <div className="absolute top-4 right-4">
                      <button
                        onClick={() => handleRemove(fav.ground_id)}
                        className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 shadow transition"
                      >
                        ♥
                      </button>
                    </div>

                    {/* Size & Type */}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      {fav.ground_size && (
                        <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-xl backdrop-blur-sm font-medium">
                          {fav.ground_size}v{fav.ground_size}
                        </span>
                      )}
                      {fav.ground_type && (
                        <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-xl backdrop-blur-sm font-medium capitalize">
                          {fav.ground_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="font-semibold text-xl text-gray-900 line-clamp-1">
                      {fav.name}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                      <MapPin size={16} />
                      <span className="truncate">{fav.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-600">
                      <Clock size={17} className="text-yellow-600" />
                      <span>
                        {toLabel(fav.opening_time)} — {toLabel(fav.closing_time)}
                      </span>
                    </div>

                    {fav.description && (
                      <p className="text-gray-600 text-sm mt-4 line-clamp-2">
                        {fav.description}
                      </p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => navigate(`/book/${fav.ground_id}`)}
                        disabled={!fav.is_approved}
                        className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 disabled:text-gray-500 text-white font-semibold rounded-2xl transition text-sm"
                      >
                        {fav.is_approved ? "Book Now" : "Not Available"}
                      </button>
                      <button
                        onClick={() => navigate(`/grounds/${fav.ground_id}`)}
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
  );
}