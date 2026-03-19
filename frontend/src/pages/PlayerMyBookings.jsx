import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const STATUS_CONFIG = {
  pending: {
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
    label: "Pending",
  },
  confirmed: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    dot: "bg-emerald-400",
    label: "Confirmed",
  },
  cancelled: {
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    dot: "bg-red-400",
    label: "Cancelled",
  },
  refunded: {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    dot: "bg-blue-400",
    label: "Refunded",
  },
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionInProgress, setActionInProgress] = useState(null);

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
    if (!token) {
      navigate("/login");
      return;
    }
    fetchBookings();
  }, []);

  const handleAction = async (id, action) => {
    if (
      !window.confirm(
        `${action.charAt(0).toUpperCase() + action.slice(1)} this booking?`,
      )
    )
      return;
    setActionInProgress(`${id}-${action}`);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${id}/${action}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchBookings();
    } catch (e) {
      console.error(e);
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate("/player-dashboard")}
            className="text-white/40 hover:text-white text-sm mb-6 font-medium transition"
          >
            ← Back to Dashboard
          </button>
          <div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-2">
              My Bookings
            </h1>
            <p className="text-white/50 text-lg">
              Track and manage all your futsal reservations
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total", value: stats.total, color: "text-blue-400" },
            {
              label: "Confirmed",
              value: stats.confirmed,
              color: "text-emerald-400",
            },
            { label: "Pending", value: stats.pending, color: "text-amber-400" },
            {
              label: "Cancelled",
              value: stats.cancelled,
              color: "text-red-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-6 text-center hover:border-white/40 transition"
            >
              <p className={`text-4xl font-bold ${s.color} mb-2`}>{s.value}</p>
              <p className="text-white/60 text-sm font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {["all", "pending", "confirmed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-full text-sm font-semibold capitalize transition-all
                ${
                  filter === f
                    ? "bg-amber-400 text-black shadow-lg"
                    : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white/40 text-xl mb-6">No bookings found</p>
            <button
              onClick={() => navigate("/grounds")}
              className="px-8 py-3 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-500 transition"
            >
              Browse Grounds
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              return (
                <div
                  key={b.id}
                  className="bg-gradient-to-r from-white/8 to-white/5 border border-white/15 rounded-xl p-6 hover:border-white/30 hover:bg-gradient-to-r hover:from-white/12 hover:to-white/8 transition"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-white font-bold text-xl">
                          {b.ground_name}
                        </h3>
                        <span
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border} flex items-center gap-2`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-1">
                            Date
                          </p>
                          <p className="text-white/90 font-semibold">
                            {b.date}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-1">
                            Time
                          </p>
                          <p className="text-white/90 font-semibold">
                            {fmt12(b.start_time)} – {fmt12(b.end_time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-1">
                            Price
                          </p>
                          <p className="text-amber-400 font-bold">
                            Rs {b.total_price}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/50 text-xs font-medium mb-1">
                            Booking ID
                          </p>
                          <p className="text-white/90 font-semibold">#{b.id}</p>
                        </div>
                      </div>
                    </div>
                    {b.status === "pending" && (
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <button
                          onClick={() => handleAction(b.id, "accept")}
                          disabled={actionInProgress === `${b.id}-accept`}
                          className="px-5 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {actionInProgress === `${b.id}-accept`
                            ? "Accepting..."
                            : "Accept"}
                        </button>
                        <button
                          onClick={() => handleAction(b.id, "decline")}
                          disabled={actionInProgress === `${b.id}-decline`}
                          className="px-5 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {actionInProgress === `${b.id}-decline`
                            ? "Declining..."
                            : "Decline"}
                        </button>
                      </div>
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
