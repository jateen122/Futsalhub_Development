// frontend/src/pages/PlayerMyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Clock, Gift, IndianRupee, Tag, AlertCircle } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12t = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings,      setBookings]      = useState([]);
  const [tokens,        setTokens]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("all");
  const [activeTab,     setActiveTab]     = useState("bookings"); // bookings | tokens
  const [cancelling,    setCancelling]    = useState(null);
  const [cancelResult,  setCancelResult]  = useState(null); // holds newly issued token info
  const [loyaltyTotal,  setLoyaltyTotal]  = useState(0);

  const fetchBookings = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokens = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/tokens/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!token) return navigate("/login");
    fetchBookings();
    fetchTokens();

    // Loyalty total
    fetch(`${BASE_URL}/api/bookings/loyalty/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setLoyaltyTotal(d.total_free_available || 0));
  }, []);

  const handleCancel = async (id) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const canGetToken = booking.can_cancel_with_token;
    const hoursLeft   = booking.hours_until_slot;

    let confirmMsg = "Cancel this booking?";
    if (canGetToken) {
      confirmMsg = `Cancel and receive a rescheduling token?\n\nYou have ${hoursLeft}h before your slot. Cancelling now will issue a rescheduling token worth Rs ${booking.total_price} valid for 30 days at the same ground.`;
    } else if (hoursLeft !== null && hoursLeft < 4) {
      confirmMsg = `Cancel this booking?\n\n⚠ You are within 4 hours of your slot. No rescheduling token will be issued.`;
    }

    if (!window.confirm(confirmMsg)) return;
    setCancelling(id);
    setCancelResult(null);

    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/${id}/cancel/`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        fetchBookings();
        fetchTokens();
        if (data.token_issued) {
          setCancelResult({
            type:    "token",
            token:   data.token_issued,
            message: data.token_message,
          });
        } else {
          setCancelResult({
            type:    "no_token",
            message: data.token_message || "Booking cancelled. No rescheduling token issued.",
          });
        }
      }
    } finally {
      setCancelling(null);
    }
  };

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  const validTokens   = tokens.filter((t) => t.is_valid);
  const expiredTokens = tokens.filter((t) => !t.is_valid);

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              ← Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>
          </div>

          <div className="flex items-center gap-3">
            {validTokens.length > 0 && (
              <button
                onClick={() => setActiveTab("tokens")}
                className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-2xl font-semibold text-sm shadow hover:bg-blue-600 transition"
              >
                <Tag size={16} />
                {validTokens.length} Reschedule Token{validTokens.length > 1 ? "s" : ""}
              </button>
            )}
            {loyaltyTotal > 0 && (
              <button
                onClick={() => navigate("/player-loyalty")}
                className="flex items-center gap-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-2.5 rounded-2xl font-semibold shadow hover:shadow-xl hover:scale-105 transition-all"
              >
                <Gift size={18} />
                {loyaltyTotal} Free Booking{loyaltyTotal > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Cancel Result Banner */}
        {cancelResult && (
          <div className={`rounded-3xl p-6 mb-8 flex items-start gap-4 ${
            cancelResult.type === "token"
              ? "bg-blue-50 border-2 border-blue-300"
              : "bg-gray-50 border border-gray-200"
          }`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              cancelResult.type === "token" ? "bg-blue-500" : "bg-gray-400"
            }`}>
              {cancelResult.type === "token" ? <Tag size={20} className="text-white" /> : <AlertCircle size={20} className="text-white" />}
            </div>
            <div className="flex-1">
              <p className={`font-bold text-lg ${cancelResult.type === "token" ? "text-blue-800" : "text-gray-700"}`}>
                {cancelResult.type === "token" ? "🔄 Rescheduling Token Issued!" : "Booking Cancelled"}
              </p>
              <p className={`text-sm mt-1 ${cancelResult.type === "token" ? "text-blue-700" : "text-gray-500"}`}>
                {cancelResult.message}
              </p>
              {cancelResult.type === "token" && (
                <button
                  onClick={() => { setActiveTab("tokens"); setCancelResult(null); }}
                  className="mt-3 px-5 py-2 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition"
                >
                  View Token →
                </button>
              )}
            </div>
            <button onClick={() => setCancelResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-3xl shadow-sm w-fit">
          {[
            { id: "bookings", label: "My Bookings",       count: bookings.length },
            { id: "tokens",   label: "Reschedule Tokens", count: validTokens.length, highlight: validTokens.length > 0 },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-3 rounded-2xl font-semibold transition-all text-sm flex items-center gap-2
                ${activeTab === tab.id
                  ? tab.highlight ? "bg-blue-500 text-white shadow" : "bg-yellow-500 text-white shadow"
                  : "bg-transparent hover:bg-gray-100 text-gray-600"}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full
                  ${activeTab === tab.id ? "bg-white/20" : "bg-gray-200 text-gray-600"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── BOOKINGS TAB ── */}
        {activeTab === "bookings" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: "Total Bookings", value: stats.total,     color: "from-gray-700 to-gray-900" },
                { label: "Confirmed",      value: stats.confirmed, color: "from-emerald-500 to-teal-600" },
                { label: "Pending",        value: stats.pending,   color: "from-amber-500 to-orange-500" },
                { label: "Cancelled",      value: stats.cancelled, color: "from-red-500 to-rose-600" },
              ].map((s, i) => (
                <div key={s.label}
                  className="bg-white rounded-3xl p-7 shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} mb-5 text-white shadow-md`}>
                    {i === 0 && <Ticket size={28} />}
                    {i === 1 && <Calendar size={28} />}
                    {i === 2 && <Clock size={28} />}
                    {i === 3 && <span className="text-3xl">✕</span>}
                  </div>
                  <p className="text-5xl font-bold text-gray-900 tracking-tighter">{s.value}</p>
                  <p className="text-gray-500 font-medium mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-3xl shadow-sm w-fit">
              {["all", "pending", "confirmed", "cancelled"].map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-8 py-3 rounded-2xl font-semibold capitalize transition-all text-sm
                    ${filter === f ? "bg-yellow-500 text-white shadow" : "bg-transparent hover:bg-gray-100 text-gray-600"}`}
                >
                  {f === "all" ? "All Bookings" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Bookings List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 mt-4">Loading your bookings...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-3xl py-24 text-center shadow">
                <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                  <Ticket size={42} className="text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800">No bookings found</h3>
                <p className="text-gray-500 mt-2">You don't have any {filter !== "all" ? filter : ""} bookings yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((b) => {
                  const canCancelWithToken = b.can_cancel_with_token;
                  const hoursLeft          = b.hours_until_slot;
                  const isPending          = b.status === "pending" || b.status === "confirmed";

                  return (
                    <div key={b.id}
                      className="bg-white rounded-3xl p-6 shadow border border-gray-100 hover:shadow-xl transition-all">
                      <div className="flex justify-between items-start">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-semibold text-gray-900">{b.ground_name}</h2>
                            {b.is_free_booking && (
                              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                                🎁 FREE
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-yellow-600" />
                              <div>
                                <p className="text-gray-400 text-xs">DATE</p>
                                <p className="font-medium">{b.date}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Clock size={18} className="text-yellow-600" />
                              <div>
                                <p className="text-gray-400 text-xs">TIME</p>
                                <p className="font-medium">{fmt12t(b.start_time)} – {fmt12t(b.end_time)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <IndianRupee size={18} className="text-emerald-600" />
                              <div>
                                <p className="text-gray-400 text-xs">AMOUNT</p>
                                {b.is_free_booking ? (
                                  <p className="font-bold text-2xl text-amber-600">FREE</p>
                                ) : (
                                  <p className="font-bold text-2xl text-emerald-600">Rs {b.total_price}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Cancellation info */}
                          {isPending && b.status !== "cancelled" && (
                            <div className={`text-xs flex items-center gap-1.5 rounded-xl px-3 py-2 w-fit
                              ${canCancelWithToken && !b.is_free_booking
                                ? "bg-blue-50 border border-blue-200 text-blue-700"
                                : "bg-gray-50 border border-gray-200 text-gray-500"}`}>
                              <Tag size={12} />
                              {canCancelWithToken && !b.is_free_booking
                                ? `Cancel now to get a rescheduling token (${hoursLeft}h until slot)`
                                : hoursLeft !== null && hoursLeft < 4
                                ? `Within 4h window — no token if cancelled`
                                : "Cancel anytime"}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-3">
                          <span className={`px-5 py-1.5 rounded-2xl text-xs font-bold uppercase tracking-widest
                            ${b.status === "confirmed" ? "bg-emerald-100 text-emerald-700"
                            : b.status === "pending"   ? "bg-amber-100 text-amber-700"
                            :                            "bg-red-100 text-red-700"}`}>
                            {b.status}
                          </span>

                          {(b.status === "pending" || b.status === "confirmed") && (
                            <button
                              onClick={() => handleCancel(b.id)}
                              disabled={cancelling === b.id}
                              className="text-red-600 hover:text-red-700 text-sm font-medium transition disabled:opacity-50"
                            >
                              {cancelling === b.id ? "Cancelling..." : "Cancel Booking"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── TOKENS TAB ── */}
        {activeTab === "tokens" && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Rescheduling Tokens</h2>
              <p className="text-gray-500 text-sm">
                Tokens are issued when you cancel a confirmed booking 4+ hours before your slot.
                Use them to book the same ground for free within 30 days.
              </p>
            </div>

            {/* Valid tokens */}
            {validTokens.length > 0 && (
              <div className="mb-10">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full" />
                  Active Tokens ({validTokens.length})
                </h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  {validTokens.map((t) => (
                    <div key={t.token}
                      className="bg-white rounded-3xl border-2 border-blue-300 p-7 shadow-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                          <Tag size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-bold bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                          ✓ Valid · {t.days_until_expiry}d left
                        </span>
                      </div>

                      <p className="text-2xl font-black text-gray-900 mb-1">
                        Rs {t.original_price} Credit
                      </p>
                      <p className="text-blue-600 font-semibold text-sm mb-4">
                        {t.original_ground_name}
                      </p>

                      <div className="space-y-2 text-sm text-gray-600 mb-5">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Original Date</span>
                          <span className="font-medium">{t.original_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Original Slot</span>
                          <span className="font-medium">{fmt12t(t.original_start_time)} – {fmt12t(t.original_end_time)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Expires</span>
                          <span className="font-medium">{new Date(t.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/book/${t.original_ground}`)}
                        className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition flex items-center justify-center gap-2"
                      >
                        🔄 Use to Rebook Ground
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired / Used tokens */}
            {expiredTokens.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-300 rounded-full" />
                  Used / Expired ({expiredTokens.length})
                </h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  {expiredTokens.map((t) => (
                    <div key={t.token}
                      className="bg-white rounded-3xl border border-gray-200 p-6 opacity-60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-gray-900">Rs {t.original_price}</p>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full
                          ${t.is_used ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"}`}>
                          {t.is_used ? "Used" : "Expired"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{t.original_ground_name} · {t.original_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tokens.length === 0 && (
              <div className="bg-white rounded-3xl py-24 text-center shadow border border-gray-100">
                <div className="mx-auto w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                  <Tag size={42} className="text-blue-300" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800">No rescheduling tokens</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">
                  When you cancel a confirmed booking 4+ hours before your slot, you'll receive a rescheduling token to book again for free.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loyalty Banner */}
        {loyaltyTotal > 0 && activeTab === "bookings" && (
          <div className="mt-12 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-3xl p-8 flex items-center gap-6 shadow-xl">
            <div className="text-5xl">🎁</div>
            <div className="flex-1">
              <p className="font-bold text-xl">You have {loyaltyTotal} free booking{loyaltyTotal > 1 ? "s" : ""} ready!</p>
              <p className="text-yellow-100 mt-1">Redeem them on your next booking</p>
            </div>
            <button onClick={() => navigate("/player-loyalty")}
              className="bg-white text-yellow-600 font-semibold px-8 py-3 rounded-2xl hover:bg-yellow-100 transition">
              View Rewards →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
