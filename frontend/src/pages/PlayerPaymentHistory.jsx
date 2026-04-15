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
// Format Helpers
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
// Status & Method Config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  SUCCESS: { label: "Success", icon: <CheckCircle2 size={16} />, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  success: { label: "Success", icon: <CheckCircle2 size={16} />, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  FAILED: { label: "Failed", icon: <XCircle size={16} />, cls: "bg-red-100 text-red-600 border-red-200" },
  failed: { label: "Failed", icon: <XCircle size={16} />, cls: "bg-red-100 text-red-600 border-red-200" },
  refunded: { label: "Refunded", icon: <RotateCcw size={16} />, cls: "bg-blue-100 text-blue-600 border-blue-200" },
  REFUNDED: { label: "Refunded", icon: <RotateCcw size={16} />, cls: "bg-blue-100 text-blue-600 border-blue-200" },
  PENDING: { label: "Pending", icon: <Clock size={16} />, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  pending: { label: "Pending", icon: <Clock size={16} />, cls: "bg-amber-100 text-amber-700 border-amber-200" },
};

const METHOD_CFG = {
  khalti: {
    label: "Khalti",
    icon: <CreditCard size={22} />,
    color: "text-purple-700",
    bg: "bg-purple-100",
    border: "border-purple-200",
  },
  cash: {
    label: "Cash on Ground",
    icon: <Wallet size={22} />,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
  },
  free: {
    label: "Free Booking",
    icon: <Gift size={22} />,
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SparkBars Component
// ─────────────────────────────────────────────────────────────────────────────
function SparkBars({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {data.map((d, i) => {
        const pct = (d.amount / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group relative">
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow-xl transition-all">
              {d.month}: {fmtRs(d.amount)}
            </div>
            <div
              className={`w-full rounded-t-2xl transition-all duration-700 ${isLast ? "bg-amber-500" : "bg-amber-200"}`}
              style={{ height: `${Math.max(pct, 12)}%` }}
            />
            <span className="text-xs font-semibold text-gray-500">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCard - Professional Design
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-2xl mb-6 ${accent ? "bg-gradient-to-br from-amber-400 to-yellow-500" : "bg-gradient-to-br from-slate-800 to-slate-900"} text-white`}>
        {icon}
      </div>
      <p className="text-base font-semibold tracking-tighter text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction Row - Clean & Professional
// ─────────────────────────────────────────────────────────────────────────────
function TransactionRow({ payment, isExpanded, onToggle }) {
  const status = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const method = METHOD_CFG[payment.payment_method] || METHOD_CFG.cash;
  const isSuccess = ["success", "SUCCESS"].includes(payment.status);

  return (
    <div
      className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
        isExpanded ? "border-amber-400 shadow-xl" : "border-gray-100 hover:border-gray-200 hover:shadow-md"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-6 px-4 py-4 text-left hover:bg-gray-50/80 transition"
      >
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${method.bg} ${method.border}`}>
          {method.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-xl text-gray-900 tracking-tight truncate">
            {payment.ground_name || "Unknown Ground"}
          </p>
          <div className="flex items-center gap-5 mt-2 text-gray-600 text-base">
            {payment.booking_date && (
              <span className="flex items-center gap-2">
                <Calendar size={18} /> {fmtDateLong(payment.booking_date)}
              </span>
            )}
            {payment.booking_start_time && payment.booking_end_time && (
              <span className="flex items-center gap-2">
                <Clock size={18} /> {fmt12(payment.booking_start_time)} – {fmt12(payment.booking_end_time)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-semibold tracking-tight ${isSuccess ? "text-gray-900" : "text-gray-400 line-through"}`}>
            Rs {parseFloat(payment.amount || 0).toLocaleString()}
          </p>
          <p className={`text-base font-semibold mt-1 ${method.color}`}>{method.label}</p>
        </div>

        <div className="text-gray-400 ml-3">
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8 text-base">
            {payment.transaction_id && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Transaction ID</p>
                <p className="font-mono font-medium text-gray-700 break-all">{payment.transaction_id}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
              <span className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border text-base font-semibold ${method.bg} ${method.border} ${method.color}`}>
                {method.icon} {method.label}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Status</p>
              <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border text-base font-semibold ${status.cls}`}>
                {status.icon} {status.label}
              </span>
            </div>
            {payment.created_at && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Paid At</p>
                <p className="font-medium text-gray-700">{fmtDateTime(payment.created_at)}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Amount</p>
              <p className="text-lg font-semibold text-gray-900">Rs {parseFloat(payment.amount || 0).toLocaleString()}</p>
            </div>
          </div>

          {payment.payment_method === "khalti" && payment.khalti_status && (
            <div className="mt-8 bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-center gap-4">
              <CreditCard size={20} className="text-purple-600" />
              <p className="text-purple-700 font-medium">
                Khalti Status: <span className="font-bold">{payment.khalti_status}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT — PROFESSIONAL FULL-WIDTH UI
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
      console.error("Failed to load payments:", e);
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
        .filter((p) => p.created_at?.startsWith(monthKey))
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
      .filter((p) => p.created_at?.startsWith(thisMonthKey))
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
      list = list.filter((p) =>
        p.ground_name?.toLowerCase().includes(q) ||
        p.transaction_id?.toLowerCase().includes(q) ||
        p.booking_date?.includes(q)
      );
    }

    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (!sortDesc) list.reverse();

    return list;
  }, [payments, filter, statusFilter, search, sortDesc]);

  const totalFilteredAmount = filtered
    .filter((p) => ["success", "SUCCESS"].includes(p.status))
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-6 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition font-medium text-lg"
            >
              <ArrowLeft size={24} /> Dashboard
            </button>
            <span className="text-gray-300 text-2xl">/</span>
            <h1 className="text-lg font-semibold tracking-tight text-gray-900">Payment History</h1>
          </div>

          <button
            onClick={() => loadPayments(true)}
            disabled={refreshing}
            className="flex items-center gap-3 px-7 py-3.5 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium disabled:opacity-70"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content - Full Width Professional Layout */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-12 space-y-12">
        {/* Hero Summary */}
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 lg:p-4">
          <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
            <div>
              <p className="text-amber-600 font-semibold uppercase tracking-widest text-sm">TOTAL AMOUNT SPENT</p>
              <p className="text-base font-semibold tracking-tighter text-gray-900 mt-4">
                Rs {analytics.totalSpent.toLocaleString()}
              </p>
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                <span>Across <span className="font-semibold text-gray-900">{analytics.successCount}</span> successful bookings</span>
                {analytics.thisMonthTotal > 0 && (
                  <span className="bg-amber-100 text-amber-700 px-6 py-2 rounded-2xl font-semibold flex items-center gap-2 text-base">
                    <TrendingUp size={20} /> Rs {analytics.thisMonthTotal.toLocaleString()} this month
                  </span>
                )}
              </div>
            </div>

            <div className="lg:w-[380px]">
              <p className="text-gray-500 font-semibold uppercase tracking-widest text-sm mb-4">MONTHLY SPEND TREND</p>
              <SparkBars data={analytics.monthlyData} />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {[
              { label: "Khalti", value: fmtRs(analytics.khaltiSpent), sub: `${analytics.khaltiCount} payments` },
              { label: "Cash on Ground", value: fmtRs(analytics.cashSpent), sub: `${analytics.cashCount} payments` },
              { label: "Average per Booking", value: fmtRs(analytics.avgPerBooking), sub: "" },
              {
                label: "Favourite Ground",
                value: analytics.topGround ? analytics.topGround[0].split(" ")[0] : "—",
                sub: analytics.topGround ? `${analytics.topGround[1]} bookings` : "",
              },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 border border-gray-100 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{item.label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-2">{item.value}</p>
                {item.sub && <p className="text-sm text-gray-500 mt-3">{item.sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<IndianRupee size={26} />} label="Total Spent" value={fmtRs(analytics.totalSpent)} sub={`${analytics.successCount} successful payments`} accent />
          <StatCard icon={<Receipt size={26} />} label="Total Transactions" value={payments.length} sub="including failed & pending" />
          <StatCard icon={<CheckCircle2 size={26} />} label="Successful" value={analytics.successCount} sub={`${analytics.failedCount} failed`} />
          <StatCard icon={<BarChart3 size={26} />} label="This Month" value={fmtRs(analytics.thisMonthTotal)} sub="current month" />
        </div>

        {/* Payment Method Breakdown */}
        {analytics.totalSpent > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow p-10">
            <p className="font-semibold text-gray-500 uppercase tracking-widest text-sm mb-8">PAYMENT METHOD BREAKDOWN</p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { method: "khalti", spent: analytics.khaltiSpent, count: analytics.khaltiCount },
                { method: "cash", spent: analytics.cashSpent, count: analytics.cashCount },
              ].map(({ method, spent, count }) => {
                const cfg = METHOD_CFG[method];
                const pct = analytics.totalSpent > 0 ? Math.round((spent / analytics.totalSpent) * 100) : 0;

                return (
                  <div key={method} className={`rounded-3xl p-10 border ${cfg.bg} ${cfg.border}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        {cfg.icon}
                        <div>
                          <p className={`font-bold text-2xl ${cfg.color}`}>{cfg.label}</p>
                          <p className="text-gray-600 mt-1">{count} transactions</p>
                        </div>
                      </div>
                      <p className="text-base font-semibold text-gray-900">Rs {spent.toLocaleString()}</p>
                    </div>

                    <div className="mt-10 h-3 bg-white rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${method === "khalti" ? "bg-purple-600" : "bg-emerald-600"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className={`text-right mt-3 font-medium ${cfg.color}`}>{pct}% of total spend</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">All Transactions</h2>
              <p className="text-gray-500 mt-2 text-lg">
                Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {payments.length} transactions
              </p>
            </div>

            <button
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-3 px-8 py-4 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium text-base"
            >
              <RefreshCw size={20} />
              {sortDesc ? "Newest First" : "Oldest First"}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl border border-gray-100 p-4 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ground name or transaction ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-16 pr-6 py-4 border border-gray-200 rounded-3xl focus:outline-none focus:border-amber-400 text-lg placeholder-gray-400"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {[{ val: "all", label: "All Methods" }, { val: "khalti", label: "Khalti" }, { val: "cash", label: "Cash" }].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-8 py-2 rounded-lg text-sm font-semibold border transition ${
                    filter === val ? "bg-amber-500 text-white border-amber-500" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {[{ val: "all", label: "Any Status" }, { val: "success", label: "Success" }, { val: "failed", label: "Failed" }].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setStatusFilter(val)}
                  className={`px-8 py-2 rounded-lg text-sm font-semibold border transition ${
                    statusFilter === val
                      ? val === "success"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "bg-red-500 text-white border-red-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div className="py-28 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-8 text-xl text-gray-500">Loading payment history...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl py-24 text-center border border-gray-100">
              <Receipt size={64} className="mx-auto text-gray-300 mb-8" />
              <h3 className="text-lg font-semibold text-gray-900">
                {payments.length === 0 ? "No payments yet" : "No results found"}
              </h3>
              <p className="text-gray-500 mt-4 text-lg max-w-md mx-auto">
                {payments.length === 0 ? "Your payment records will appear here after you complete a booking." : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-5 pb-12">
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
        </div>
      </div>
    </div>
  );
}