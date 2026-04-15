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
  confirmed: { bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pending:   { bar: "bg-amber-500",   pill: "bg-amber-100 text-amber-700 border-amber-200" },
  cancelled: { bar: "bg-red-500",     pill: "bg-red-100 text-red-600 border-red-200" },
  refunded:  { bar: "bg-blue-500",    pill: "bg-blue-100 text-blue-700 border-blue-200" },
};

function PaymentBadge({ method }) {
  if (method === "khalti")
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-2xl bg-purple-100 border border-purple-200 text-purple-700">
        <span className="w-2 h-2 rounded-full bg-purple-600" /> Khalti
      </span>
    );
  if (method === "cash")
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700">
        <span className="w-2 h-2 rounded-full bg-emerald-600" /> Cash on Ground
      </span>
    );
  if (method === "free")
    return (
      <span className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700">
        <Gift size={18} /> Free Booking
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`bg-gradient-to-br ${headerGrad} px-8 py-8 text-white relative`}>
          <button 
            onClick={() => !submitting && onClose()} 
            className="absolute top-6 right-6 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition"
          >
            <X size={20} />
          </button>
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest">BOOKING CANCELLATION</p>
          <h2 className="text-2xl font-bold mt-2 leading-tight">{heading}</h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 border">
            <p className="font-bold text-xl text-gray-900">{booking.ground_name}</p>
            <div className="flex flex-col gap-3 mt-5 text-gray-600">
              <span className="flex items-center gap-3"><Calendar size={20} /> {fmtDate(booking.date)}</span>
              <span className="flex items-center gap-3"><Clock size={20} /> {fmt12t(booking.start_time)} – {fmt12t(booking.end_time)}</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <PaymentBadge method={method} />
              {!isFree && <span className="font-bold text-lg">Rs {booking.total_price}</span>}
            </div>
          </div>

          {willGetToken && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="font-bold text-blue-800 flex items-center gap-2"><CheckCircle2 size={20} /> Token will be issued</p>
              <p className="text-blue-700 mt-2 text-sm">
                Worth <strong>Rs {booking.total_price}</strong> — valid for 30 days at the same ground.
              </p>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => !submitting && onClose()} 
              disabled={submitting}
              className="flex-1 py-4 border-2 border-gray-200 font-bold rounded-2xl hover:bg-gray-50 transition"
            >
              Keep Booking
            </button>
            <button 
              onClick={onConfirm} 
              disabled={submitting}
              className={`flex-1 py-4 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2
                ${willGetToken ? "bg-blue-600 hover:bg-blue-700" : isFree ? "bg-amber-500 hover:bg-amber-600" : "bg-red-600 hover:bg-red-700"}`}
            >
              {submitting ? "Cancelling..." : willGetToken ? "Cancel & Get Token" : "Yes, Cancel Booking"}
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
    <div className={`rounded-3xl p-6 mb-8 border flex items-start gap-5 ${isToken ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isToken ? "bg-blue-600" : "bg-emerald-600"} text-white`}>
        {isToken ? <RefreshCw size={24} /> : <CheckCircle2 size={24} />}
      </div>
      <div className="flex-1">
        <p className={`font-bold text-xl ${isToken ? "text-blue-900" : "text-emerald-900"}`}>
          {isToken ? "Rescheduling Token Issued!" : "Booking Cancelled Successfully"}
        </p>
        <p className={`mt-2 text-base ${isToken ? "text-blue-700" : "text-emerald-700"}`}>{result.message}</p>
        {isToken && (
          <button 
            onClick={onViewTokens} 
            className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition flex items-center gap-2"
          >
            <Tag size={18} /> View My Tokens
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-1">
        <X size={24} />
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
    ? record.ground_image.startsWith("http") ? record.ground_image : `${BASE_URL}${record.ground_image}`
    : null;

  return (
    <div className={`bg-white rounded-3xl overflow-hidden shadow-sm border transition-all hover:shadow-xl ${hasFree ? "border-amber-400" : "border-gray-100"}`}>
      <div className="relative h-44 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={record.ground_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-7xl opacity-40">⚽</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {hasFree && (
          <div className="absolute top-4 right-4 bg-amber-500 text-white text-sm font-bold px-5 py-2 rounded-2xl flex items-center gap-2 shadow">
            <Gift size={18} /> FREE READY
          </div>
        )}
        <div className="absolute bottom-5 left-6 text-white">
          <p className="font-bold text-xl">{record.ground_name}</p>
          <p className="text-white/80 text-sm flex items-center gap-1.5 mt-1">
            <MapPin size={16} /> {record.ground_location}
          </p>
        </div>
      </div>

      <div className="p-7">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-3">
            <span>Progress</span>
            <span className="font-bold text-gray-900">{progress} / {threshold}</span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: threshold }).map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 h-11 rounded-2xl border-2 flex items-center justify-center transition-all ${i < progress ? "bg-amber-500 border-amber-500" : "bg-gray-100 border-gray-200"}`}
              >
                {i < progress ? <Star size={18} className="text-white" /> : <span className="text-gray-400 text-xs">{i + 1}</span>}
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => navigate(`/book/${record.ground}`)}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2
            ${hasFree ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"}`}
        >
          {hasFree ? <><Gift size={20} /> Redeem Free Booking</> : <><ChevronRight size={20} /> Book This Ground Again</>}
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
    if (!token) { navigate("/login"); return; }
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [allB, tokRes, loyRes] = await Promise.all([
        fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
        fetch(`${BASE_URL}/api/bookings/tokens/`, { headers: { Authorization: `Bearer ${token}` } }),
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
      const res = await fetch(`${BASE_URL}/api/bookings/${cancelTarget.id}/cancel/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelResult({ type: "error", message: data.detail || "Cancellation failed." });
        setCancelTarget(null); return;
      }
      await loadData(true); setCancelTarget(null);
      setCancelResult(data.token_issued
        ? { type: "token", message: data.token_message }
        : { type: "cancelled", message: data.token_message || "Booking cancelled successfully." });
    } finally { setSubmitting(false); }
  };

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
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
    { id: "bookings", label: "My Bookings", icon: <Ticket size={20} /> },
    { id: "tokens", label: "Reschedule Tokens", icon: <Tag size={20} />, badge: validTokens.length },
    { id: "loyalty", label: "Loyalty Program", icon: <Trophy size={20} />, badge: loyaltyTotal },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-24">
      {cancelTarget && (
        <CancelModal 
          booking={cancelTarget} 
          onConfirm={handleCancelConfirm}
          onClose={() => !submitting && setCancelTarget(null)} 
          submitting={submitting} 
        />
      )}

      {/* Top Navigation - Full Width */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-6  shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-3 text-gray-600 hover:text-gray-900 font-medium text-lg transition"
            >
              <ArrowLeft size={24} /> Dashboard
            </button>
            <span className="text-gray-300 text-2xl">/</span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Bookings</h1>
          </div>

          <button 
            onClick={() => loadData(true)} 
            disabled={refreshing}
            className="flex items-center gap-3 px-7 py-3.5 border border-gray-200 rounded-2xl hover:bg-gray-50 transition font-medium"
          >
            <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8 space-y-10">

        <ResultBanner 
          result={cancelResult} 
          onDismiss={() => setCancelResult(null)} 
          onViewTokens={() => { setActiveTab("tokens"); setCancelResult(null); }} 
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-4">
          {tabs.map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-4 rounded-3xl font-semibold text-lg flex items-center gap-3 border transition-all
                ${activeTab === tab.id 
                  ? tab.id === "loyalty" ? "bg-amber-500 text-white border-amber-500" 
                  : tab.id === "tokens" ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-yellow-500 text-white border-yellow-500"
                  : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900"}`}
            >
              {tab.icon} {tab.label}
              {tab.badge > 0 && (
                <span className="ml-2 bg-white/30 text-white text-sm font-bold px-3 py-0.5 rounded-full">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Total Bookings", value: stats.total, icon: <Ticket size={28} />, color: "from-slate-700 to-slate-900" },
                { label: "Confirmed", value: stats.confirmed, icon: <CheckCircle2 size={28} />, color: "from-emerald-500 to-teal-600" },
                { label: "Pending", value: stats.pending, icon: <Clock size={28} />, color: "from-amber-500 to-orange-500" },
                { label: "Cancelled", value: stats.cancelled, icon: <Ban size={28} />, color: "from-red-500 to-rose-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-6`}>
                    {s.icon}
                  </div>
                  <p className="text-5xl font-bold tracking-tighter text-gray-900">{s.value}</p>
                  <p className="text-gray-500 font-semibold mt-2 text-sm tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {["all", "pending", "confirmed", "cancelled"].map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`px-8 py-4 rounded-3xl font-semibold text-base border transition-all
                    ${filter === f 
                      ? "bg-yellow-500 text-white border-yellow-500" 
                      : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900"}`}
                >
                  {f === "all" ? `All (${bookings.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${bookings.filter(b => b.status === f).length})`}
                </button>
              ))}
            </div>

            {/* Bookings List */}
            {loading ? (
              <div className="py-32 flex flex-col items-center">
                <div className="w-14 h-14 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-8 text-xl text-gray-500">Loading your bookings...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl py-24 text-center border border-gray-100">
                <p className="text-7xl mb-6">🎟️</p>
                <h3 className="text-3xl font-bold text-gray-900">No bookings found</h3>
                <p className="text-gray-500 mt-4 max-w-md mx-auto">
                  {bookings.length === 0 ? "You haven't made any bookings yet." : "Try changing the filter."}
                </p>
                {bookings.length === 0 && (
                  <button onClick={() => navigate("/grounds")} className="mt-8 px-10 py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-3xl">
                    Browse Grounds
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((b, idx) => {
                  const cfg = STATUS_CFG[b.status] || STATUS_CFG.pending;
                  const canCancel = b.can_cancel;
                  const willGetToken = b.can_cancel_with_token;

                  return (
                    <div key={b.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                      <div className="flex">
                        <div className={`w-2 ${cfg.bar}`} />
                        <div className="flex-1 p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center font-black text-gray-400">#{idx + 1}</div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{b.ground_name}</h3>
                                {b.ground_location && (
                                  <p className="text-gray-500 flex items-center gap-2 mt-1">
                                    <MapPin size={18} /> {b.ground_location}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${cfg.pill}`}>
                              {b.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">DATE</p>
                              <p className="text-sm font-semibold text-gray-900 mt-1">{fmtDateShort(b.date)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">TIME</p>
                              <p className="text-sm font-semibold text-gray-900 mt-1">{fmt12t(b.start_time)} – {fmt12t(b.end_time)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">AMOUNT</p>
                              <p className={`text-2xl font-bold mt-2 ${b.is_free_booking ? "text-amber-600" : "text-emerald-700"}`}>
                                {b.is_free_booking ? "FREE" : `Rs ${b.total_price}`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-8 flex items-center justify-between">
                            <PaymentBadge method={b.payment_method} />

                            {(b.status === "confirmed" || b.status === "pending") && (
                              canCancel ? (
                                <button 
                                  onClick={() => setCancelTarget(b)}
                                  className={`px-8 py-4 rounded-2xl font-bold text-white flex items-center gap-3 transition
                                    ${willGetToken ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}
                                >
                                  {willGetToken ? <RefreshCw size={20} /> : <Ban size={20} />}
                                  {willGetToken ? "Cancel & Get Token" : "Cancel Booking"}
                                </button>
                              ) : (
                                <div className="px-6 py-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold">
                                  Cannot cancel (less than 4 hours)
                                </div>
                              )
                            )}
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
          <div className="space-y-12">
            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-8 flex gap-6">
              <Shield size={48} className="text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-2xl text-blue-900">How Rescheduling Tokens Work</h3>
                <p className="text-blue-700 mt-3 text-lg leading-relaxed">
                  Cancel a <strong>Khalti-paid confirmed booking</strong> more than 4 hours before your slot to get a free token worth the full amount. Use it to rebook the same ground within 30 days — completely free.
                </p>
              </div>
            </div>

            {/* Active Tokens */}
            {validTokens.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full" /> Active Tokens ({validTokens.length})
                </h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {validTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-3xl border-2 border-blue-200 overflow-hidden shadow-sm hover:shadow-xl transition">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-7 text-white">
                        <p className="text-blue-200 text-sm font-semibold">RESCHEDULING TOKEN</p>
                        <p className="text-4xl font-bold mt-2">Rs {t.original_price}</p>
                        <p className="text-blue-100 mt-2">{t.original_ground_name}</p>
                      </div>
                      <div className="p-7 space-y-4">
                        <button 
                          onClick={() => navigate(`/book/${t.original_ground}`)}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={20} /> Rebook Free Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired / Used Tokens */}
            {expiredTokens.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-500 mb-5">Expired / Used Tokens</h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {expiredTokens.map((t) => (
                    <div key={t.token} className="bg-white rounded-3xl border border-gray-200 p-6 opacity-75">
                      <p className="font-bold text-lg">Rs {t.original_price}</p>
                      <p className="text-gray-700 mt-1">{t.original_ground_name}</p>
                      <p className="text-sm text-gray-500 mt-3">{fmtDateShort(t.original_date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tokens.length === 0 && (
              <div className="bg-white rounded-3xl py-24 text-center border border-gray-100">
                <p className="text-7xl mb-6">🎟️</p>
                <h3 className="text-3xl font-bold text-gray-900">No tokens yet</h3>
                <p className="text-gray-500 mt-4 max-w-md mx-auto">Cancel eligible bookings to earn rescheduling tokens.</p>
              </div>
            )}
          </div>
        )}

        {/* LOYALTY TAB */}
        {activeTab === "loyalty" && (
          <div className="space-y-12">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-3xl p-10 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold">Book 5 • Get 1 Free</h2>
                <p className="text-yellow-100 mt-3 text-lg">Earn a free slot every 5 confirmed bookings at the same ground.</p>
              </div>
            </div>

            {loyaltyRecs.length > 0 && (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loyaltyRecs.map((record) => (
                  <LoyaltyStampCard key={record.id} record={record} navigate={navigate} />
                ))}
              </div>
            )}

            {loyaltyRecs.length === 0 && !loading && (
              <div className="bg-white rounded-3xl py-24 text-center border border-gray-100">
                <p className="text-7xl mb-6">🏆</p>
                <h3 className="text-3xl font-bold text-gray-900">Start earning rewards</h3>
                <p className="text-gray-500 mt-4 max-w-md mx-auto">Make confirmed bookings to earn stamps and unlock free slots.</p>
                <button onClick={() => navigate("/grounds")} className="mt-8 px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-3xl">
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