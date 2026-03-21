import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL   = "http://127.0.0.1:8000";
// ✅ Favorites are inside grounds app — no separate favorites app needed
const FAV_URL    = `${BASE_URL}/api/grounds/favorites/`;
const TOGGLE_URL = `${BASE_URL}/api/grounds/favorites/toggle/`;

const toLabel = (t) => {
  if (!t) return "";
  const h    = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function PlayerFavorites() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [removing,  setRemoving]  = useState(null);
  const [error,     setError]     = useState("");

  /* ── fetch ──────────────────────────────────────────────────── */
  const fetchFavorites = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(FAV_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(`Could not load favorites (${res.status}). Make sure Django is running.`);
        return;
      }
      const data = await res.json();
      // API returns { count: N, favorites: [...] }
      setFavorites(data.favorites || data.results || data || []);
    } catch {
      setError("Network error. Make sure Django is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchFavorites();
  }, []);

  /* ── remove ─────────────────────────────────────────────────── */
  const handleRemove = async (groundId) => {
    setRemoving(groundId);
    try {
      const res = await fetch(TOGGLE_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ ground_id: Number(groundId) }),
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f.ground_id !== groundId));
      }
    } catch (e) { console.error(e); }
    finally { setRemoving(null); }
  };

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* breadcrumb bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/player-dashboard")}
          className="text-gray-400 hover:text-gray-700 text-sm font-medium transition flex items-center gap-1.5">
          ← Dashboard
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">My Favorites</span>
        {!loading && favorites.length > 0 && (
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200 ml-1">
            ♥ {favorites.length}
          </span>
        )}
        <button onClick={fetchFavorites}
          className="ml-auto text-gray-400 hover:text-gray-700 text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
          ↻ Refresh
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900">My Favorites</h1>
            <p className="text-gray-500 text-sm mt-1">Grounds you've saved for quick access</p>
          </div>
          <button onClick={() => navigate("/grounds")}
            className="px-5 py-2.5 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm shadow-sm flex items-center gap-2">
            + Browse Grounds
          </button>
        </div>

        {/* error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 text-sm flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠</span>
            <div className="flex-1">
              <p className="font-bold">Could not load favorites</p>
              <p className="mt-0.5 text-red-600">{error}</p>
              <p className="mt-1 text-red-500 text-xs">
                Make sure you've run: <code className="bg-red-100 px-1 rounded">python manage.py migrate</code> and the server is running.
              </p>
            </div>
            <button onClick={fetchFavorites}
              className="flex-shrink-0 text-red-500 font-bold border border-red-300 px-3 py-1.5 rounded-lg text-xs hover:bg-red-100 transition">
              Retry
            </button>
          </div>
        )}

        {/* loading */}
        {loading && (
          <div className="flex items-center justify-center py-28">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading your favorites...</p>
            </div>
          </div>
        )}

        {/* empty state */}
        {!loading && !error && favorites.length === 0 && (
          <div className="text-center py-28">
            <div className="w-24 h-24 bg-red-50 border-2 border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">♡</span>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">No favorites yet</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto leading-relaxed">
              Browse grounds and click the <span className="text-red-500 font-bold">♡</span> heart button on any ground card to save it here for quick booking.
            </p>
            <button onClick={() => navigate("/grounds")}
              className="px-10 py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition shadow-md text-base">
              ⚽ Browse Grounds
            </button>
          </div>
        )}

        {/* favorites grid */}
        {!loading && favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {favorites.map((fav) => {
              const imgSrc     = fav.image
                ? fav.image.startsWith("http") ? fav.image : `${BASE_URL}${fav.image}`
                : null;
              const isRemoving = removing === fav.ground_id;

              return (
                <div key={fav.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200 group">

                  {/* ── image ── */}
                  <div className="relative h-44 overflow-hidden bg-gray-100">
                    {imgSrc
                      ? <img src={imgSrc} alt={fav.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-50 to-emerald-100">
                          ⚽
                        </div>}

                    {/* price */}
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">
                      Rs {fav.price_per_hour}/hr
                    </div>

                    {/* remove heart */}
                    <button
                      onClick={() => handleRemove(fav.ground_id)}
                      disabled={isRemoving}
                      title="Remove from favorites"
                      className="absolute top-3 right-3 w-9 h-9 bg-red-500 text-white rounded-xl flex items-center justify-center hover:bg-red-600 transition shadow-md disabled:opacity-60 font-bold text-base">
                      {isRemoving
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "♥"}
                    </button>

                    {/* size + type */}
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                      {fav.ground_size && (
                        <span className="bg-black/65 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">
                          {fav.ground_size}v{fav.ground_size}
                        </span>
                      )}
                      {fav.ground_type && (
                        <span className="bg-black/65 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded capitalize">
                          {fav.ground_type === "indoor" ? "🏠" : "☀️"} {fav.ground_type}
                        </span>
                      )}
                    </div>

                    {/* not yet approved */}
                    {!fav.is_approved && (
                      <div className="absolute bottom-3 right-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                        ⏳ Pending
                      </div>
                    )}
                  </div>

                  {/* ── body ── */}
                  <div className="p-5">
                    <h3 className="font-black text-gray-900 text-lg leading-tight truncate mb-1">
                      {fav.name}
                    </h3>
                    <p className="text-gray-500 text-sm mb-3">📍 {fav.location}</p>

                    {/* hours */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <span className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded font-medium">
                        🕐 {toLabel(fav.opening_time)}
                      </span>
                      <span className="text-gray-300">—</span>
                      <span className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded font-medium">
                        {toLabel(fav.closing_time)}
                      </span>
                    </div>

                    {/* facilities */}
                    {fav.facilities && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {fav.facilities.split(",").slice(0, 3).map(f => (
                          <span key={f}
                            className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs border border-gray-200">
                            {f.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* saved date */}
                    {fav.created_at && (
                      <p className="text-gray-300 text-xs mb-4">
                        Saved {new Date(fav.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    )}

                    {/* actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/book/${fav.ground_id}`)}
                        disabled={!fav.is_approved}
                        className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                        {fav.is_approved ? "⚽ Book Now" : "Not Available"}
                      </button>
                      <button
                        onClick={() => navigate(`/grounds/${fav.ground_id}`)}
                        className="px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 font-bold rounded-xl text-sm hover:bg-gray-200 transition">
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
