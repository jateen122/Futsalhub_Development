// frontend/src/pages/PlayerMyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket, Calendar, Clock, Gift, IndianRupee, Tag, X,
  AlertTriangle, CheckCircle2, Ban, Trophy, Star, Target,
  ArrowLeft, RefreshCw, ChevronRight, ZapOff, MapPin,
  Sparkles, TrendingUp, Shield,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

async function fetchAllPages(url, token) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
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

const STATUS_CFG = {
  confirmed: { bar: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending:   { bar: "bg-amber-400",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { bar: "bg-red-400",     pill: "bg-red-50 text-red-600 border-red-200" },
  refunded:  { bar: "bg-blue-400",    pill: "bg-blue-50 text-blue-700 border-blue-200" },
};

function PaymentBadge({ method }) {
  if (method === "khalti")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" /> Khalti
      </span>
    );
  if (method === "cash")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" /> Cash
      </span>
    );
  if (method === "free")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
        <Gift size={11} /> Free
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
  if (willGetToken) { headerGrad = "from-blue-600 to-indigo-600"; heading = "Cancel & Get Rescheduling Token"; }
  else if (isFree)  { headerGrad = "from-amber-500 to-orange-500"; heading = "Cancel Free Booking"; }
  else              { headerGrad = "from-red-500 to-rose-600";     heading = "Cancel Booking"; }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`bg-gradient-to-br ${headerGrad} px-7 py-7 text-white`}>
          <button onClick={() => !submitting && onClose()} className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
            <X size={16} />
          </button>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Booking Cancellation</p>
          <h2 className="text-xl font-black leading-tight">{heading}</h2>
        </div>
        <div className="px-7 py-6 space-y-4">
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
            <p className="font-black text-gray-900 text-lg mb-3">{booking.ground_name}</p>
            <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
              <span className="flex items-center gap-2"><Calendar size={14} className="text-gray-400" /> {fmtDate(booking.date)}</span>
              <span className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {fmt12t(booking.start_time)} – {fmt12t(booking.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PaymentBadge method={method} />
              {!isFree && <span className="text-sm font-bold text-gray-800">Rs {booking.total_price}</span>}
            </div>
          </div>
          {willGetToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-bold text-blue-800 text-sm flex items-center gap-2 mb-2"><CheckCircle2 size={14} /> Token Will Be Issued</p>
              <p className="text-blue-700 text-sm leading-relaxed">
                Your slot is <strong>{hoursLeft ? `${Math.round(hoursLeft)} hours` : "more than 4 hours"}</strong> away. Token worth <strong>Rs {booking.total_price}</strong> — valid 30 days at the same ground.
              </p>
            </div>
          )}
          {isCash && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-1"><AlertTriangle size={14} /> Cash Booking — No Token</p>
              <p className="text-amber-700 text-sm">Tokens only apply for Khalti-paid bookings.</p>
            </div>
          )}
          {isKhalti && !willGetToken && !isFree && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="font-bold text-red-800 text-sm flex items-center gap-2 mb-1"><ZapOff size={14} /> Within 4-Hour Window</p>
              <p className="text-red-700 text-sm">Cancellations within 4 hours do not qualify for a token.</p>
            </div>
          )}
          {isFree && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-1"><Gift size={14} /> Free Booking</p>
              <p className="text-amber-700 text-sm">Your stamp progress will not change.</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => !submitting && onClose()} disabled={submitting}
              className="flex-1 py-4 border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition disabled:opacity-50">
              Keep Booking
            </button>
            <button onClick={onConfirm} disabled={submitting}
              className={`flex-1 py-4 text-white font-black rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2
                ${willGetToken ? "bg-blue-600 hover:bg-blue-700" : isFree ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"}`}>
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Cancelling…</>
                : willGetToken ? <><RefreshCw size={15} /> Cancel & Get Token</> : "Yes, Cancel"}
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
    <div className={`rounded-2xl p-5 mb-6 border flex items-start gap-4 ${isToken ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${isToken ? "bg-blue-500" : "bg-emerald-500"}`}>
        {isToken ? <RefreshCw size={18} /> : <CheckCircle2 size={18} />}
      </div>
      <div className="flex-1">
        <p className={`font-black text-base ${isToken ? "text-blue-900" : "text-emerald-900"}`}>
          {isToken ? "Rescheduling Token Issued!" : "Booking Cancelled"}
        </p>
        <p className={`text-sm mt-1 leading-relaxed ${isToken ? "text-blue-700" : "text-emerald-700"}`}>{result.message}</p>
        {isToken && (
          <button onClick={onViewTokens} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition">
            <Tag size={13} /> View My Tokens
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
    </div>
  );
}

function LoyaltyStampCard({ record, navigate }) {
  const threshold = record.loyalty_threshold || 5;
  const progress = record.confirmed_count % threshold;
  const hasFree = record.free_bookings_available > 0;
  const pct = record.progress_to_next_free || 0;
  const imgSrc = record.ground_image
    ? record.ground_image.startsWith("http") ? record.ground_image : `${BASE_URL}${record.ground_image}`
    : null;

  return (
    <div className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 transition-all hover:shadow-md ${hasFree ? "border-amber-400" : "border-gray-100"}`}>
      <div className="relative h-36 overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt={record.ground_name} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center text-5xl opacity-30">⚽</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {hasFree && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Gift size={11} /> FREE READY
          </div>
        )}
        <div className="absolute bottom-3 left-4">
          <p className="text-white font-black text-base leading-tight">{record.ground_name}</p>
          <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1"><MapPin size={10} /> {record.ground_location}</p>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2 font-semibold">
            <span>Stamps</span>
            <span className="text-gray-800 font-black">{progress} / {threshold}</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: threshold }).map((_, i) => {
              const filled = i < progress;
              return (
                <div key={i} className={`flex-1 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${filled ? "bg-amber-500 border-amber-500 shadow-sm" : "bg-gray-50 border-gray-200"}`}>
                  {filled ? <Star size={13} className="text-white fill-white" /> : <span className="text-gray-300 text-[10px]">{i + 1}</span>}
                </div>
              );
            })}
            <div className="mx-1 text-gray-200 font-bold">=</div>
            <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${hasFree ? "bg-amber-500 border-amber-500" : "bg-gray-50 border-dashed border-gray-200"}`}>
              <Gift size={13} className={hasFree ? "text-white fill-white" : "text-gray-300"} />
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Confirmed", value: record.confirmed_count,    color: "text-gray-900" },
            { label: "Earned",    value: record.free_bookings_earned, color: "text-amber-600" },
            { label: "Used",      value: record.free_bookings_used,  color: "text-gray-500" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl py-2.5 text-center border border-gray-100">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-[9px] uppercase tracking-wider mt-0.5 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-center mb-4">
          {hasFree
            ? <span className="text-amber-700 font-bold flex items-center justify-center gap-1.5"><Trophy size={13} /> Free booking ready!</span>
            : <span className="text-gray-500">{record.bookings_until_next_free} more booking{record.bookings_until_next_free !== 1 ? "s" : ""} needed</span>
          }
        </p>
        <button onClick={() => navigate(`/book/${record.ground}`)}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition
            ${hasFree ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-white hover:shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"}`}>
          {hasFree ? <><Gift size={14} /> Redeem Free Booking</> : <><ChevronRight size={14} /> Book This Ground</>}
        </button>
      </div>
    </div>
  );
}

export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings]     = useState([]);
  const [tokens, setTokens]         = useState([]);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState("all");
  const [activeTab, setActiveTab]   = useState("bookings");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  const loadData = async (silent = false) => {
    if (!token) { navigate("/login"); return; }
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [allB, tokRes, loyRes] = await Promise.all([
        fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
        fetch(`${BASE_URL}/api/bookings/tokens/`,  { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/bookings/loyalty/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBookings(allB);
      const tokData = await tokRes.json(); setTokens(tokData.tokens || []);
      const loyData = await loyRes.json(); setLoyaltyData(loyData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCancelConfirm = async () => {
    if (!cancelTarget || submitting) return;
    setSubmitting(true); setCancelResult(null);
    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/${cancelTarget.id}/cancel/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelResult({ type: "error", message: data.detail || "Cancellation failed." });
        setCancelTarget(null); return;
      }
      await loadData(true); setCancelTarget(null);
      setCancelResult(data.token_issued
        ? { type: "token",     message: data.token_message }
        : { type: "cancelled", message: data.token_message || "Booking cancelled successfully." });
    } finally { setSubmitting(false); }
  };

  const filtered     = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const validTokens  = tokens.filter((t) => t.is_valid);
  const expiredTokens= tokens.filter((t) => !t.is_valid);
  const loyaltyTotal = loyaltyData?.total_free_available || 0;
  const loyaltyRecs  = loyaltyData?.loyalty_records || [];

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const tabs = [
    { id: "bookings", label: "My Bookings", icon: <Ticket size={15} />, badge: null },
    { id: "tokens",   label: "Reschedule",  icon: <Tag size={15} />,    badge: validTokens.length || null },
    { id: "loyalty",  label: "Loyalty",     icon: <Trophy size={15} />, badge: loyaltyTotal || null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {cancelTarget && (
        <CancelModal booking={cancelTarget} onConfirm={handleCancelConfirm}
          onClose={() => !submitting && setCancelTarget(null)} submitting={submitting} />
      )}

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="w-full px-4 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition text-sm font-semibold">
              <ArrowLeft size={16} /> Dashboard
            </button>
            <span className="text-gray-300">·</span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Bookings</h1>
          </div>
          <div className="flex items-center gap-2">
            {loyaltyTotal > 0 && (
              <button onClick={() => setActiveTab("loyalty")}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl font-semibold text-sm shadow-sm transition">
                <Gift size={14} /> {loyaltyTotal} Free
              </button>
            )}
            {validTokens.length > 0 && (
              <button onClick={() => setActiveTab("tokens")}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-semibold text-sm shadow-sm transition">
                <Tag size={14} /> {validTokens.length} Token{validTokens.length > 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="w-10 h-10 flex items-center justify-center rounded-2xl border border-gray-200 hover:bg-gray-50 transition text-gray-500">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="w-full px-4 lg:px-8 py-8">

        <ResultBanner result={cancelResult} onDismiss={() => setCancelResult(null)}
          onViewTokens={() => { setActiveTab("tokens"); setCancelResult(null); }} />

        {cancelResult?.type === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-semibold text-sm flex-1">{cancelResult.message}</p>
            <button onClick={() => setCancelResult(null)}><X size={16} className="text-red-400 hover:text-red-600" /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm w-fit border border-gray-100">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2
                ${activeTab === tab.id
                  ? tab.id === "loyalty" ? "bg-amber-500 text-white shadow-sm"
                  : tab.id === "tokens"  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-yellow-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
              {tab.icon} {tab.label}
              {tab.badge !== null && (
                <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center
                  ${activeTab === tab.id ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════ BOOKINGS TAB ═══════════════════════ */}
        {activeTab === "bookings" && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total",     value: stats.total,     icon: <Ticket size={22} />,       grad: "from-slate-500 to-slate-700" },
                { label: "Confirmed", value: stats.confirmed, icon: <CheckCircle2 size={22} />, grad: "from-emerald-500 to-teal-600" },
                { label: "Pending",   value: stats.pending,   icon: <Clock size={22} />,         grad: "from-amber-500 to-orange-500" },
                { label: "Cancelled", value: stats.cancelled, icon: <Ban size={22} />,           grad: "from-red-500 to-rose-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:-translate-y-0.5 transition-transform">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.grad} mb-4 text-white shadow-sm`}>{s.icon}</div>
                  <p className="text-4xl font-black text-gray-900 tracking-tight">{s.value}</p>
                  <p className="text-gray-400 text-xs font-bold mt-1.5 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {["all", "pending", "confirmed", "cancelled"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all border
                    ${filter === f
                      ? "bg-yellow-500 text-white border-yellow-500 shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"}`}>
                  {f === "all"
                    ? `All (${bookings.length})`
                    : `${f.charAt(0).toUpperCase() + f.slice(1)} (${bookings.filter((b) => b.status === f).length})`}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center items-center py-40">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm font-medium">Loading bookings…</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-40 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-6xl mb-5">🎫</p>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No bookings found</h3>
                <p className="text-gray-500 mb-6 text-sm">{bookings.length === 0 ? "You haven't made any bookings yet." : "Try a different filter."}</p>
                {bookings.length === 0 && (
                  <button onClick={() => navigate("/grounds")} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-semibold transition">
                    Browse Grounds
                  </button>
                )}
              </div>
            ) : (
              /* ─── VERTICAL TOP-TO-BOTTOM LIST ─── */
              <div className="flex flex-col gap-3">
                {filtered.map((b, idx) => {
                  const cfg         = STATUS_CFG[b.status] || STATUS_CFG.pending;
                  const canCancel   = b.can_cancel;
                  const willGetToken= b.can_cancel_with_token;
                  const hoursLeft   = b.hours_until_slot;
                  const isActive    = b.status === "pending" || b.status === "confirmed";

                  return (
                    <div key={b.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">

                      <div className="flex">
                        {/* Coloured left accent bar */}
                        <div className={`w-1.5 flex-shrink-0 rounded-l-2xl ${cfg.bar}`} />

                        <div className="flex-1 px-6 py-5">

                          {/* ── TOP ROW: serial · name · status · action ── */}
                          <div className="flex items-center gap-4 mb-5">

                            {/* Serial */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <span className="text-sm font-black text-gray-400">#{idx + 1}</span>
                            </div>

                            {/* Name + location */}
                            <div className="flex-1 min-w-0">
                              <h2 className="text-2xl font-black text-gray-900 leading-tight truncate">
                                {b.ground_name}
                              </h2>
                              {b.ground_location && (
                                <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                                  <MapPin size={12} className="flex-shrink-0" />
                                  <span className="truncate">{b.ground_location}</span>
                                </p>
                              )}
                            </div>

                            {/* Status pill */}
                            <span className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${cfg.pill}`}>
                              {b.status}
                            </span>

                            {/* Action button */}
                            {isActive && (
                              canCancel ? (
                                <button onClick={() => setCancelTarget(b)}
                                  className={`flex-shrink-0 px-5 py-2.5 text-sm font-bold rounded-xl border-2 transition flex items-center gap-2 whitespace-nowrap
                                    ${willGetToken
                                      ? "border-blue-300 text-blue-700 hover:bg-blue-50 bg-white"
                                      : "border-red-200 text-red-600 hover:bg-red-50 bg-white"}`}>
                                  {willGetToken
                                    ? <><RefreshCw size={14} /> Cancel & Reschedule</>
                                    : <><Ban size={14} /> Cancel</>}
                                </button>
                              ) : (
                                <div className="flex-shrink-0 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                                  <p className="text-xs font-bold text-red-500 whitespace-nowrap">Cannot cancel</p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">&lt; 4h window</p>
                                </div>
                              )
                            )}
                          </div>

                          {/* ── DETAILS ROW ── */}
                          <div className="flex flex-wrap items-center gap-3">

                            {/* Date */}
                            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                              <Calendar size={16} className="text-yellow-500 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold leading-none mb-0.5">Date</p>
                                <p className="text-sm font-black text-gray-900 whitespace-nowrap">{fmtDateShort(b.date)}</p>
                              </div>
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                              <Clock size={16} className="text-yellow-500 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold leading-none mb-0.5">Time</p>
                                <p className="text-sm font-black text-gray-900 whitespace-nowrap">{fmt12t(b.start_time)} – {fmt12t(b.end_time)}</p>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                              <IndianRupee size={16} className={`flex-shrink-0 ${b.is_free_booking ? "text-amber-500" : "text-emerald-500"}`} />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold leading-none mb-0.5">Amount</p>
                                <p className={`text-sm font-black whitespace-nowrap ${b.is_free_booking ? "text-amber-600" : "text-emerald-700"}`}>
                                  {b.is_free_booking ? "FREE" : `Rs ${b.total_price}`}
                                </p>
                              </div>
                            </div>

                            {/* Payment badge */}
                            <PaymentBadge method={b.payment_method} />

                            {/* Hint badges */}
                            {isActive && (() => {
                              if (!canCancel && hoursLeft !== null && hoursLeft < 4)
                                return (
                                  <span className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap">
                                    <Ban size={11} /> &lt;4h — cannot cancel
                                  </span>
                                );
                              if (willGetToken)
                                return (
                                  <span className="text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 whitespace-nowrap">
                                    <RefreshCw size={11} /> Token eligible
                                  </span>
                                );
                              return null;
                            })()}
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom CTA */}
            {!loading && bookings.length > 0 && (loyaltyTotal > 0 || validTokens.length > 0) && (
              <div className="mt-8 grid lg:grid-cols-2 gap-4">
                {loyaltyTotal > 0 && (
                  <button onClick={() => setActiveTab("loyalty")}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition text-left">
                    <Gift size={28} className="text-yellow-100 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-black text-base">{loyaltyTotal} Free Booking{loyaltyTotal > 1 ? "s" : ""} Ready!</p>
                      <p className="text-yellow-100 text-xs mt-0.5">View your loyalty rewards</p>
                    </div>
                    <ChevronRight size={18} className="text-white/60" />
                  </button>
                )}
                {validTokens.length > 0 && (
                  <button onClick={() => setActiveTab("tokens")}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition text-left">
                    <RefreshCw size={28} className="text-blue-100 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-black text-base">{validTokens.length} Rescheduling Token{validTokens.length > 1 ? "s" : ""}</p>
                      <p className="text-blue-100 text-xs mt-0.5">Use your free rebooking credit</p>
                    </div>
                    <ChevronRight size={18} className="text-white/60" />
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════ TOKENS TAB ═══════════════════════ */}
        {activeTab === "tokens" && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                <Shield size={18} />
              </div>
              <div>
                <p className="font-black text-blue-900 mb-1">How Rescheduling Tokens Work</p>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Cancel a <strong>Khalti-paid confirmed</strong> booking more than <strong>4 hours</strong> before your slot → receive a free token worth the full amount. Rebook the <em>same ground</em> within <strong>30 days</strong> completely free.
                </p>
              </div>
            </div>

            {validTokens.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-lg font-black text-gray-900">Active Tokens ({validTokens.length})</h3>
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {validTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-3xl border-2 border-blue-300 overflow-hidden shadow-md hover:shadow-lg transition">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-1">Rescheduling Token</p>
                            <p className="text-3xl font-black">Rs {t.original_price}</p>
                            <p className="text-blue-100 text-sm mt-1">{t.original_ground_name}</p>
                          </div>
                          <div className="bg-white/20 rounded-xl px-3 py-2 text-center flex-shrink-0">
                            <p className="text-xl font-black">{t.days_until_expiry}</p>
                            <p className="text-blue-200 text-[9px] mt-0.5 uppercase">days left</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="space-y-2.5 mb-5">
                          {[
                            ["Original Date", fmtDateShort(t.original_date)],
                            ["Time Slot", `${fmt12t(t.original_start_time)} – ${fmt12t(t.original_end_time)}`],
                            ["Valid Until", new Date(t.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                              <span className="text-gray-500 text-sm">{k}</span>
                              <span className="font-bold text-gray-900 text-sm">{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-4 text-center">
                          <p className="text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={12} /> Same ground · 30 days · 100% free
                          </p>
                        </div>
                        <button onClick={() => navigate(`/book/${t.original_ground}`)}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition flex items-center justify-center gap-2 shadow-sm">
                          <RefreshCw size={15} /> Rebook Free
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expiredTokens.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <h3 className="text-base font-bold text-gray-500">Used / Expired ({expiredTokens.length})</h3>
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {expiredTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-2xl border border-gray-200 p-5 opacity-60">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-black text-gray-800 text-lg">Rs {t.original_price}</p>
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${t.is_used ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                          {t.is_used ? "Used" : "Expired"}
                        </span>
                      </div>
                      <p className="text-base text-gray-700 font-semibold">{t.original_ground_name}</p>
                      <p className="text-sm text-gray-500 mt-1">{fmtDateShort(t.original_date)} · {fmt12t(t.original_start_time)} – {fmt12t(t.original_end_time)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tokens.length === 0 && (
              <div className="text-center py-40 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-6xl mb-5">🎟️</p>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No rescheduling tokens yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                  Cancel a <strong>Khalti-paid</strong> confirmed booking more than 4 hours before your slot to receive a free token.
                </p>
                <button onClick={() => setActiveTab("bookings")} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition">
                  View My Bookings
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ LOYALTY TAB ═══════════════════════ */}
        {activeTab === "loyalty" && (
          <div>
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-3xl p-7 mb-10 text-white shadow-lg overflow-hidden relative">
              <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full" />
              <div className="absolute -right-2 bottom-0 w-28 h-28 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Trophy size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-yellow-100 text-[10px] font-bold uppercase tracking-widest">Loyalty Rewards</p>
                    <h2 className="text-2xl font-black">Book 5, Get 1 Free</h2>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <TrendingUp size={16} />, title: "Book & Play",  desc: "Make confirmed bookings at any ground" },
                    { icon: <Sparkles size={16} />,   title: "Earn Stamps",  desc: "5 confirmed bookings = 1 free slot" },
                    { icon: <Gift size={16} />,        title: "Redeem Free",  desc: "Use at the same ground, any slot" },
                  ].map((item) => (
                    <div key={item.title} className="bg-white/15 rounded-2xl p-3.5 text-center">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">{item.icon}</div>
                      <p className="font-black text-sm mb-0.5">{item.title}</p>
                      <p className="text-yellow-100/80 text-[10px] leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {loyaltyRecs.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  { label: "Grounds",        value: loyaltyRecs.length,                                     color: "text-gray-900" },
                  { label: "Total Confirmed", value: loyaltyRecs.reduce((s, r) => s + r.confirmed_count, 0), color: "text-amber-600" },
                  { label: "Free Available",  value: loyaltyTotal,                                           color: "text-amber-500" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-gray-400 text-xs mt-1 font-bold uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {loyaltyRecs.filter((r) => r.free_bookings_available > 0).length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-5">
                  <Gift size={18} className="text-amber-500" />
                  <h3 className="text-lg font-black text-gray-900">Ready to Redeem</h3>
                  <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1 rounded-full border border-amber-200">{loyaltyTotal} free</span>
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {loyaltyRecs.filter((r) => r.free_bookings_available > 0).map((r) => (
                    <LoyaltyStampCard key={r.id} record={r} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

            {loyaltyRecs.filter((r) => r.free_bookings_available === 0).length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-5">
                  <Target size={18} className="text-gray-500" />
                  <h3 className="text-lg font-black text-gray-700">In Progress</h3>
                </div>
                <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
                  {loyaltyRecs.filter((r) => r.free_bookings_available === 0).map((r) => (
                    <LoyaltyStampCard key={r.id} record={r} navigate={navigate} />
                  ))}
                </div>
              </div>
            )}

            {loyaltyRecs.length === 0 && !loading && (
              <div className="text-center py-40 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-6xl mb-5">🏆</p>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">No loyalty points yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                  Every 5 confirmed bookings at the same ground earns you a completely free slot!
                </p>
                <button onClick={() => navigate("/grounds")} className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-semibold transition">
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
