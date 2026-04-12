// frontend/src/pages/OwnerBookings.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Clock, User, IndianRupee,
  CheckCircle, XCircle, ArrowLeft, RefreshCw,
  ChevronDown, ChevronUp, Search, BarChart2,
  Ban,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ── fetch ALL pages of a paginated DRF endpoint ────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

/**
 * Returns true if the booking's time slot has already passed.
 * A slot is "past" when the current time is AFTER the end_time on the booking date.
 */
const isSlotPast = (bookingDate, endTime) => {
  if (!bookingDate || !endTime) return false;
  try {
    const [h, m, s] = endTime.split(":").map(Number);
    const slotEnd = new Date(`${bookingDate}T${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`);
    return new Date() > slotEnd;
  } catch {
    return false;
  }
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:   { color: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-200",   dot: "bg-amber-500",   label: "Pending"   },
  confirmed: { color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", dot: "bg-emerald-500", label: "Confirmed" },
  cancelled: { color: "text-red-600",     bg: "bg-red-100",     border: "border-red-200",     dot: "bg-red-500",     label: "Cancelled" },
  refunded:  { color: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-200",    dot: "bg-blue-500",    label: "Refunded"  },
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub, accent }) {
  return (
    <div className={`relative bg-white rounded-2xl border p-5 shadow-sm overflow-hidden hover:-translate-y-0.5 transition-transform
      ${accent ? "border-yellow-200" : "border-gray-200"}`}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-amber-50 opacity-60" />}
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 text-white shadow-sm
          ${accent ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-gradient-to-br from-gray-600 to-gray-800"}`}>
          {icon}
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function OwnerBookings() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState("all");
  const [dateFilter,  setDateFilter]  = useState("");
  const [search,      setSearch]      = useState("");
  const [updating,    setUpdating]    = useState(null);
  const [expandedId,  setExpandedId]  = useState(null);
  const [toast,       setToast]       = useState({ msg: "", type: "" });

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async (silent = false) => {
    if (!token) { navigate("/login"); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const all = await fetchAllPages(`${BASE_URL}/api/bookings/owner/`, token);
      setBookings(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  // ── client-side filter ─────────────────────────────────────────────────────
  const filtered = bookings.filter((b) => {
    const matchStatus = filter === "all" || b.status === filter;
    const matchDate   = !dateFilter || b.date === dateFilter;
    const matchSearch = !search.trim() ||
      b.ground_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

  // ── update status ──────────────────────────────────────────────────────────
  const updateStatus = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/${bookingId}/update/`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status: newStatus } : b));
        showToast(
          newStatus === "confirmed"
            ? "Booking confirmed ✅"
            : "Booking cancelled.",
          newStatus === "confirmed" ? "success" : "error",
        );
      } else {
        showToast(data?.detail || "Action failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setUpdating(null);
    }
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    revenue:   bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + parseFloat(b.total_price || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-sm font-semibold border whitespace-nowrap
          ${toast.type === "success"
            ? "bg-white border-emerald-200 text-emerald-700"
            : "bg-white border-red-200 text-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={17} /> Dashboard
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-base font-black text-gray-900">Ground Bookings</h1>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
              {bookings.length} total
            </span>
            {stats.pending > 0 && (
              <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                {stats.pending} pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/owner-analytics")}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition"
            >
              <BarChart2 size={15} /> Analytics
            </button>
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Bookings"
            value={stats.total}
            icon={<Calendar size={18} />}
          />
          <StatCard
            label="Pending"
            value={stats.pending}
            icon={<Clock size={18} />}
            sub="awaiting action"
          />
          <StatCard
            label="Confirmed"
            value={stats.confirmed}
            icon={<CheckCircle size={18} />}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={<XCircle size={18} />}
          />
          <StatCard
            label="Confirmed Revenue"
            value={`Rs ${stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<IndianRupee size={18} />}
            accent
          />
        </div>

        {/* Pending alert banner */}
        {stats.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-black text-amber-800 text-sm">
                {stats.pending} booking{stats.pending > 1 ? "s" : ""} waiting for your action
              </p>
              <p className="text-amber-600 text-xs mt-0.5">
                Accept or decline each booking. Accepted bookings are automatically confirmed.
              </p>
            </div>
            <button
              onClick={() => setFilter("pending")}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition flex-shrink-0"
            >
              Show Pending
            </button>
          </div>
        )}

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">

            {/* Search */}
            <div className="flex-1 relative min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by player email or ground name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-yellow-400 transition bg-gray-50 focus:bg-white"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { val: "all",       label: "All" },
                { val: "pending",   label: "Pending" },
                { val: "confirmed", label: "Confirmed" },
                { val: "cancelled", label: "Cancelled" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border
                    ${filter === val
                      ? val === "pending"   ? "bg-amber-500 text-white border-amber-500"
                      : val === "confirmed" ? "bg-emerald-600 text-white border-emerald-600"
                      : val === "cancelled" ? "bg-red-500 text-white border-red-500"
                      : "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {label}
                  {val !== "all" && (
                    <span className="ml-1.5 opacity-70">
                      ({bookings.filter((b) => b.status === val).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Date picker */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-sm border border-gray-200 text-gray-700 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:border-yellow-400 transition focus:bg-white"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition px-2 py-2.5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Result count */}
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
            Showing <strong className="text-gray-600">{filtered.length}</strong> of {bookings.length} bookings
            {filter !== "all" && <> · filtered by <strong className="text-gray-600">{filter}</strong></>}
            {dateFilter && <> · date: <strong className="text-gray-600">{dateFilter}</strong></>}
          </p>
        </div>

        {/* ── Booking list ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-4 text-sm">Loading bookings…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-24 text-center border border-gray-200 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar size={30} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-700 mb-2">No bookings found</h3>
            <p className="text-gray-400 text-sm">
              {bookings.length === 0
                ? "Bookings from players will appear here once they book your ground."
                : "Try adjusting your filters."}
            </p>
            {(filter !== "all" || dateFilter || search) && (
              <button
                onClick={() => { setFilter("all"); setDateFilter(""); setSearch(""); }}
                className="mt-5 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-sm transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((b) => {
              const cfg      = STATUS_CFG[b.status] || STATUS_CFG.pending;
              const isPending = b.status === "pending";
              const busy      = updating === b.id;
              const isExpanded = expandedId === b.id;

              // ── KEY LOGIC: hide action buttons if slot has passed ──────
              const slotPast  = isSlotPast(b.date, b.end_time);
              const canAct    = isPending && !slotPast;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200
                    ${isExpanded ? "border-yellow-300 shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-md"}`}
                >
                  {/* ── Main row ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">

                    {/* Booking number badge */}
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-black text-gray-500 flex-shrink-0 border border-gray-200">
                      #{b.id}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-gray-900 text-base truncate">{b.ground_name}</h3>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {/* Past slot indicator */}
                        {slotPast && b.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border bg-gray-100 border-gray-300 text-gray-500">
                            <Ban size={10} /> Slot Expired
                          </span>
                        )}
                        {b.is_free_booking && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700">
                            🎁 Free
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400" /> {b.user_email}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" /> {b.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-gray-400" />
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                          {slotPast && (
                            <span className="text-[10px] font-bold text-gray-400 ml-1">(past)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      {b.is_free_booking
                        ? <p className="text-lg font-black text-amber-600">FREE</p>
                        : <p className="text-xl font-black text-gray-900">
                            Rs {parseFloat(b.total_price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>}
                      <p className="text-xs text-gray-400 mt-0.5">total</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Accept / Cancel only shown if slot hasn't passed and booking is pending */}
                      {canAct && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, "confirmed")}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl transition text-sm"
                          >
                            {busy ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle size={15} />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, "cancelled")}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-bold rounded-xl transition text-sm"
                          >
                            {busy ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle size={15} />
                            )}
                            Decline
                          </button>
                        </>
                      )}

                      {/* Slot expired and still pending — show info only */}
                      {isPending && slotPast && (
                        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-xs font-semibold cursor-default">
                          <Ban size={13} />
                          Slot passed
                        </div>
                      )}

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId((prev) => prev === b.id ? null : b.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-400"
                      >
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* ── Expanded detail panel ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Booking ID",    value: `#${b.id}` },
                          { label: "Player",        value: b.user_email },
                          { label: "Ground",        value: b.ground_name },
                          { label: "Date",          value: b.date },
                          { label: "Slot",          value: `${fmt12(b.start_time)} – ${fmt12(b.end_time)}` },
                          { label: "Amount",        value: b.is_free_booking ? "Free Booking 🎁" : `Rs ${parseFloat(b.total_price || 0).toLocaleString()}` },
                          { label: "Status",        value: cfg.label },
                          { label: "Booked At",     value: b.created_at ? new Date(b.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Slot expired warning inside expand */}
                      {slotPast && b.status === "pending" && (
                        <div className="mt-4 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2">
                          <Ban size={14} className="text-gray-500 flex-shrink-0" />
                          <p className="text-gray-600 text-xs font-semibold">
                            This booking's time slot has already passed. Accept/Decline actions are no longer available. You may want to manually mark this as cancelled.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Revenue summary footer ────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              <strong className="text-gray-800">{filtered.length}</strong> bookings shown ·
              Confirmed revenue:{" "}
              <strong className="text-emerald-700">
                Rs {filtered
                  .filter((b) => b.status === "confirmed")
                  .reduce((s, b) => s + parseFloat(b.total_price || 0), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>
            </p>
            <p className="text-xs text-gray-400">
              Pending: <strong className="text-amber-600">{filtered.filter((b) => b.status === "pending").length}</strong> ·
              Confirmed: <strong className="text-emerald-600">{filtered.filter((b) => b.status === "confirmed").length}</strong> ·
              Cancelled: <strong className="text-red-500">{filtered.filter((b) => b.status === "cancelled").length}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
