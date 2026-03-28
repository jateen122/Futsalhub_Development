import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Clock, Gift, IndianRupee } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12t = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [cancelling, setCancelling] = useState(null);
  const [loyaltyTotal, setLoyaltyTotal] = useState(0);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/my/`, {
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

  useEffect(() => {
    if (!token) return navigate("/login");

    fetchBookings();

    // Fetch loyalty total
    fetch(`${BASE_URL}/api/bookings/loyalty/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setLoyaltyTotal(d.total_free_available || 0));
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(id);

    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${id}/cancel/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchBookings();
    } finally {
      setCancelling(null);
    }
  };

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.status === filter);

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
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

          {loyaltyTotal > 0 && (
            <button
              onClick={() => navigate("/my-rewards")}
              className="flex items-center gap-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-2.5 rounded-2xl font-semibold shadow hover:shadow-xl hover:scale-105 transition-all"
            >
              <Gift size={18} />
              {loyaltyTotal} Free Booking{loyaltyTotal > 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Bookings", value: stats.total, color: "from-gray-700 to-gray-900" },
            { label: "Confirmed", value: stats.confirmed, color: "from-emerald-500 to-teal-600" },
            { label: "Pending", value: stats.pending, color: "from-amber-500 to-orange-500" },
            { label: "Cancelled", value: stats.cancelled, color: "from-red-500 to-rose-600" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="bg-white rounded-3xl p-7 shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300 group"
            >
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
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-3 rounded-2xl font-semibold capitalize transition-all text-sm
                ${filter === f
                  ? "bg-yellow-500 text-white shadow"
                  : "bg-transparent hover:bg-gray-100 text-gray-600"}`}
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
            <p className="text-gray-500 mt-2">You don’t have any {filter !== "all" ? filter : ""} bookings yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl p-6 shadow border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-3 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{b.ground_name}</h2>

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
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <span
                      className={`px-5 py-1.5 rounded-2xl text-xs font-bold uppercase tracking-widest
                        ${b.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : b.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"}`}
                    >
                      {b.status}
                    </span>

                    {b.status === "pending" && (
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
            ))}
          </div>
        )}

        {/* Loyalty Banner */}
        {loyaltyTotal > 0 && (
          <div className="mt-12 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-3xl p-8 flex items-center gap-6 shadow-xl">
            <div className="text-5xl">🎁</div>
            <div className="flex-1">
              <p className="font-bold text-xl">You have {loyaltyTotal} free booking{loyaltyTotal > 1 ? "s" : ""} ready!</p>
              <p className="text-yellow-100 mt-1">Redeem them on your next booking</p>
            </div>
            <button
              onClick={() => navigate("/my-rewards")}
              className="bg-white text-yellow-600 font-semibold px-8 py-3 rounded-2xl hover:bg-yellow-100 transition"
            >
              View Rewards →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}