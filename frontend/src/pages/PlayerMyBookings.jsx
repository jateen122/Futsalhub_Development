// frontend/src/pages/PlayerMyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  Calendar,
  Clock,
  Gift,
  IndianRupee,
  Tag,
  X,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Trophy,
  Star,
  Target,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ZapOff,
  MapPin,
  Sparkles,
  TrendingUp,
  Shield,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

async function fetchAllPages(url, token) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data)) {
      results = results.concat(data);
      break;
    }
    results = results.concat(data.results || []);
    nextUrl = data.next || null;
  }
  return results;
}

const fmt12t = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
};

const fmtDateShort = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const STATUS_CFG = {
  confirmed: {
    bar: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  pending: {
    bar: "bg-amber-500",
    pill: "bg-amber-100 text-amber-700 border-amber-200",
  },
  cancelled: {
    bar: "bg-red-500",
    pill: "bg-red-100 text-red-600 border-red-200",
  },
  refunded: {
    bar: "bg-blue-500",
    pill: "bg-blue-100 text-blue-700 border-blue-200",
  },
};

function PaymentBadge({ method }) {
  if (method === "khalti")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-xl bg-purple-100 border border-purple-200 text-purple-700">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" /> Khalti
      </span>
    );
  if (method === "cash")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Cash
      </span>
    );
  if (method === "free")
    return (
      <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-700">
        <Gift size={14} /> Free
      </span>
    );
  return null;
}

function CancelModal({ booking, onConfirm, onClose, submitting }) {
  if (!booking) return null;
  const method = booking.payment_method;
  const isKhalti = method === "khalti";
  const isCash = method === "cash";
  const isFree = method === "free" || booking.is_free_booking;
  const willGetToken = booking.can_cancel_with_token;
  const hoursLeft = booking.hours_until_slot;

  let headerGrad, heading;
  if (willGetToken) {
    headerGrad = "from-blue-600 to-indigo-600";
    heading = "Cancel & Get Rescheduling Token";
  } else if (isFree) {
    headerGrad = "from-amber-500 to-orange-500";
    heading = "Cancel Free Booking";
  } else {
    headerGrad = "from-red-500 to-rose-600";
    heading = "Cancel Booking";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div
          className={`bg-gradient-to-br ${headerGrad} px-6 py-6 text-white relative`}
        >
          <button
            onClick={() => !submitting && onClose()}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest">
            BOOKING CANCELLATION
          </p>
          <h2 className="text-lg font-bold mt-2 leading-tight">{heading}</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-5 border">
            <p className="font-bold text-base text-gray-900">
              {booking.ground_name}
            </p>
            <div className="flex flex-col gap-2 mt-4 text-gray-600 text-sm">
              <span className="flex items-center gap-2">
                <Calendar size={16} /> {fmtDate(booking.date)}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} /> {fmt12t(booking.start_time)} –{" "}
                {fmt12t(booking.end_time)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <PaymentBadge method={method} />
              {!isFree && (
                <span className="font-bold text-sm">
                  Rs {booking.total_price}
                </span>
              )}
            </div>
          </div>

          {willGetToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-bold text-blue-800 flex items-center gap-2 text-sm">
                <CheckCircle2 size={16} /> Token will be issued
              </p>
              <p className="text-blue-700 mt-2 text-xs">
                Worth <strong>Rs {booking.total_price}</strong> — valid for 30
                days.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="flex-1 py-3 border-2 border-gray-200 font-bold text-sm rounded-xl hover:bg-gray-50 transition"
            >
              Keep Booking
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              className={`flex-1 py-3 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2
                ${willGetToken ? "bg-blue-600 hover:bg-blue-700" : isFree ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"}`}
            >
              {submitting
                ? "Cancelling..."
                : willGetToken
                  ? "Cancel & Get Token"
                  : "Yes, Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultBanner({ result, onDismiss, onViewTokens }) {
  if (!result || result.type === "error") return null;
  const isToken = result.type === "token";

  return (
    <div
      className={`rounded-2xl p-5 mb-6 border flex items-start gap-4 ${isToken ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isToken ? "bg-blue-600" : "bg-emerald-600"} text-white`}
      >
        {isToken ? <RefreshCw size={20} /> : <CheckCircle2 size={20} />}
      </div>
      <div className="flex-1">
        <p
          className={`font-bold text-base ${isToken ? "text-blue-900" : "text-emerald-900"}`}
        >
          {isToken ? "Rescheduling Token Issued!" : "Booking Cancelled"}
        </p>
        <p
          className={`mt-1 text-sm ${isToken ? "text-blue-700" : "text-emerald-700"}`}
        >
          {result.message}
        </p>
        {isToken && (
          <button
            onClick={onViewTokens}
            className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center gap-2 text-xs"
          >
            <Tag size={14} /> View Tokens
          </button>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 p-1"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function LoyaltyStampCard({ record, navigate }) {
  const threshold = record.loyalty_threshold || 5;
  const progress = record.confirmed_count % threshold;
  const hasFree = record.free_bookings_available > 0;
  const pct = record.progress_to_next_free || 0;
  const imgSrc = record.ground_image
    ? record.ground_image.startsWith("http")
      ? record.ground_image
      : `${BASE_URL}${record.ground_image}`
    : null;

  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all hover:shadow-lg ${hasFree ? "border-amber-400" : "border-gray-100"}`}
    >
      <div className="relative h-32 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={record.ground_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-5xl opacity-40">
            ⚽
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {hasFree && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow">
            <Gift size={14} /> FREE
          </div>
        )}
        <div className="absolute bottom-3 left-4 text-white">
          <p className="font-bold text-sm">{record.ground_name}</p>
          <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
            <MapPin size={12} /> {record.ground_location}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progress</span>
            <span className="font-bold text-gray-900">
              {progress} / {threshold}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: threshold }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${i < progress ? "bg-amber-500 border-amber-500" : "bg-gray-100 border-gray-200"}`}
              >
                {i < progress ? (
                  <Star size={12} className="text-white" />
                ) : (
                  <span className="text-gray-400 text-xs">{i + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate(`/book/${record.ground}`)}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
            ${hasFree ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"}`}
        >
          {hasFree ? (
            <>
              <Gift size={16} /> Redeem Free
            </>
          ) : (
            <>
              <ChevronRight size={16} /> Book Again
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("bookings");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const loadData = async (silent = false) => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [allB, tokRes, loyRes] = await Promise.all([
        fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
        fetch(`${BASE_URL}/api/bookings/tokens/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/bookings/loyalty/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setBookings(allB);
      const tokData = await tokRes.json();
      setTokens(tokData.tokens || []);
      const loyData = await loyRes.json();
      setLoyaltyData(loyData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancelConfirm = async () => {
    if (!cancelTarget || submitting) return;
    setSubmitting(true);
    setCancelResult(null);
    try {
      const res = await fetch(
        `${BASE_URL}/api/bookings/${cancelTarget.id}/cancel/`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setCancelResult({
          type: "error",
          message: data.detail || "Cancellation failed.",
        });
        setCancelTarget(null);
        return;
      }
      await loadData(true);
      setCancelTarget(null);
      setCancelResult(
        data.token_issued
          ? { type: "token", message: data.token_message }
          : {
              type: "cancelled",
              message: data.token_message || "Booking cancelled.",
            },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const validTokens = tokens.filter((t) => t.is_valid);
  const expiredTokens = tokens.filter((t) => !t.is_valid);
  const loyaltyTotal = loyaltyData?.total_free_available || 0;
  const loyaltyRecs = loyaltyData?.loyalty_records || [];

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const tabs = [
    { id: "bookings", label: "My Bookings", icon: <Ticket size={18} /> },
    {
      id: "tokens",
      label: "Tokens",
      icon: <Tag size={18} />,
      badge: validTokens.length,
    },
    {
      id: "loyalty",
      label: "Loyalty",
      icon: <Trophy size={18} />,
      badge: loyaltyTotal,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => !submitting && setCancelTarget(null)}
          submitting={submitting}
        />
      )}

      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold text-base transition"
            >
              <ArrowLeft size={20} /> Dashboard
            </button>
            <span className="text-gray-300 text-xl">/</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              My Bookings
            </h1>
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-6 space-y-6">
        <ResultBanner
          result={cancelResult}
          onDismiss={() => setCancelResult(null)}
          onViewTokens={() => {
            setActiveTab("tokens");
            setCancelResult(null);
          }}
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2 border transition-all
                ${
                  activeTab === tab.id
                    ? tab.id === "loyalty"
                      ? "bg-amber-500 text-white border-amber-500"
                      : tab.id === "tokens"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900"
                }`}
            >
              {tab.icon} {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total",
                  value: stats.total,
                  icon: <Ticket size={20} />,
                  color: "from-slate-700 to-slate-900",
                },
                {
                  label: "Confirmed",
                  value: stats.confirmed,
                  icon: <CheckCircle2 size={20} />,
                  color: "from-emerald-500 to-teal-600",
                },
                {
                  label: "Pending",
                  value: stats.pending,
                  icon: <Clock size={20} />,
                  color: "from-amber-500 to-orange-500",
                },
                {
                  label: "Cancelled",
                  value: stats.cancelled,
                  icon: <Ban size={20} />,
                  color: "from-red-500 to-rose-600",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}
                  >
                    {s.icon}
                  </div>
                  <p className="text-4xl font-bold tracking-tighter text-gray-900">
                    {s.value}
                  </p>
                  <p className="text-gray-500 font-semibold mt-1 text-xs tracking-widest">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "confirmed", "cancelled"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-sm border transition-all
                    ${
                      filter === f
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900"
                    }`}
                >
                  {f === "all"
                    ? `All (${bookings.length})`
                    : `${f.charAt(0).toUpperCase() + f.slice(1)} (${bookings.filter((b) => b.status === f).length})`}
                </button>
              ))}
            </div>

            {/* Bookings List */}
            {loading ? (
              <div className="py-24 flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-6 text-base text-gray-500">
                  Loading bookings...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl py-16 text-center border border-gray-100">
                <p className="text-6xl mb-4">🎟️</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  No bookings found
                </h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm">
                  {bookings.length === 0
                    ? "You haven't made any bookings yet."
                    : "Try changing the filter."}
                </p>
                {bookings.length === 0 && (
                  <button
                    onClick={() => navigate("/grounds")}
                    className="mt-6 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-2xl text-sm"
                  >
                    Browse Grounds
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b, idx) => {
                  const cfg = STATUS_CFG[b.status] || STATUS_CFG.pending;
                  const canCancel = b.can_cancel;
                  const willGetToken = b.can_cancel_with_token;

                  return (
                    <div
                      key={b.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="flex">
                        <div className={`w-1.5 ${cfg.bar}`} />
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400 text-xs">
                                #{idx + 1}
                              </div>
                              <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                  {b.ground_name}
                                </h3>
                                {b.ground_location && (
                                  <p className="text-gray-500 flex items-center gap-1.5 mt-0.5 text-xs">
                                    <MapPin size={14} /> {b.ground_location}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.pill}`}
                            >
                              {b.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Date
                              </p>
                              <p className="text-xs font-semibold text-gray-900 mt-1">
                                {fmtDateShort(b.date)}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Time
                              </p>
                              <p className="text-xs font-semibold text-gray-900 mt-1">
                                {fmt12t(b.start_time)} – {fmt12t(b.end_time)}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                                Amount
                              </p>
                              <p
                                className={`text-lg font-bold mt-1 ${b.is_free_booking ? "text-amber-600" : "text-emerald-700"}`}
                              >
                                {b.is_free_booking
                                  ? "FREE"
                                  : `Rs ${b.total_price}`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                            <PaymentBadge method={b.payment_method} />

                            {(b.status === "confirmed" ||
                              b.status === "pending") &&
                              (canCancel ? (
                                <button
                                  onClick={() => setCancelTarget(b)}
                                  className={`px-5 py-2.5 rounded-lg font-bold text-sm text-white flex items-center gap-2 transition
                                    ${willGetToken ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}
                                >
                                  {willGetToken ? (
                                    <RefreshCw size={16} />
                                  ) : (
                                    <Ban size={16} />
                                  )}
                                  {willGetToken ? "Get Token" : "Cancel"}
                                </button>
                              ) : (
                                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-semibold">
                                  Cannot cancel
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TOKENS TAB */}
        {activeTab === "tokens" && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4">
              <Shield size={32} className="text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base text-blue-900">
                  How Tokens Work
                </h3>
                <p className="text-blue-700 mt-2 text-sm">
                  Cancel a <strong>Khalti-paid</strong> confirmed booking 4+
                  hours before to get a free token worth the full amount. Valid
                  for 30 days.
                </p>
              </div>
            </div>

            {/* Active Tokens */}
            {validTokens.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />{" "}
                  Active ({validTokens.length})
                </h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {validTokens.map((t) => (
                    <div
                      key={t.token}
                      className="bg-white rounded-2xl border-2 border-blue-200 overflow-hidden shadow-sm hover:shadow-lg transition"
                    >
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                        <p className="text-blue-200 text-xs font-semibold">
                          TOKEN
                        </p>
                        <p className="text-3xl font-bold mt-1">
                          Rs {t.original_price}
                        </p>
                        <p className="text-blue-100 text-xs mt-1">
                          {t.original_ground_name}
                        </p>
                      </div>
                      <div className="p-4">
                        <button
                          onClick={() => navigate(`/book/${t.original_ground}`)}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
                        >
                          <RefreshCw size={16} /> Rebook Free
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Tokens */}
            {expiredTokens.length > 0 && (
              <div>
                <h3 className="text-base font-bold text-gray-500 mb-3">
                  Expired / Used
                </h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {expiredTokens.map((t) => (
                    <div
                      key={t.token}
                      className="bg-white rounded-2xl border border-gray-200 p-4 opacity-75"
                    >
                      <p className="font-bold text-sm">Rs {t.original_price}</p>
                      <p className="text-gray-700 text-xs mt-1">
                        {t.original_ground_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {fmtDateShort(t.original_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tokens.length === 0 && (
              <div className="bg-white rounded-2xl py-16 text-center border border-gray-100">
                <p className="text-6xl mb-3">🎟️</p>
                <h3 className="text-xl font-bold text-gray-900">No tokens</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Cancel eligible bookings to earn tokens.
                </p>
              </div>
            )}
          </div>
        )}

        {/* LOYALTY TAB */}
        {activeTab === "loyalty" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl p-6 text-white">
              <h2 className="text-2xl font-bold">Book 5 • Get 1 Free</h2>
              <p className="text-yellow-100 mt-2 text-sm">
                Earn a free booking every 5 confirmed bookings at the same
                ground.
              </p>
            </div>

            {loyaltyRecs.length > 0 && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loyaltyRecs.map((record) => (
                  <LoyaltyStampCard
                    key={record.id}
                    record={record}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}

            {loyaltyRecs.length === 0 && !loading && (
              <div className="bg-white rounded-2xl py-16 text-center border border-gray-100">
                <p className="text-6xl mb-3">🏆</p>
                <h3 className="text-xl font-bold text-gray-900">
                  Start earning
                </h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Make confirmed bookings to earn stamps and unlock free slots.
                </p>
                <button
                  onClick={() => navigate("/grounds")}
                  className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm"
                >
                  Browse Grounds
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
