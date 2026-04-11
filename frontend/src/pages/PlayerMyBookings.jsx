// frontend/src/pages/PlayerMyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket, Calendar, Clock, Gift, IndianRupee, Tag, X,
  AlertTriangle, CheckCircle2, Ban, Trophy, Star, Target,
  ArrowLeft, RefreshCw, ChevronRight,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAllPages(url, token) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res  = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data)) { results = results.concat(data); break; }
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
    weekday: "long", month: "short", day: "numeric",
  });
};

const fmtDateShort = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PaymentBadge
// ─────────────────────────────────────────────────────────────────────────────
function PaymentBadge({ method }) {
  if (method === "khalti") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700">
      <span className="w-2 h-2 rounded-full bg-purple-500" /> Khalti
    </span>
  );
  if (method === "cash") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700">
      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash on Ground
    </span>
  );
  if (method === "free") return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700">
      🎁 Free Booking
    </span>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    cancelled: "bg-red-100 text-red-600 border-red-200",
    refunded:  "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CancelModal
// ─────────────────────────────────────────────────────────────────────────────
function CancelModal({ booking, onConfirm, onClose, submitting }) {
  if (!booking) return null;

  const method       = booking.payment_method;
  const isKhalti     = method === "khalti";
  const isCash       = method === "cash";
  const isFree       = method === "free" || booking.is_free_booking;
  const willGetToken = booking.can_cancel_with_token;
  const hoursLeft    = booking.hours_until_slot;

  let headerGrad, iconEmoji, heading;
  if (willGetToken) {
    headerGrad = "from-blue-500 to-indigo-600";
    iconEmoji  = "🔄";
    heading    = "Cancel & Get Rescheduling Token";
  } else if (isFree) {
    headerGrad = "from-amber-500 to-orange-500";
    iconEmoji  = "🎁";
    heading    = "Cancel Free Booking";
  } else {
    headerGrad = "from-red-500 to-rose-600";
    iconEmoji  = "✕";
    heading    = "Cancel Booking";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Coloured header */}
        <div className={`bg-gradient-to-br ${headerGrad} px-7 py-6 text-white relative`}>
          <button
            onClick={() => !submitting && onClose()}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
          >
            <X size={15} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {iconEmoji}
            </div>
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">
                Booking Cancellation
              </p>
              <h2 className="text-lg font-black leading-tight">{heading}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-6 space-y-4">

          {/* Booking summary */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="font-black text-gray-900 text-lg">{booking.ground_name}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" /> {fmtDate(booking.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" /> {fmt12t(booking.start_time)} – {fmt12t(booking.end_time)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <PaymentBadge method={method} />
              {!isFree && (
                <span className="text-sm font-bold text-gray-700">Rs {booking.total_price}</span>
              )}
            </div>
          </div>

          {/* Scenario-specific info */}
          {willGetToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2">
                <Tag size={14} /> Rescheduling Token Will Be Issued
              </p>
              <p className="text-blue-700 text-sm leading-relaxed">
                Your slot is <strong>{hoursLeft ? `${Math.round(hoursLeft)} hours` : "more than 4 hours"} away</strong> and
                you paid via <strong>Khalti</strong>. You'll receive a free rescheduling token
                worth <strong>Rs {booking.total_price}</strong> — valid for 30 days at the same ground.
              </p>
              <p className="text-blue-500 text-xs mt-2 font-semibold">
                ✅ Valid for 30 days · Same ground only · 100% free
              </p>
            </div>
          )}

          {isCash && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                <AlertTriangle size={14} /> Cash Booking — No Token Issued
              </p>
              <p className="text-amber-700 text-sm leading-relaxed">
                Rescheduling tokens are only issued for <strong>Khalti-paid</strong> bookings.
                Cancelling this cash booking will simply free up the slot with no credit issued.
              </p>
            </div>
          )}

          {isKhalti && !willGetToken && !isFree && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold text-red-800 text-sm flex items-center gap-2 mb-2">
                <Ban size={14} /> Within 4-Hour Cancellation Window
              </p>
              <p className="text-red-700 text-sm leading-relaxed">
                Your slot starts in less than <strong>4 hours</strong>. Cancellations within
                this window do not qualify for a rescheduling token.
              </p>
            </div>
          )}

          {isFree && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2">
                <Gift size={14} /> Free Booking Cancellation
              </p>
              <p className="text-amber-700 text-sm leading-relaxed">
                Cancelling a loyalty free booking frees up the slot.
                Your loyalty stamp progress will not change.
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="flex-1 py-3.5 border-2 border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition disabled:opacity-50"
            >
              Keep Booking
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting}
              className={`flex-1 py-3.5 text-white font-black rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2
                ${willGetToken
                  ? "bg-blue-500 hover:bg-blue-600"
                  : isFree
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-red-500 hover:bg-red-600"}`}
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Cancelling…</>
              ) : willGetToken ? "Cancel & Get Token" : "Yes, Cancel Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ResultBanner — shown after a successful or failed cancel action
// ─────────────────────────────────────────────────────────────────────────────
function ResultBanner({ result, onDismiss, onViewTokens }) {
  if (!result || result.type === "error") return null;
  const isToken = result.type === "token";

  return (
    <div className={`rounded-3xl p-5 mb-8 border-2 flex items-start gap-4
      ${isToken ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}>
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-xl
        ${isToken ? "bg-blue-500" : "bg-gray-400"}`}>
        {isToken ? "🔄" : "✓"}
      </div>
      <div className="flex-1">
        <p className={`font-black text-lg ${isToken ? "text-blue-900" : "text-gray-700"}`}>
          {isToken ? "Rescheduling Token Issued!" : "Booking Cancelled"}
        </p>
        <p className={`text-sm mt-1 leading-relaxed ${isToken ? "text-blue-700" : "text-gray-500"}`}>
          {result.message}
        </p>
        {isToken && (
          <button
            onClick={onViewTokens}
            className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition"
          >
            <Tag size={14} /> View My Tokens →
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition">
        <X size={18} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoyaltyStampCard — one card per ground in the Loyalty tab
// ─────────────────────────────────────────────────────────────────────────────
function LoyaltyStampCard({ record, navigate }) {
  const threshold = record.loyalty_threshold || 5;
  const progress  = record.confirmed_count % threshold;
  const hasFree   = record.free_bookings_available > 0;
  const pct       = record.progress_to_next_free || 0;

  const imgSrc = record.ground_image
    ? record.ground_image.startsWith("http") ? record.ground_image : `${BASE_URL}${record.ground_image}`
    : null;

  return (
    <div className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 transition-all
      ${hasFree ? "border-amber-400 shadow-amber-100 shadow-lg" : "border-gray-100"}`}>

      {/* Ground image */}
      <div className="relative h-36 bg-gradient-to-br from-amber-50 to-yellow-100 overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt={record.ground_name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">⚽</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {hasFree && (
          <div className="absolute top-3 right-3 bg-amber-400 text-black text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow">
            <Gift size={11} /> FREE READY
          </div>
        )}
        <div className="absolute bottom-3 left-4">
          <p className="text-white font-black text-lg leading-tight drop-shadow">{record.ground_name}</p>
          <p className="text-white/70 text-xs">{record.ground_location}</p>
        </div>
      </div>

      <div className="p-5">

        {/* Stamp grid */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-semibold">Booking stamps</span>
            <span className="font-black text-gray-700">{progress} / {threshold}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: threshold }).map((_, i) => {
              const filled = i < progress;
              return (
                <div key={i} className={`flex-1 h-9 rounded-xl border-2 flex items-center justify-center transition-all
                  ${filled
                    ? "bg-amber-400 border-amber-400 shadow-sm shadow-amber-200"
                    : "bg-gray-50 border-gray-200"}`}>
                  {filled
                    ? <Star size={14} className="text-white fill-white" />
                    : <span className="text-gray-300 text-xs font-bold">{i + 1}</span>}
                </div>
              );
            })}
            <div className="mx-1 text-gray-300 font-bold text-sm">=</div>
            <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center flex-shrink-0
              ${hasFree ? "bg-amber-400 border-amber-400" : "bg-gray-50 border-dashed border-gray-300"}`}>
              <Gift size={14} className={hasFree ? "text-white" : "text-gray-300"} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Confirmed", value: record.confirmed_count,      color: "text-gray-800" },
            { label: "Earned",    value: record.free_bookings_earned, color: "text-amber-600" },
            { label: "Used",      value: record.free_bookings_used,   color: "text-gray-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2.5 text-center border border-gray-100">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Status */}
        <p className="text-sm text-center mb-4">
          {hasFree
            ? <span className="text-amber-600 font-bold">🎉 Free booking ready to use!</span>
            : <span className="text-gray-500">
                {record.bookings_until_next_free} more booking{record.bookings_until_next_free !== 1 ? "s" : ""} needed
              </span>}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate(`/book/${record.ground}`)}
          className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition
            ${hasFree
              ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-md hover:shadow-lg"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}
        >
          {hasFree
            ? <><Gift size={15} /> Redeem Free Booking</>
            : <><ChevronRight size={15} /> Book This Ground</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings,     setBookings]     = useState([]);
  const [tokens,       setTokens]       = useState([]);
  const [loyaltyData,  setLoyaltyData]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [activeTab,    setActiveTab]    = useState("bookings");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  // ── load ──────────────────────────────────────────────────────────────────
  const loadData = async (silent = false) => {
    if (!token) { navigate("/login"); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [allB, tokRes, loyRes] = await Promise.all([
        fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
        fetch(`${BASE_URL}/api/bookings/tokens/`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/bookings/loyalty/`, { headers: { Authorization: `Bearer ${token}` } }),
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

  useEffect(() => { loadData(); }, []);

  // ── cancel ────────────────────────────────────────────────────────────────
  const handleCancelConfirm = async () => {
    if (!cancelTarget || submitting) return;
    setSubmitting(true);
    setCancelResult(null);

    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/${cancelTarget.id}/cancel/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setCancelResult({ type: "error", message: data.detail || "Cancellation failed." });
        setCancelTarget(null);
        return;
      }

      await loadData(true);
      setCancelTarget(null);

      if (data.token_issued) {
        setCancelResult({ type: "token",     message: data.token_message });
      } else {
        setCancelResult({ type: "cancelled", message: data.token_message || "Booking cancelled successfully." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const filtered      = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const validTokens   = tokens.filter((t) => t.is_valid);
  const expiredTokens = tokens.filter((t) => !t.is_valid);
  const loyaltyTotal  = loyaltyData?.total_free_available || 0;
  const loyaltyRecs   = loyaltyData?.loyalty_records || [];

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const tabs = [
    { id: "bookings", label: "My Bookings",    icon: <Ticket size={14} />,  badge: null },
    { id: "tokens",   label: "Reschedule",      icon: <Tag size={14} />,     badge: validTokens.length  || null },
    { id: "loyalty",  label: "Loyalty Rewards", icon: <Trophy size={14} />,  badge: loyaltyTotal        || null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancelConfirm}
          onClose={() => !submitting && setCancelTarget(null)}
          submitting={submitting}
        />
      )}

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
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
            <h1 className="text-xl font-black text-gray-900">My Bookings</h1>
          </div>

          <div className="flex items-center gap-2">
            {loyaltyTotal > 0 && (
              <button
                onClick={() => setActiveTab("loyalty")}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow hover:shadow-md transition"
              >
                <Gift size={13} /> {loyaltyTotal} Free {loyaltyTotal > 1 ? "Bookings" : "Booking"}
              </button>
            )}
            {validTokens.length > 0 && (
              <button
                onClick={() => setActiveTab("tokens")}
                className="flex items-center gap-1.5 bg-blue-500 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow hover:bg-blue-600 transition"
              >
                <Tag size={13} /> {validTokens.length} Token{validTokens.length > 1 ? "s" : ""}
              </button>
            )}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-400"
              title="Refresh"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Result banner */}
        <ResultBanner
          result={cancelResult}
          onDismiss={() => setCancelResult(null)}
          onViewTokens={() => { setActiveTab("tokens"); setCancelResult(null); }}
        />

        {/* Error banner */}
        {cancelResult?.type === "error" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p className="text-red-700 font-semibold text-sm flex-1">{cancelResult.message}</p>
            <button onClick={() => setCancelResult(null)}>
              <X size={16} className="text-red-400" />
            </button>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="flex gap-1.5 mb-8 bg-white p-1.5 rounded-2xl shadow-sm w-fit border border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5
                ${activeTab === tab.id
                  ? tab.id === "loyalty" ? "bg-amber-400 text-white shadow-sm"
                    : tab.id === "tokens" ? "bg-blue-500 text-white shadow-sm"
                    : "bg-yellow-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== null && (
                <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ml-0.5
                  ${activeTab === tab.id ? "bg-white/30 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            BOOKINGS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "bookings" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total",     value: stats.total,     icon: <Ticket size={20} />,        grad: "from-slate-600 to-slate-800" },
                { label: "Confirmed", value: stats.confirmed, icon: <CheckCircle2 size={20} />,  grad: "from-emerald-500 to-teal-600" },
                { label: "Pending",   value: stats.pending,   icon: <Clock size={20} />,         grad: "from-amber-500 to-orange-400" },
                { label: "Cancelled", value: stats.cancelled, icon: <Ban size={20} />,           grad: "from-red-500 to-rose-500" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:-translate-y-0.5 transition-transform">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} mb-3 text-white shadow`}>
                    {s.icon}
                  </div>
                  <p className="text-3xl font-black text-gray-900 tracking-tight">{s.value}</p>
                  <p className="text-gray-400 text-xs font-semibold mt-0.5 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter row */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {["all", "pending", "confirmed", "cancelled"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all border
                    ${filter === f
                      ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {f === "all"
                    ? `All (${bookings.length})`
                    : `${f.charAt(0).toUpperCase() + f.slice(1)} (${bookings.filter(b => b.status === f).length})`}
                </button>
              ))}
            </div>

            {/* Booking cards */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 mt-4 text-sm">Loading bookings…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl py-20 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Ticket size={30} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-700 mb-2">No bookings found</h3>
                <p className="text-gray-400 text-sm">
                  {bookings.length === 0 ? "You haven't made any bookings yet." : "Try a different filter."}
                </p>
                {bookings.length === 0 && (
                  <button onClick={() => navigate("/grounds")}
                    className="mt-6 px-7 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition">
                    Browse Grounds
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => {
                  const method       = b.payment_method;
                  const canCancel    = b.can_cancel;
                  const willGetToken = b.can_cancel_with_token;
                  const hoursLeft    = b.hours_until_slot;
                  const isActive     = b.status === "pending" || b.status === "confirmed";

                  return (
                    <div key={b.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-3">

                          {/* Name + status */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black text-gray-900">{b.ground_name}</h2>
                            <StatusBadge status={b.status} />
                          </div>

                          {/* Date / Time / Amount tiles */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              {
                                icon: <Calendar size={13} className="text-yellow-500" />,
                                label: "Date",
                                value: b.date,
                              },
                              {
                                icon: <Clock size={13} className="text-yellow-500" />,
                                label: "Time",
                                value: `${fmt12t(b.start_time)} – ${fmt12t(b.end_time)}`,
                              },
                              {
                                icon: <IndianRupee size={13} className="text-emerald-500" />,
                                label: "Amount",
                                value: b.is_free_booking ? "FREE" : `Rs ${b.total_price}`,
                                valueClass: b.is_free_booking ? "text-amber-600" : "text-emerald-700",
                              },
                            ].map((tile) => (
                              <div key={tile.label} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                {tile.icon}
                                <div>
                                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{tile.label}</p>
                                  <p className={`text-sm font-black ${tile.valueClass || "text-gray-800"}`}>{tile.value}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Payment badge + contextual hint */}
                          <div className="flex flex-wrap items-center gap-2">
                            <PaymentBadge method={method} />

                            {isActive && (() => {
                              if (!canCancel && hoursLeft !== null && hoursLeft < 4) return (
                                <span className="text-xs text-red-500 font-semibold bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                  ⛔ Cannot cancel — within 4h window
                                </span>
                              );
                              if (willGetToken) return (
                                <span className="text-xs text-blue-600 font-semibold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                                  🔄 Cancel → get rescheduling token
                                </span>
                              );
                              if (method === "cash" && canCancel) return (
                                <span className="text-xs text-gray-500 font-semibold bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                                  Free to cancel — no token for cash
                                </span>
                              );
                              if ((method === "free" || b.is_free_booking) && canCancel) return (
                                <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                  Cancel freely — loyalty stamps unchanged
                                </span>
                              );
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Cancel button / no-cancel message */}
                        {isActive && (
                          <div className="flex-shrink-0 self-start">
                            {canCancel ? (
                              <button
                                onClick={() => setCancelTarget(b)}
                                className={`px-4 py-2.5 text-sm font-bold rounded-xl border-2 transition-all whitespace-nowrap
                                  ${willGetToken
                                    ? "border-blue-300 text-blue-600 hover:bg-blue-50 bg-white"
                                    : "border-red-200 text-red-500 hover:bg-red-50 bg-white"}`}
                              >
                                {willGetToken ? "🔄 Cancel & Reschedule" : "Cancel Booking"}
                              </button>
                            ) : (
                              <div className="text-right bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <p className="text-xs text-red-500 font-bold">Cannot cancel</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Slot starts in &lt; 4h</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Promo banners at bottom */}
            {!loading && bookings.length > 0 && (loyaltyTotal > 0 || validTokens.length > 0) && (
              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                {loyaltyTotal > 0 && (
                  <button
                    onClick={() => setActiveTab("loyalty")}
                    className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all text-left"
                  >
                    <span className="text-4xl">🎁</span>
                    <div className="flex-1">
                      <p className="font-black text-lg">{loyaltyTotal} Free Booking{loyaltyTotal > 1 ? "s" : ""} Ready!</p>
                      <p className="text-yellow-100 text-sm">Tap to view your loyalty rewards</p>
                    </div>
                    <ChevronRight size={20} className="text-white/70" />
                  </button>
                )}
                {validTokens.length > 0 && (
                  <button
                    onClick={() => setActiveTab("tokens")}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all text-left"
                  >
                    <span className="text-4xl">🔄</span>
                    <div className="flex-1">
                      <p className="font-black text-lg">{validTokens.length} Rescheduling Token{validTokens.length > 1 ? "s" : ""}!</p>
                      <p className="text-blue-100 text-sm">Tap to use your free rebooking credit</p>
                    </div>
                    <ChevronRight size={20} className="text-white/70" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TOKENS TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "tokens" && (
          <div>
            {/* Info panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
                <Tag size={17} />
              </div>
              <div>
                <p className="font-black text-blue-900 mb-1">How Rescheduling Tokens Work</p>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Cancel a <strong>Khalti-paid confirmed</strong> booking more than <strong>4 hours</strong> before
                  your slot → receive a free rescheduling token worth the full amount paid.
                  Rebook the <em>same ground</em> within <strong>30 days</strong> completely free.
                  Cash bookings and free bookings do not qualify.
                </p>
              </div>
            </div>

            {/* Active tokens */}
            {validTokens.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <h3 className="text-lg font-black text-gray-900">Active Tokens ({validTokens.length})</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {validTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-3xl border-2 border-blue-300 overflow-hidden shadow-lg">

                      {/* Token header bar */}
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
                              Rescheduling Token
                            </p>
                            <p className="text-3xl font-black">Rs {t.original_price}</p>
                            <p className="text-blue-100 text-sm mt-1">{t.original_ground_name}</p>
                          </div>
                          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-black text-center">
                            <p className="text-lg font-black">{t.days_until_expiry}</p>
                            <p className="text-blue-200 text-[10px]">days left</p>
                          </div>
                        </div>
                      </div>

                      {/* Token body */}
                      <div className="p-5">
                        <div className="space-y-2.5 mb-5">
                          {[
                            ["Original Date",  fmtDateShort(t.original_date)],
                            ["Original Slot",  `${fmt12t(t.original_start_time)} – ${fmt12t(t.original_end_time)}`],
                            ["Valid Until",    new Date(t.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0">
                              <span className="text-gray-400">{k}</span>
                              <span className="font-bold text-gray-800">{v}</span>
                            </div>
                          ))}
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4 text-center">
                          <p className="text-green-700 text-xs font-bold">
                            ✓ Valid for 30 days · Same ground only · 100% free
                          </p>
                        </div>

                        <button
                          onClick={() => navigate(`/book/${t.original_ground}`)}
                          className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-black rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          🔄 Rebook This Ground Free
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired / used tokens */}
            {expiredTokens.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-gray-300" />
                  <h3 className="text-base font-bold text-gray-400">Used / Expired ({expiredTokens.length})</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {expiredTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-2xl border border-gray-200 p-4 opacity-55">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-black text-gray-700">Rs {t.original_price}</p>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                          ${t.is_used ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                          {t.is_used ? "Used" : "Expired"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{t.original_ground_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateShort(t.original_date)} · {fmt12t(t.original_start_time)} – {fmt12t(t.original_end_time)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty */}
            {tokens.length === 0 && (
              <div className="bg-white rounded-3xl py-20 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Tag size={30} className="text-blue-300" />
                </div>
                <h3 className="text-xl font-black text-gray-700 mb-2">No rescheduling tokens yet</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Cancel a <strong>Khalti-paid</strong> confirmed booking more than 4 hours
                  before your slot to receive a free rescheduling token.
                </p>
                <button onClick={() => setActiveTab("bookings")}
                  className="mt-6 px-7 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition">
                  View My Bookings
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            LOYALTY TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === "loyalty" && (
          <div>
            {/* Hero explainer */}
            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-3xl p-6 mb-8 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trophy size={20} />
                </div>
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Loyalty Rewards</p>
                  <h2 className="text-2xl font-black">Book 5, Get 1 Free</h2>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { step: "1", title: "Book & Play",    desc: "Make confirmed bookings at any ground" },
                  { step: "2", title: "Earn Stamps",    desc: "5 confirmed bookings = 1 free slot" },
                  { step: "3", title: "Redeem Free",    desc: "Use at the same ground, on any slot" },
                ].map((item) => (
                  <div key={item.step} className="bg-white/15 rounded-2xl p-3 text-center">
                    <div className="w-8 h-8 bg-white/25 rounded-full flex items-center justify-center mx-auto mb-2 font-black text-sm">
                      {item.step}
                    </div>
                    <p className="font-black text-sm mb-0.5">{item.title}</p>
                    <p className="text-white/70 text-xs leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall stats */}
            {loyaltyRecs.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { label: "Grounds",        value: loyaltyRecs.length,  color: "text-gray-800" },
                  { label: "Total Confirmed", value: loyaltyRecs.reduce((s, r) => s + r.confirmed_count, 0), color: "text-yellow-600" },
                  { label: "Free Available",  value: loyaltyTotal,        color: "text-amber-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-gray-400 text-xs mt-1 font-semibold uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ready to redeem */}
            {loyaltyRecs.filter((r) => r.free_bookings_available > 0).length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-5">
                  <Gift size={18} className="text-amber-500" />
                  <h3 className="text-lg font-black text-gray-900">Ready to Redeem</h3>
                  <span className="bg-amber-100 text-amber-700 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200">
                    {loyaltyTotal} free
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {loyaltyRecs
                    .filter((r) => r.free_bookings_available > 0)
                    .map((r) => <LoyaltyStampCard key={r.id} record={r} navigate={navigate} />)}
                </div>
              </div>
            )}

            {/* In progress */}
            {loyaltyRecs.filter((r) => r.free_bookings_available === 0).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Target size={18} className="text-gray-400" />
                  <h3 className="text-lg font-black text-gray-500">In Progress</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  {loyaltyRecs
                    .filter((r) => r.free_bookings_available === 0)
                    .map((r) => <LoyaltyStampCard key={r.id} record={r} navigate={navigate} />)}
                </div>
              </div>
            )}

            {/* Empty */}
            {loyaltyRecs.length === 0 && !loading && (
              <div className="bg-white rounded-3xl py-20 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Trophy size={30} className="text-amber-300" />
                </div>
                <h3 className="text-xl font-black text-gray-700 mb-2">No loyalty points yet</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Book futsal grounds and get confirmed. Every 5 confirmed bookings at the
                  same ground earns you a completely free slot!
                </p>
                <button onClick={() => navigate("/grounds")}
                  className="mt-6 px-7 py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl transition">
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
