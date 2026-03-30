import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Clock, 
  User, 
  IndianRupee, 
  CheckCircle, 
  XCircle, 
  ArrowLeft 
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const STATUS_CONFIG = {
  pending: {
    color: "text-amber-600",
    bg: "bg-amber-100",
    border: "border-amber-200",
    label: "Pending",
  },
  confirmed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
    label: "Confirmed",
  },
  cancelled: {
    color: "text-red-600",
    bg: "bg-red-100",
    border: "border-red-200",
    label: "Cancelled",
  },
  refunded: {
    color: "text-blue-600",
    bg: "bg-blue-100",
    border: "border-blue-200",
    label: "Refunded",
  },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function OwnerBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchBookings();
  }, [filter, dateFilter]);

  const fetchBookings = () => {
    let url = `${BASE_URL}/api/bookings/owner/`;
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (dateFilter) params.set("date", dateFilter);
    if ([...params].length) url += `?${params}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.results || d || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      const response = await fetch(
        `${BASE_URL}/api/bookings/${bookingId}/update/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: newStatus } : b
          )
        );
      } else {
        const errorData = await response.json();
        alert(errorData?.detail || "Failed to update booking");
      }
    } catch (error) {
      alert("Error updating booking: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    revenue: bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + parseFloat(b.total_price || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/owner-dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Ground Bookings</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Manage all bookings received for your grounds
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { 
              label: "Total Bookings", 
              value: stats.total, 
              color: "text-gray-900",
              icon: <User size={24} className="text-gray-600" /> 
            },
            { 
              label: "Pending", 
              value: stats.pending, 
              color: "text-amber-600",
              icon: <Clock size={24} className="text-amber-600" /> 
            },
            { 
              label: "Confirmed", 
              value: stats.confirmed, 
              color: "text-emerald-600",
              icon: <CheckCircle size={24} className="text-emerald-600" /> 
            },
            { 
              label: "Revenue", 
              value: `Rs ${stats.revenue.toFixed(0)}`, 
              color: "text-emerald-600",
              icon: <IndianRupee size={24} className="text-emerald-600" /> 
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="p-4 bg-gray-100 rounded-2xl">
                  {s.icon}
                </div>
                <p className={`text-4xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              <p className="text-gray-600 font-medium mt-6 text-lg">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-start lg:items-center">
          <div className="flex flex-wrap gap-3">
            {["all", "pending", "confirmed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-7 py-3.5 rounded-2xl text-sm font-semibold capitalize transition-all
                  ${filter === f 
                    ? "bg-gray-900 text-white shadow-md" 
                    : "bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"}`}
              >
                {f === "all" ? "All Bookings" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-gray-300 text-gray-700 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-gray-900 w-full lg:w-auto"
              />
            </div>
            {dateFilter && (
              <button
                onClick={() => setDateFilter("")}
                className="text-gray-500 hover:text-gray-700 font-medium px-4 py-3.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-200">
            <div className="text-6xl mb-6 text-gray-300">📭</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No bookings found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Bookings from players will appear here once they book your ground.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {bookings.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
              const isPending = b.status === "pending";

              return (
                <div
                  key={b.id}
                  className="bg-white border border-gray-200 rounded-3xl p-8 hover:border-gray-300 hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    {/* Booking Info */}
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-gray-700 flex-shrink-0">
                        #{b.id}
                      </div>

                      <div>
                        <h3 className="font-semibold text-2xl text-gray-900">{b.ground_name}</h3>
                        <div className="flex items-center gap-2 text-gray-600 mt-2">
                          <User size={18} />
                          <span>{b.user_email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Date</p>
                        <div className="flex items-center gap-2 font-medium text-gray-800">
                          <Calendar size={18} className="text-gray-500" />
                          {b.date}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Time Slot</p>
                        <div className="flex items-center gap-2 font-medium text-gray-800">
                          <Clock size={18} className="text-gray-500" />
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Amount</p>
                        <p className="text-xl font-bold text-gray-900">
                          Rs {parseFloat(b.total_price || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex flex-col items-end gap-4 min-w-[180px]">
                      <span
                        className={`px-6 py-2.5 rounded-2xl text-sm font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
                      >
                        {cfg.label}
                      </span>

                      {isPending && (
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => updateBookingStatus(b.id, "confirmed")}
                            disabled={updating === b.id}
                            className="flex items-center gap-2 px-7 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-2xl transition-all disabled:cursor-not-allowed"
                          >
                            <CheckCircle size={18} />
                            {updating === b.id ? "Accepting..." : "Accept"}
                          </button>

                          <button
                            onClick={() => updateBookingStatus(b.id, "cancelled")}
                            disabled={updating === b.id}
                            className="flex items-center gap-2 px-7 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-2xl transition-all disabled:cursor-not-allowed"
                          >
                            <XCircle size={18} />
                            {updating === b.id ? "Declining..." : "Decline"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}