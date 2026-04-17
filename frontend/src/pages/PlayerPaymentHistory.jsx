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
  Gift,
  MapPin,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

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

const STATUS_CFG = {
  SUCCESS: {
    label: "Success",
    icon: <CheckCircle2 size={16} />,
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  success: {
    label: "Success",
    icon: <CheckCircle2 size={16} />,
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  FAILED: {
    label: "Failed",
    icon: <XCircle size={16} />,
    cls: "bg-red-100 text-red-600 border-red-200",
  },
  failed: {
    label: "Failed",
    icon: <XCircle size={16} />,
    cls: "bg-red-100 text-red-600 border-red-200",
  },
  refunded: {
    label: "Refunded",
    icon: <RotateCcw size={16} />,
    cls: "bg-blue-100 text-blue-600 border-blue-200",
  },
  REFUNDED: {
    label: "Refunded",
    icon: <RotateCcw size={16} />,
    cls: "bg-blue-100 text-blue-600 border-blue-200",
  },
  PENDING: {
    label: "Pending",
    icon: <Clock size={16} />,
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
  pending: {
    label: "Pending",
    icon: <Clock size={16} />,
    cls: "bg-amber-100 text-amber-700 border-amber-200",
  },
};

const METHOD_CFG = {
  khalti: {
    label: "Khalti",
    icon: <CreditCard size={18} />,
    color: "text-purple-700",
    bg: "bg-purple-100",
    border: "border-purple-200",
  },
  cash: {
    label: "Cash on Ground",
    icon: <Wallet size={18} />,
    color: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
  },
  free: {
    label: "Free Booking",
    icon: <Gift size={18} />,
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
};

function SparkBars({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d, i) => {
        const pct = (d.amount / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group relative"
          >
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 shadow">
              {d.month}: {fmtRs(d.amount)}
            </div>
            <div
              className={`w-full rounded-t-lg transition-all ${isLast ? "bg-amber-500" : "bg-amber-200"}`}
              style={{ height: `${Math.max(pct, 8)}%` }}
            />
            <span className="text-xs font-semibold text-gray-500">
              {d.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PaymentBadge({ method }) {
  if (method === "khalti")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-purple-100 border border-purple-200 text-purple-700">
        <span className="w-1 h-1 rounded-full bg-purple-600" /> Khalti
      </span>
    );
  if (method === "cash")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-700">
        <span className="w-1 h-1 rounded-full bg-emerald-600" /> Cash
      </span>
    );
  if (method === "free")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-amber-100 border border-amber-200 text-amber-700">
        <Gift size={12} /> Free
      </span>
    );
  return null;
}

function TransactionRow({ payment, isExpanded, onToggle }) {
  const status = STATUS_CFG[payment.status] || STATUS_CFG.pending;
  const method = METHOD_CFG[payment.payment_method] || METHOD_CFG.cash;
  const isSuccess = ["success", "SUCCESS"].includes(payment.status);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all ${isExpanded ? "border-amber-400 shadow-lg" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${method.bg} ${method.border}`}
        >
          {method.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg text-gray-900 truncate">
            {payment.ground_name || "Unknown Ground"}
          </p>
          <div className="flex items-center gap-3 mt-1 text-gray-600 text-xs flex-wrap">
            {payment.booking_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {fmtDateLong(payment.booking_date)}
              </span>
            )}
            {payment.booking_start_time && payment.booking_end_time && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {fmt12(payment.booking_start_time)} –{" "}
                {fmt12(payment.booking_end_time)}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p
            className={`font-semibold text-sm ${isSuccess ? "text-gray-900" : "text-gray-400 line-through"}`}
          >
            Rs {parseFloat(payment.amount || 0).toLocaleString()}
          </p>
          <p className={`text-xs font-semibold mt-1 ${method.color}`}>
            {method.label}
          </p>
        </div>

        <div className="text-gray-400 ml-2">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            {payment.transaction_id && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Transaction ID
                </p>
                <p className="font-mono text-xs text-gray-700 break-all">
                  {payment.transaction_id}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Payment Method
              </p>
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${method.bg} ${method.border} ${method.color}`}
              >
                {method.icon} {method.label}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Status
              </p>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${status.cls}`}
              >
                {status.icon} {status.label}
              </span>
            </div>
            {payment.created_at && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Paid At
                </p>
                <p className="text-xs text-gray-700">
                  {fmtDateTime(payment.created_at)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                Amount
              </p>
              <p className="font-semibold text-gray-900 text-sm">
                Rs {parseFloat(payment.amount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {payment.payment_method === "khalti" && payment.khalti_status && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-3">
              <CreditCard size={16} className="text-purple-600" />
              <p className="text-purple-700 text-xs font-medium">
                Khalti Status:{" "}
                <span className="font-bold">{payment.khalti_status}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
    const successful = payments.filter((p) =>
      ["success", "SUCCESS"].includes(p.status),
    );
    const totalSpent = successful.reduce(
      (s, p) => s + parseFloat(p.amount || 0),
      0,
    );
    const khaltiSpent = successful
      .filter((p) => p.payment_method === "khalti")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const cashSpent = successful
      .filter((p) => p.payment_method === "cash")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    const khaltiCount = successful.filter(
      (p) => p.payment_method === "khalti",
    ).length;
    const cashCount = successful.filter(
      (p) => p.payment_method === "cash",
    ).length;

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
      if (p.ground_name)
        groundCounts[p.ground_name] = (groundCounts[p.ground_name] || 0) + 1;
    });
    const topGround = Object.entries(groundCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];

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
      failedCount: payments.filter((p) =>
        ["failed", "FAILED"].includes(p.status),
      ).length,
      monthlyData,
      topGround,
      thisMonthTotal,
      avgPerBooking: successful.length > 0 ? totalSpent / successful.length : 0,
    };
  }, [payments]);

  const filtered = useMemo(() => {
    let list = [...payments];
    if (filter !== "all")
      list = list.filter((p) => p.payment_method === filter);
    if (statusFilter !== "all")
      list = list.filter(
        (p) => p.status?.toLowerCase() === statusFilter.toLowerCase(),
      );

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.ground_name?.toLowerCase().includes(q) ||
          p.transaction_id?.toLowerCase().includes(q) ||
          p.booking_date?.includes(q),
      );
    }

    list.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
    if (!sortDesc) list.reverse();

    return list;
  }, [payments, filter, statusFilter, search, sortDesc]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-base transition"
            >
              <ArrowLeft size={18} /> Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Payment History
            </h1>
          </div>

          <button
            onClick={() => loadPayments(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-6 space-y-6">
        {/* Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
            <div>
              <p className="text-amber-600 font-semibold uppercase tracking-widest text-xs">
                Total Amount Spent
              </p>
              <p className="text-4xl font-bold tracking-tighter text-gray-900 mt-3">
                {fmtRs(analytics.totalSpent)}
              </p>
              <p className="text-gray-600 mt-3 text-sm">
                Across{" "}
                <span className="font-semibold text-gray-900">
                  {analytics.successCount}
                </span>{" "}
                successful bookings
              </p>
            </div>

            <div className="lg:w-64">
              <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs mb-3">
                Monthly Trend
              </p>
              <SparkBars data={analytics.monthlyData} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              {
                label: "Khalti",
                value: fmtRs(analytics.khaltiSpent),
                sub: `${analytics.khaltiCount} payments`,
              },
              {
                label: "Cash",
                value: fmtRs(analytics.cashSpent),
                sub: `${analytics.cashCount} payments`,
              },
              {
                label: "Avg per Booking",
                value: fmtRs(analytics.avgPerBooking),
                sub: "",
              },
              {
                label: "This Month",
                value: fmtRs(analytics.thisMonthTotal),
                sub: "current month",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-lg p-3"
              >
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {item.label}
                </p>
                <p className="text-xl font-bold text-gray-900 mt-2">
                  {item.value}
                </p>
                {item.sub && (
                  <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: <IndianRupee size={20} />,
              label: "Total Spent",
              value: fmtRs(analytics.totalSpent),
              color: "from-slate-700 to-slate-900",
            },
            {
              icon: <Receipt size={20} />,
              label: "Transactions",
              value: payments.length,
              color: "from-blue-500 to-indigo-600",
            },
            {
              icon: <CheckCircle2 size={20} />,
              label: "Successful",
              value: analytics.successCount,
              color: "from-emerald-500 to-teal-600",
            },
            {
              icon: <BarChart3 size={20} />,
              label: "This Month",
              value: fmtRs(analytics.thisMonthTotal),
              color: "from-amber-500 to-orange-500",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
            >
              <div
                className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}
              >
                {s.icon}
              </div>
              <p className="text-3xl font-bold tracking-tighter text-gray-900">
                {s.value}
              </p>
              <p className="text-gray-500 font-semibold mt-1 text-xs tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Payment Method Breakdown */}
        {analytics.totalSpent > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="font-semibold text-gray-500 uppercase tracking-widest text-xs mb-6">
              Payment Method Breakdown
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  method: "khalti",
                  spent: analytics.khaltiSpent,
                  count: analytics.khaltiCount,
                },
                {
                  method: "cash",
                  spent: analytics.cashSpent,
                  count: analytics.cashCount,
                },
              ].map(({ method, spent, count }) => {
                const cfg = METHOD_CFG[method];
                const pct =
                  analytics.totalSpent > 0
                    ? Math.round((spent / analytics.totalSpent) * 100)
                    : 0;

                return (
                  <div
                    key={method}
                    className={`rounded-2xl p-5 border ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {cfg.icon}
                        <div>
                          <p className={`font-bold text-lg ${cfg.color}`}>
                            {cfg.label}
                          </p>
                          <p className="text-gray-600 mt-0.5 text-xs">
                            {count} transactions
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-gray-900">
                        Rs {spent.toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-4 h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${method === "khalti" ? "bg-purple-600" : "bg-emerald-600"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p
                      className={`text-right mt-2 font-medium text-xs ${cfg.color}`}
                    >
                      {pct}% of total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                All Transactions
              </h2>
              <p className="text-gray-500 mt-1 text-xs">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {filtered.length}
                </span>{" "}
                of {payments.length} transactions
              </p>
            </div>

            <button
              onClick={() => setSortDesc((v) => !v)}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
            >
              <RefreshCw size={16} />
              {sortDesc ? "Newest First" : "Oldest First"}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search ground or transaction ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm placeholder-gray-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "khalti", "cash"].map((m) => (
                <button
                  key={m}
                  onClick={() => setFilter(m)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                    filter === m
                      ? "bg-amber-500 text-white border-amber-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m === "all"
                    ? "All Methods"
                    : m === "khalti"
                      ? "Khalti"
                      : "Cash"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "success", "failed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                    statusFilter === s
                      ? s === "success"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : s === "failed"
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-amber-500 text-white border-amber-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {s === "all"
                    ? "Any Status"
                    : s === "success"
                      ? "Success"
                      : "Failed"}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction List */}
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-6 text-base text-gray-500">
                Loading payment history...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl py-16 text-center border border-gray-100">
              <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900">
                {payments.length === 0 ? "No payments yet" : "No results found"}
              </h3>
              <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
                {payments.length === 0
                  ? "Your payment records will appear here after you complete a booking."
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {filtered.map((payment) => (
                <TransactionRow
                  key={payment.id}
                  payment={payment}
                  isExpanded={expanded === payment.id}
                  onToggle={() =>
                    setExpanded((prev) =>
                      prev === payment.id ? null : payment.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
