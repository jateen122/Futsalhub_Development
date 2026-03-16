import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const STATUS_CONFIG = {
  pending:   { color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30",  dot: "bg-amber-400",   label: "Pending"   },
  confirmed: { color: "text-emerald-400",bg: "bg-emerald-400/10",border: "border-emerald-400/30",dot: "bg-emerald-400", label: "Confirmed" },
  cancelled: { color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30",    dot: "bg-red-400",     label: "Cancelled" },
  refunded:  { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   dot: "bg-blue-400",    label: "Refunded"  },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [cancelling, setCancelling] = useState(null);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${id}/cancel/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchBookings();
    } finally {
      setCancelling(null);
    }
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/player-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <h1 className="text-4xl font-black text-white tracking-tight">My Bookings</h1>
          <p className="text-white/40 mt-1">Track and manage all your futsal sessions</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",     value: stats.total,     color: "text-white"         },
            { label: "Confirmed", value: stats.confirmed, color: "text-emerald-400"   },
            { label: "Pending",   value: stats.pending,   color: "text-amber-400"     },
            { label: "Cancelled", value: stats.cancelled, color: "text-red-400"       },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "pending", "confirmed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all
                ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🏟️</p>
            <p className="text-white/40 text-lg">No bookings found</p>
            <button onClick={() => navigate("/grounds")} className="mt-4 px-6 py-2 bg-amber-400 text-black font-bold rounded-xl">
              Browse Grounds
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              return (
                <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-white font-bold text-lg">{b.ground_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border} flex items-center gap-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <p className="text-white/50">📅 <span className="text-white/80">{b.date}</span></p>
                        <p className="text-white/50">🕐 <span className="text-white/80">{fmt12(b.start_time)} – {fmt12(b.end_time)}</span></p>
                        <p className="text-white/50">💰 <span className="text-amber-400 font-bold">Rs {b.total_price}</span></p>
                        <p className="text-white/50">🎫 <span className="text-white/80">#{b.id}</span></p>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancelling === b.id}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-50"
                      >
                        {cancelling === b.id ? "..." : "Cancel"}
                      </button>
                    )}
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
