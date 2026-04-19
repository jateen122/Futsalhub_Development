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
    <div className={`relative bg-white rounded-3xl border p-6 shadow-sm hover:-translate-y-0.5 transition-all overflow-hidden
      ${accent ? "border-amber-200" : "border-gray-100"}`}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 opacity-60 rounded-3xl" />}
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-4 text-white shadow-inner
          ${accent ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-slate-700 to-slate-900"}`}>
          {icon}
        </div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = filter === "all" || b.status === filter;
    const matchDate   = !dateFilter || b.date === dateFilter;
    const matchSearch = !search.trim() ||
      b.ground_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user_email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchDate && matchSearch;
  });

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
          newStatus === "confirmed" ? "Booking confirmed ✅" : "Booking cancelled.",
          newStatus === "confirmed" ? "success" : "error"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 w-full">

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-3xl shadow-xl text-sm font-semibold border whitespace-nowrap
          ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Sticky top bar - full width */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm w-full">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition text-base font-medium"
            >
              <ArrowLeft size={18} /> Dashboard
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bookings</h1>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-2xl border border-gray-200">
              {bookings.length} total
            </span>
            {stats.pending > 0 && (
              <span className="text-sm font-medium text-amber-700 bg-amber-100 px-3 py-1 rounded-2xl border border-amber-200 animate-pulse">
                {stats.pending} pending
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/owner-analytics")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-3xl text-sm font-medium hover:bg-amber-100 transition"
            >
              <BarChart2 size={16} /> Analytics
            </button>
            <button
              onClick={() => fetchBookings(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-3xl text-sm font-medium transition"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Full width content area */}
      <div className="w-full max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 py-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 mb-10">
          <StatCard label="Total Bookings" value={stats.total} icon={<Calendar size={20} />} />
          <StatCard label="Pending" value={stats.pending} icon={<Clock size={20} />} sub="awaiting action" />
          <StatCard label="Confirmed" value={stats.confirmed} icon={<CheckCircle size={20} />} />
          <StatCard label="Cancelled" value={stats.cancelled} icon={<XCircle size={20} />} />
          <StatCard
            label="Confirmed Revenue"
            value={`Rs ${stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<IndianRupee size={20} />}
            accent
          />
        </div>

        {/* Pending alert */}
        {stats.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-8 flex items-center gap-5">
            <div className="w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Clock size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-base">
                {stats.pending} booking{stats.pending > 1 ? "s" : ""} waiting for your action
              </p>
              <p className="text-amber-600 text-sm mt-px">
                Accept or decline each booking. Accepted bookings are automatically confirmed.
              </p>
            </div>
            <button
              onClick={() => setFilter("pending")}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-3xl text-sm transition flex-shrink-0"
            >
              Show Pending
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by player email or ground name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-3xl focus:outline-none focus:border-amber-400 transition bg-gray-50 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { val: "all",       label: "All" },
                { val: "pending",   label: "Pending" },
                { val: "confirmed", label: "Confirmed" },
                { val: "cancelled", label: "Cancelled" },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-5 py-2.5 rounded-3xl text-sm font-medium transition border
                    ${filter === val
                      ? val === "pending" ? "bg-amber-500 text-white border-amber-500"
                      : val === "confirmed" ? "bg-emerald-600 text-white border-emerald-600"
                      : val === "cancelled" ? "bg-red-500 text-white border-red-500"
                      : "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                >
                  {label}
                  {val !== "all" && (
                    <span className="ml-2 opacity-70">
                      ({bookings.filter((b) => b.status === val).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-sm border border-gray-200 text-gray-700 rounded-3xl px-4 py-3 bg-gray-50 focus:outline-none focus:border-amber-400 transition focus:bg-white"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="text-sm font-medium text-gray-400 hover:text-gray-700 transition px-3 py-3"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
            Showing <strong className="text-gray-700">{filtered.length}</strong> of {bookings.length} bookings
            {filter !== "all" && <> · <strong className="text-gray-700">{filter}</strong></>}
            {dateFilter && <> · date <strong className="text-gray-700">{dateFilter}</strong></>}
          </p>
        </div>

        {/* Loading / Empty / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 w-full">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-5 text-sm">Loading bookings…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-24 text-center border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} className="text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No bookings found</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              {bookings.length === 0
                ? "Bookings from players will appear here once they book your ground."
                : "Try adjusting your filters."}
            </p>
            {(filter !== "all" || dateFilter || search) && (
              <button
                onClick={() => { setFilter("all"); setDateFilter(""); setSearch(""); }}
                className="mt-8 px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-3xl text-sm transition"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const cfg      = STATUS_CFG[b.status] || STATUS_CFG.pending;
              const isPending = b.status === "pending";
              const busy      = updating === b.id;
              const isExpanded = expandedId === b.id;
              const slotPast  = isSlotPast(b.date, b.end_time);
              const canAct    = isPending && !slotPast;

              return (
                <div
                  key={b.id}
                  className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-200
                    ${isExpanded ? "border-amber-300 shadow-md" : "border-gray-100 hover:border-gray-200 hover:shadow-md"}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6">

                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0 border border-gray-200">
                      #{b.id}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-xl text-gray-900 truncate">{b.ground_name}</h3>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-3xl border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {slotPast && b.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-4 py-1.5 rounded-3xl border bg-gray-100 border-gray-300 text-gray-500">
                            <Ban size={12} /> Slot Expired
                          </span>
                        )}
                        {b.is_free_booking && (
                          <span className="text-xs font-medium px-4 py-1.5 rounded-3xl bg-amber-100 border border-amber-200 text-amber-700">
                            Free Booking
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-2">
                          <User size={15} className="text-gray-400" /> {b.user_email}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar size={15} className="text-gray-400" /> {b.date}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock size={15} className="text-gray-400" />
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                          {slotPast && <span className="text-xs font-medium text-gray-400 ml-1">(past)</span>}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {b.is_free_booking ? (
                        <p className="text-2xl font-bold text-amber-600">FREE</p>
                      ) : (
                        <p className="text-3xl font-bold text-gray-900">
                          Rs {parseFloat(b.total_price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-px">total</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {canAct && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, "confirmed")}
                            disabled={busy}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium rounded-3xl text-sm transition"
                          >
                            {busy ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, "cancelled")}
                            disabled={busy}
                            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white font-medium rounded-3xl text-sm transition"
                          >
                            {busy ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle size={16} />
                            )}
                            Decline
                          </button>
                        </>
                      )}

                      {isPending && slotPast && (
                        <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border border-gray-200 text-gray-400 rounded-3xl text-sm font-medium cursor-default">
                          <Ban size={16} />
                          Slot Passed
                        </div>
                      )}

                      <button
                        onClick={() => setExpandedId((prev) => (prev === b.id ? null : b.id))}
                        className="w-10 h-10 flex items-center justify-center rounded-3xl border border-gray-200 hover:bg-gray-50 transition text-gray-400"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-6 py-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-5">
                        {[
                          { label: "Booking ID", value: `#${b.id}` },
                          { label: "Player", value: b.user_email },
                          { label: "Ground", value: b.ground_name },
                          { label: "Date", value: b.date },
                          { label: "Slot", value: `${fmt12(b.start_time)} – ${fmt12(b.end_time)}` },
                          { label: "Amount", value: b.is_free_booking ? "Free Booking" : `Rs ${parseFloat(b.total_price || 0).toLocaleString()}` },
                          { label: "Status", value: cfg.label },
                          { label: "Booked At", value: b.created_at ? new Date(b.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—" },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-base font-medium text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>

                      {slotPast && b.status === "pending" && (
                        <div className="mt-6 bg-gray-100 border border-gray-200 rounded-3xl px-5 py-4 flex items-center gap-3">
                          <Ban size={18} className="text-gray-500 flex-shrink-0" />
                          <p className="text-gray-600 text-sm font-medium">
                            This booking’s time slot has already passed. Accept/Decline actions are no longer available.
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

        {filtered.length > 0 && (
          <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm px-8 py-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              <strong className="text-gray-900">{filtered.length}</strong> bookings shown
            </p>
            <p className="text-sm text-gray-500">
              Confirmed revenue:{" "}
              <strong className="text-emerald-700">
                Rs {filtered
                  .filter((b) => b.status === "confirmed")
                  .reduce((s, b) => s + parseFloat(b.total_price || 0), 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}