// frontend/src/pages/OwnerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  Bell,
  ChevronRight,
  Settings,
  Plus,
  BarChart2,
  CheckCircle,
  XCircle,
  LogOut,
  AlertCircle,
  Users,
  ArrowRight,
  Activity,
  DollarSign,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

async function fetchAllPages(url, token) {
  let results = [],
    nextUrl = url;
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

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const today = () => new Date().toISOString().split("T")[0];

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

function StatCard({ label, value, icon, sub, accent }) {
  return (
    <div
      className={`relative bg-white rounded-2xl border p-5 shadow-sm hover:-translate-y-0.5 transition-transform overflow-hidden
      ${accent ? "border-amber-200" : "border-gray-200"}`}
    >
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-yellow-50 opacity-70" />
      )}
      <div className="relative">
        <div
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 text-white shadow-sm
          ${accent ? "bg-gradient-to-br from-amber-500 to-yellow-600" : "bg-gradient-to-br from-slate-600 to-slate-800"}`}
        >
          {icon}
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">
          {value}
        </p>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">
          {label}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const email = localStorage.getItem("email") || "";

  const [profile, setProfile] = useState(null);
  const [ground, setGround] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const load = async () => {
      try {
        const [profRes, groundsRes, notifRes, allB] = await Promise.all([
          fetch(`${BASE_URL}/api/accounts/profile/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/grounds/my/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/notifications/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetchAllPages(`${BASE_URL}/api/bookings/owner/`, token),
        ]);
        const profData = await profRes.json();
        const groundsData = await groundsRes.json();
        const notifData = await notifRes.json();

        setProfile(profData);
        const list = groundsData.results || groundsData || [];
        setGround(list[0] || null);
        setNotifs(
          (
            notifData.notifications ||
            notifData.results ||
            notifData ||
            []
          ).slice(0, 5),
        );
        setBookings(allB);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateStatus = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${bookingId}/update/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok)
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status: newStatus } : b,
          ),
        );
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const firstName =
    profile?.full_name?.split(" ")[0] || email.split("@")[0] || "Owner";
  const todayStr = today();
  const todayBkgs = bookings.filter((b) => b.date === todayStr);
  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const revenue = confirmed.reduce(
    (s, b) => s + parseFloat(b.total_price || 0),
    0,
  );
  const unread = notifs.filter((n) => !n.is_read).length;

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);

  const imgSrc = ground?.image
    ? ground.image.startsWith("http")
      ? ground.image
      : `${BASE_URL}${ground.image}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Bookings"
            value={bookings.length}
            icon={<Calendar size={18} />}
            sub={`${todayBkgs.length} today`}
          />
          <StatCard
            label="Pending"
            value={pending.length}
            icon={<Clock size={18} />}
            sub="awaiting action"
          />
          <StatCard
            label="Confirmed"
            value={confirmed.length}
            icon={<CheckCircle size={18} />}
          />
          <StatCard
            label="Revenue"
            value={`Rs ${Math.round(revenue).toLocaleString()}`}
            icon={<DollarSign size={18} />}
            sub="from confirmed"
            accent
          />
        </div>

        {/* Pending alert */}
        {pending.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-sm">
                {pending.length} booking{pending.length > 1 ? "s" : ""} need
                your response
              </p>
              <p className="text-amber-600 text-xs mt-0.5">
                Review and accept or decline below
              </p>
            </div>
            <button
              onClick={() => navigate("/owner-bookings")}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition flex-shrink-0"
            >
              View All
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-1 space-y-5">
            {/* Ground card */}
            {ground ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="relative h-48">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={ground.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
                      <MapPin size={40} className="text-amber-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-black text-lg leading-tight">
                      {ground.name}
                    </p>
                    <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={11} /> {ground.location}
                    </p>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border
                      ${
                        ground.is_approved
                          ? "bg-red-500/90 text-white border-red-400"
                          : "bg-amber-500/90 text-white border-amber-400"
                      }`}
                    >
                      {ground.is_approved ? "Live" : "Pending Approval"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-lg font-black text-gray-900">
                        Rs {ground.price_per_hour}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-medium">
                        per hour
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-xs font-bold text-gray-700">
                        {fmt12(ground.opening_time)}
                      </p>
                      <p className="text-[10px] text-gray-400">to</p>
                      <p className="text-xs font-bold text-gray-700">
                        {fmt12(ground.closing_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate("/add-ground")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition"
                    >
                      <Settings size={14} />
                      Manage
                    </button>
                    <button
                      onClick={() => navigate("/owner-analytics")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition"
                    >
                      <BarChart2 size={14} />
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin size={26} className="text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">No Ground Yet</h3>
                <p className="text-gray-400 text-sm mb-5">
                  List your futsal ground to start receiving bookings
                </p>
                <button
                  onClick={() => navigate("/add-ground")}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition mx-auto"
                >
                  <Plus size={16} />
                  Add Ground
                </button>
              </div>
            )}

            {/* Quick nav */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {[
                {
                  label: "All Bookings",
                  sub: `${bookings.length} total`,
                  path: "/owner-bookings",
                  Icon: Calendar,
                  badge: pending.length,
                },
                {
                  label: "Pricing & Slots",
                  sub: "Dynamic pricing rules",
                  path: "/owner-pricing",
                  Icon: DollarSign,
                },
                {
                  label: "Analytics",
                  sub: "Revenue & booking trends",
                  path: "/owner-analytics",
                  Icon: BarChart2,
                },
                {
                  label: "Notifications",
                  sub: unread > 0 ? `${unread} unread` : "All read",
                  path: "/owner-notifications",
                  Icon: Bell,
                  badge: unread,
                },
              ].map((a, i) => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left group ${i > 0 ? "border-t border-gray-50" : ""}`}
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition">
                    <a.Icon
                      size={16}
                      className="text-gray-400 group-hover:text-amber-600 transition"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">
                      {a.label}
                    </p>
                    <p className="text-xs text-gray-400">{a.sub}</p>
                  </div>
                  {a.badge > 0 && (
                    <span className="bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
                      {a.badge > 9 ? "9+" : a.badge}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    className="text-gray-300 group-hover:text-amber-500 transition flex-shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-5">
            {/* Pending requests */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-600" />
                    <h2 className="font-bold text-gray-900">
                      Pending Requests
                    </h2>
                    <span className="text-xs font-black bg-amber-500 text-white px-2 py-0.5 rounded-full">
                      {pending.length}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/owner-bookings")}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
                  >
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {pending.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">
                          {b.user_email}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {b.date} · {fmt12(b.start_time)} – {fmt12(b.end_time)}
                          {b.is_free_booking
                            ? " · Free"
                            : ` · Rs ${b.total_price}`}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateStatus(b.id, "confirmed")}
                          disabled={updating === b.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition disabled:opacity-50"
                        >
                          <CheckCircle size={12} />
                          {updating === b.id ? "..." : "Accept"}
                        </button>
                        <button
                          onClick={() => updateStatus(b.id, "cancelled")}
                          disabled={updating === b.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold rounded-lg text-xs transition disabled:opacity-50"
                        >
                          <XCircle size={12} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-amber-600" />
                  <h2 className="font-bold text-gray-900">Today's Schedule</h2>
                  {todayBkgs.length > 0 && (
                    <span className="text-xs font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      {todayBkgs.length}
                    </span>
                  )}
                </div>
              </div>
              {todayBkgs.length === 0 ? (
                <div className="py-10 text-center">
                  <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No bookings today</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todayBkgs.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 px-6 py-4"
                    >
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {b.user_email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border capitalize ${STATUS_COLOR[b.status] || STATUS_COLOR.pending}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-gray-400" />
                  <h2 className="font-bold text-gray-900">Recent Activity</h2>
                </div>
                <button
                  onClick={() => navigate("/owner-bookings")}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
                >
                  All bookings <ChevronRight size={12} />
                </button>
              </div>
              {recentBookings.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">
                  No activity yet
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5
                        ${
                          b.status === "confirmed"
                            ? "bg-emerald-400"
                            : b.status === "pending"
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {b.user_email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {b.date} · {fmt12(b.start_time)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {b.is_free_booking ? (
                            <span className="text-amber-600 text-xs font-bold">
                              Free
                            </span>
                          ) : (
                            `Rs ${b.total_price}`
                          )}
                        </p>
                        <span
                          className={`text-[10px] font-bold capitalize
                          ${
                            b.status === "confirmed"
                              ? "text-emerald-600"
                              : b.status === "pending"
                                ? "text-amber-600"
                                : "text-red-500"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
