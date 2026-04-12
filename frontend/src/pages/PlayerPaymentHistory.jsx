// frontend/src/pages/PlayerPaymentHistory.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  IndianRupee,
  Calendar,
  Clock,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Wallet,
  Search,
  BarChart3,
  Receipt,
  Hash,
  Gift,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const fmtDateLong = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtDateTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtRs = (n) => {
  const num = parseFloat(n) || 0;
  if (num >= 100000) return `Rs ${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `Rs ${(num / 1000).toFixed(1)}k`;
  return `Rs ${Math.round(num).toLocaleString()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  SUCCESS: { label: "Success", icon: <CheckCircle2 size={13} />, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  success: { label: "Success", icon: <CheckCircle2 size={13} />, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAILED: { label: "Failed", icon: <XCircle size={13} />, cls: "bg-red-100 text-red-600 border-red-200" },
  failed: { label: "Failed", icon: <XCircle size={13} />, cls: "bg-red-100 text-red-600 border-red-200" },
  refunded: { label: "Refunded", icon: <RotateCcw size={13} />, cls: "bg-blue-100 text-blue-600 border-blue-200" },
  REFUNDED: { label: "Refunded", icon: <RotateCcw size={13} />, cls: "bg-blue-100 text-blue-600 border-blue-200" },
  PENDING: { label: "Pending", icon: <Clock size={13} />, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  pending: { label: "Pending", icon: <Clock size={13} />, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  INIT: { label: "Initiated", icon: <Clock size={13} />, cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Method config
// ─────────────────────────────────────────────────────────────────────────────
const METHOD_CFG = {
  khalti: {
    label: "Khalti",
    icon: <CreditCard size={18} />,
    color: "text-purple-700",
    bg: "bg-purple-100",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  cash: {
    label: "Cash on Ground",
    icon: <Wallet size={18} />,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  free: {
    label: "Free Booking",
    icon: <Gift size={18} />,
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SparkBars (mini monthly chart)
// ─────────────────────────────────────────────────────────────────────────────
function SparkBars({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-1 h-14">
      {data.map((d, i) => {
        const pct = (d.amount / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
              {d.month}: {fmtRs(d.amount)}
            </div>
            <div
              className={`w-full rounded-t transition-all duration-500 ${isLast ? "bg-yellow-400" : "bg-yellow-200"}`}
              style={{ height: `${Math.max(pct, d.amount > 0 ? 12 : 3)}%` }}
            />
            <span className="text-[10px] text-gray-400">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard — Matches Player Dashboard style
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow transition-all">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl mb-3 text-white ${accent ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-gradient-to-br from-slate-700 to-slate-800"}`}>
        {icon}
      </div>
      <p className="text-3xl font-black tracking-tight text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Row
// ─────────────────────────────────────────────────────────────────────────────
function TransactionRow({ payment, isExpanded, onToggle }) {
  const status = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const method = METHOD_CFG[payment.payment_method] || METHOD_CFG.cash;
  const isSuccess = ["success", "SUCCESS"].includes(payment.status);

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
        isExpanded ? "border-yellow-300 shadow-md" : "border-gray-100 hover:border-gray-200 hover:shadow"
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-6 py-5 text-left">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${method.bg} ${method.border}`}>
          {method.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black tracking-tight text-gray-900 text-base truncate">{payment.ground_name || "—"}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            {payment.booking_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {fmtDateLong(payment.booking_date)}
              </span>
            )}
            {payment.booking_start_time && payment.booking_end_time && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {fmt12(payment.booking_start_time)} – {fmt12(payment.booking_end_time)}
              </span>
            )}
          </div>
        </div>

        <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-2xl border ${status.cls}`}>
          {status.icon} {status.label}
        </span>

        <div className="text-right flex-shrink-0">
          <p className={`text-xl font-black ${isSuccess ? "text-gray-900" : "text-gray-400"}`}>
            Rs {parseFloat(payment.amount || 0).toLocaleString()}
          </p>
          <p className={`text-xs font-semibold ${method.color}`}>{method.label}</p>
        </div>

        <div className="text-gray-300">{isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
            {payment.transaction_id && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Hash size={10} /> Transaction ID
                </p>
                <p className="font-mono text-xs font-bold text-gray-700 break-all">{payment.transaction_id}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</p>
              <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-2xl border ${method.bg} ${method.border} ${method.color}`}>
                {method.icon} {method.label}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-2xl border ${status.cls}`}>
                {status.icon} {status.label}
              </span>
            </div>
            {payment.created_at && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Paid At</p>
                <p className="text-xs font-semibold text-gray-700">{fmtDateTime(payment.created_at)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Amount</p>
              <p className="text-xl font-black text-gray-900">Rs {parseFloat(payment.amount || 0).toLocaleString()}</p>
            </div>
            {payment.ground_name && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ground</p>
                <p className="text-xs font-bold text-gray-700">{payment.ground_name}</p>
              </div>
            )}
          </div>

          {payment.payment_method === "khalti" && payment.khalti_status && (
            <div className="mt-5 bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <CreditCard size={14} className="text-purple-600" />
              <p className="text-purple-700 text-xs font-semibold">
                Khalti status: <span className="font-black">{payment.khalti_status}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — FULL SPACE + PLAYER DASHBOARD FONT STYLE
// ─────────────────────────────────────────────────────────────────────────────
export default function PlayerPaymentHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);

  const loadPayments = async (silent = false) => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(`${BASE_URL}/api/payments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const analytics = useMemo(() => {
    const successful = payments.filter((p) => ["success", "SUCCESS"].includes(p.status));
    const totalSpent = successful.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const khaltiSpent = successful.filter((p) => p.payment_method === "khalti").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const cashSpent = successful.filter((p) => p.payment_method === "cash").reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const khaltiCount = successful.filter((p) => p.payment_method === "khalti").length;
    const cashCount = successful.filter((p) => p.payment_method === "cash").length;

    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const amount = successful
        .filter((p) => p.created_at && p.created_at.startsWith(monthKey))
        .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
      monthlyData.push({
        month: d.toLocaleDateString("en-US", { month: "short" }),
        amount,
      });
    }

    const groundCounts = {};
    successful.forEach((p) => {
      if (p.ground_name) groundCounts[p.ground_name] = (groundCounts[p.ground_name] || 0) + 1;
    });
    const topGround = Object.entries(groundCounts).sort((a, b) => b[1] - a[1])[0];

    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonthTotal = successful
      .filter((p) => p.created_at && p.created_at.startsWith(thisMonthKey))
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

    return {
      totalSpent,
      khaltiSpent,
      cashSpent,
      khaltiCount,
      cashCount,
      successCount: successful.length,
      failedCount: payments.filter((p) => ["failed", "FAILED"].includes(p.status)).length,
      monthlyData,
      topGround,
      thisMonthTotal,
      avgPerBooking: successful.length > 0 ? totalSpent / successful.length : 0,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (filter !== "all") list = list.filter((p) => p.payment_method === filter);
    if (statusFilter !== "all") list = list.filter((p) => p.status?.toLowerCase() === statusFilter.toLowerCase());
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.ground_name?.toLowerCase().includes(q) ||
          p.transaction_id?.toLowerCase().includes(q) ||
          p.booking_date?.includes(q)
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.created_at || 0);
      const db = new Date(b.created_at || 0);
      return sortDesc ? db - da : da - db;
    });
    return list;
  }, [payments, filter, statusFilter, search, sortDesc]);

  const totalFilteredAmount = filtered
    .filter((p) => ["success", "SUCCESS"].includes(p.status))
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 pb-16">
      {/* Top bar — clean like Player Dashboard */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={17} /> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Payment History</h1>
          </div>
          <button
            onClick={() => loadPayments(true)}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-2xl border border-gray-200 hover:bg-gray-50 transition text-gray-400"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Hero summary card — matches dashboard style */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div>
              <p className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">Total Amount Spent</p>
              <p className="text-5xl font-black tracking-tighter text-gray-900">Rs {analytics.totalSpent.toLocaleString()}</p>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-gray-500 text-sm">
                  across <strong className="text-gray-900">{analytics.successCount}</strong> payments
                </span>
                {analytics.thisMonthTotal > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-2xl flex items-center gap-1">
                    <TrendingUp size={13} /> Rs {analytics.thisMonthTotal.toLocaleString()} this month
                  </span>
                )}
              </div>
            </div>

            <div className="lg:w-56">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Monthly Spend (6 months)</p>
              <SparkBars data={analytics.monthlyData} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-100">
            {[
              { label: "Khalti", value: fmtRs(analytics.khaltiSpent), sub: `${analytics.khaltiCount} txns` },
              { label: "Cash", value: fmtRs(analytics.cashSpent), sub: `${analytics.cashCount} txns` },
              { label: "Avg per Booking", value: fmtRs(analytics.avgPerBooking), sub: "per booking" },
              {
                label: "Favourite Ground",
                value: analytics.topGround ? analytics.topGround[0].split(" ")[0] : "—",
                sub: analytics.topGround ? `${analytics.topGround[1]}×` : "No data",
              },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl px-4 py-4 border border-gray-100">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{s.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stat cards row — exact Player Dashboard style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<IndianRupee size={18} />} label="Total Spent" value={fmtRs(analytics.totalSpent)} sub={`${analytics.successCount} successful`} accent />
          <StatCard icon={<Receipt size={18} />} label="Total Transactions" value={payments.length} sub="all time" />
          <StatCard icon={<CheckCircle2 size={18} />} label="Successful" value={analytics.successCount} sub={`${analytics.failedCount} failed`} />
          <StatCard icon={<BarChart3 size={18} />} label="This Month" value={fmtRs(analytics.thisMonthTotal)} sub="current month" />
        </div>

        {/* Method breakdown */}
        {analytics.totalSpent > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Method Breakdown</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { method: "khalti", spent: analytics.khaltiSpent, count: analytics.khaltiCount, pct: analytics.totalSpent > 0 ? (analytics.khaltiSpent / analytics.totalSpent) * 100 : 0 },
                { method: "cash", spent: analytics.cashSpent, count: analytics.cashCount, pct: analytics.totalSpent > 0 ? (analytics.cashSpent / analytics.totalSpent) * 100 : 0 },
              ].map(({ method, spent, count, pct }) => {
                const cfg = METHOD_CFG[method];
                return (
                  <div key={method} className={`rounded-3xl border p-5 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        <p className={`font-black text-sm ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-0.5 rounded-2xl border ${cfg.color} ${cfg.bg} ${cfg.border}`}>{count} payments</span>
                    </div>
                    <p className={`text-3xl font-black ${cfg.color}`}>Rs {spent.toLocaleString()}</p>
                    <div className="mt-4 h-2 bg-white/70 rounded-3xl overflow-hidden">
                      <div className={`h-full rounded-3xl transition-all ${method === "khalti" ? "bg-purple-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className={`text-xs mt-1 ${cfg.color} opacity-70`}>{Math.round(pct)}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction list header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900">Transactions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Showing <strong>{filtered.length}</strong> of {payments.length} • Filtered total: <strong className="text-gray-700">Rs {totalFilteredAmount.toLocaleString()}</strong>
            </p>
          </div>

          <button
            onClick={() => setSortDesc((v) => !v)}
            className="flex items-center gap-2 text-xs font-medium bg-white border border-gray-200 px-4 py-2 rounded-2xl hover:bg-gray-50 transition"
          >
            <RefreshCw size={13} /> {sortDesc ? "Newest first" : "Oldest first"}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ground or transaction ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-5 py-3 text-sm border border-gray-200 rounded-3xl focus:outline-none focus:border-yellow-400 transition"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { val: "all", label: "All" },
                { val: "khalti", label: "Khalti" },
                { val: "cash", label: "Cash" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-5 py-3 rounded-3xl text-sm font-semibold transition border ${
                    filter === val ? "bg-yellow-500 text-white border-yellow-500" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { val: "all", label: "Any Status" },
                { val: "success", label: "Success" },
                { val: "failed", label: "Failed" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`px-5 py-3 rounded-3xl text-sm font-semibold transition border ${
                    statusFilter === val
                      ? val === "success"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-4 text-sm">Loading payment history…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Receipt size={30} className="text-gray-300" />
            </div>
            <h3 className="text-2xl font-black tracking-tight text-gray-900 mb-2">{payments.length === 0 ? "No payments yet" : "No results found"}</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              {payments.length === 0
                ? "Your payment records will appear here once you book and pay for a ground."
                : "Try changing your search or filters."}
            </p>
            {payments.length === 0 && (
              <button
                onClick={() => navigate("/grounds")}
                className="mt-6 px-7 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-3xl transition"
              >
                Browse Grounds
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((payment) => (
              <TransactionRow
                key={payment.id}
                payment={payment}
                isExpanded={expanded === payment.id}
                onToggle={() => setExpanded((prev) => (prev === payment.id ? null : payment.id))}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-sm">
            <p className="text-gray-400">
              <strong className="text-gray-800">{filtered.length}</strong> transactions shown
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Filtered successful total</span>
              <span className="text-xl font-black text-gray-900">Rs {totalFilteredAmount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}