import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const STATUS_CONFIG = {
  pending:   { color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30"  },
  confirmed: { color: "text-emerald-400",bg: "bg-emerald-400/10",border: "border-emerald-400/30" },
  cancelled: { color: "text-red-400",    bg: "bg-red-400/10",    border: "border-red-400/30"    },
  refunded:  { color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30"   },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function OwnerBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    let url = `${BASE_URL}/api/bookings/owner/`;
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (dateFilter) params.set("date", dateFilter);
    if ([...params].length) url += `?${params}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setBookings(d.results || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter, dateFilter]);

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    revenue:   bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + parseFloat(b.total_price), 0),
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/owner-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <h1 className="text-4xl font-black text-white">Ground Bookings</h1>
          <p className="text-white/40 mt-1">All bookings received for your grounds</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",     value: stats.total,                    color: "text-white"        },
            { label: "Pending",   value: stats.pending,                  color: "text-amber-400"    },
            { label: "Confirmed", value: stats.confirmed,                color: "text-emerald-400"  },
            { label: "Revenue",   value: `Rs ${stats.revenue.toFixed(0)}`, color: "text-amber-400"  },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "confirmed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition
                  ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white/5 border border-white/10 text-white/70 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400/50"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="ml-2 text-white/30 hover:text-white text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-white/40 text-lg">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              return (
                <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-xl font-black text-amber-400">
                        #{b.id}
                      </div>
                      <div>
                        <p className="text-white font-bold">{b.ground_name}</p>
                        <p className="text-white/50 text-sm">👤 {b.user_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm flex-wrap">
                      <div>
                        <p className="text-white/40 text-xs">Date</p>
                        <p className="text-white font-medium">{b.date}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Time</p>
                        <p className="text-white font-medium">{fmt12(b.start_time)} – {fmt12(b.end_time)}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-xs">Amount</p>
                        <p className="text-amber-400 font-bold">Rs {b.total_price}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border} capitalize`}>
                        {b.status}
                      </span>
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
