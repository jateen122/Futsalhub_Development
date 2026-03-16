import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const METHOD_CONFIG = {
  esewa: { icon: "💚", label: "eSewa",  color: "text-green-400",  bg: "bg-green-400/10",  border: "border-green-400/30"  },
  cash:  { icon: "💵", label: "Cash",   color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30"   },
};

const STATUS_CONFIG = {
  success:  { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  failed:   { color: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/30"     },
  refunded: { color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/30"   },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function PlayerPaymentHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/payments/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setPayments(d.results || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const totalSpent = payments
    .filter((p) => p.status === "success")
    .reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/player-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <h1 className="text-4xl font-black text-white tracking-tight">Payment History</h1>
          <p className="text-white/40 mt-1">All your transactions in one place</p>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="col-span-1 bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 rounded-2xl p-5">
            <p className="text-amber-400/70 text-xs uppercase tracking-widest mb-1">Total Spent</p>
            <p className="text-3xl font-black text-amber-400">Rs {totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-emerald-400">{payments.filter(p => p.status === "success").length}</p>
            <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">Successful</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white">{payments.length}</p>
            <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">Total</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {["all", "success", "failed", "refunded"].map((f) => (
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

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">💳</p>
            <p className="text-white/40 text-lg">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const mCfg = METHOD_CONFIG[p.payment_method] || METHOD_CONFIG.cash;
              const sCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.success;
              const isOpen = expanded === p.id;
              return (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                >
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${mCfg.bg} border ${mCfg.border} flex items-center justify-center text-2xl`}>
                        {mCfg.icon}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{p.ground_name}</p>
                        <p className="text-white/40 text-sm font-mono">{p.transaction_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black text-xl">Rs {p.amount}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sCfg.color} ${sCfg.bg} ${sCfg.border} capitalize`}>
                        {p.status}
                      </span>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-white/10 px-5 py-4 grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Date",       p.booking_date],
                        ["Time",       `${fmt12(p.booking_start_time)} – ${fmt12(p.booking_end_time)}`],
                        ["Method",     p.payment_method_display],
                        ["Paid At",    new Date(p.paid_at).toLocaleString()],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <p className="text-white/30 text-xs uppercase tracking-wider">{k}</p>
                          <p className="text-white/80 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
