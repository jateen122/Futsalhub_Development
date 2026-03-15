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

export default function AdminBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter]   = useState("");
  const [search, setSearch]           = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }

    // Admin fetches all bookings by hitting owner endpoint with admin JWT
    // or you can add a dedicated admin endpoint in Django
    fetch(`${BASE_URL}/api/bookings/owner/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setBookings(d.results || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchDate   = !dateFilter || b.date === dateFilter;
    const matchSearch = !search.trim() ||
      b.ground_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    revenue:   bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + parseFloat(b.total_price), 0),
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/admin-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <h1 className="text-4xl font-black text-white">All Bookings</h1>
          <p className="text-white/40 mt-1">Platform-wide booking overview</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",     value: stats.total,                      color: "text-white"       },
            { label: "Confirmed", value: stats.confirmed,                  color: "text-emerald-400" },
            { label: "Pending",   value: stats.pending,                    color: "text-amber-400"   },
            { label: "Revenue",   value: `Rs ${stats.revenue.toFixed(0)}`, color: "text-amber-400"   },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search player or ground..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 text-sm"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400/50"
          />
          <div className="flex gap-2">
            {["all", "pending", "confirmed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition
                  ${statusFilter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-white/40 text-lg">No bookings found</p>
          </div>
        ) : (
          <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
            {/* Head */}
            <div className="hidden md:grid grid-cols-12 px-5 py-3 border-b border-white/10 text-xs uppercase tracking-widest text-white/30">
              <div className="col-span-1">#</div>
              <div className="col-span-2">Ground</div>
              <div className="col-span-3">Player</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Time</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-1">Status</div>
            </div>

            {filtered.map((b, i) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              return (
                <div key={b.id} className="grid md:grid-cols-12 grid-cols-1 gap-2 md:gap-0 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition items-center">
                  <div className="col-span-1 text-white/30 text-sm">{i + 1}</div>
                  <div className="col-span-2 text-white font-medium text-sm truncate">{b.ground_name}</div>
                  <div className="col-span-3 text-white/60 text-sm truncate">{b.user_email}</div>
                  <div className="col-span-2 text-white/80 text-sm">{b.date}</div>
                  <div className="col-span-2 text-white/80 text-sm">{fmt12(b.start_time)} – {fmt12(b.end_time)}</div>
                  <div className="col-span-1 text-amber-400 font-bold text-sm">Rs {b.total_price}</div>
                  <div className="col-span-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color} ${cfg.bg} ${cfg.border} capitalize`}>
                      {b.status}
                    </span>
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
