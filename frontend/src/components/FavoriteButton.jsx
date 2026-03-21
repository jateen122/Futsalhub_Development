import { useState, useEffect } from "react";

const BASE_URL   = "http://127.0.0.1:8000";
const FAV_URL    = `${BASE_URL}/api/grounds/favorites/`;
const TOGGLE_URL = `${BASE_URL}/api/grounds/favorites/toggle/`;

export default function FavoriteButton({ groundId, size = "md" }) {
  const token = localStorage.getItem("access");

  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready,   setReady]   = useState(false);

  /* ── check if already favorited ─────────────────────────────── */
  useEffect(() => {
    if (!token || !groundId) { setReady(true); return; }

    fetch(FAV_URL, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const list = data.favorites || data.results || data || [];
        setSaved(list.some(f => String(f.ground_id) === String(groundId)));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [groundId, token]);

  /* ── toggle ─────────────────────────────────────────────────── */
  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || loading) return;

    const next = !saved;
    setSaved(next);      // optimistic
    setLoading(true);

    try {
      const res  = await fetch(TOGGLE_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ ground_id: Number(groundId) }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(data.favorited);   // confirm with server
      } else {
        setSaved(!next);            // revert on error
      }
    } catch {
      setSaved(!next);              // revert on network error
    } finally {
      setLoading(false);
    }
  };

  // Don't show if not logged in or still loading initial state
  if (!token || !ready) return null;

  const sizeMap = {
    sm: "w-8  h-8  text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-xl",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={saved ? "Remove from favorites" : "Save to favorites"}
      className={`
        ${sizeMap[size] || sizeMap.md}
        rounded-xl flex items-center justify-center
        transition-all duration-200 shadow-md border font-bold select-none
        ${saved
          ? "bg-red-500 border-red-500 text-white hover:bg-red-600 hover:scale-110"
          : "bg-white/90 border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 hover:bg-white hover:scale-110"}
        ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
      `}>
      {loading
        ? <div className={`w-3.5 h-3.5 border-2 rounded-full animate-spin
            ${saved ? "border-white border-t-transparent" : "border-gray-400 border-t-transparent"}`} />
        : saved ? "♥" : "♡"}
    </button>
  );
}
