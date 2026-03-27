import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Clock, Heart, Bell } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_COLOR = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded:  "bg-gray-100 text-gray-500",
};

export default function PlayerDashboard() {
  const navigate   = useNavigate();
  const token      = localStorage.getItem("access");
  const email      = localStorage.getItem("email") || "Player";
  const firstName  = email.split("@")[0];

  const [allBookings,    setAllBookings]    = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [favCount,       setFavCount]       = useState(0);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    if (!token) { 
      navigate("/login"); 
      return; 
    }

    Promise.all([
      fetch(`${BASE_URL}/api/bookings/my/`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/notifications/`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(r => r.json()),
      fetch(`${BASE_URL}/api/grounds/favorites/`, { 
        headers: { Authorization: `Bearer ${token}` } 
      }).then(r => r.json()),
    ])
      .then(([b, n, f]) => {
        const all = b.results || b || [];
        setAllBookings(all);
        setRecentBookings(all.slice(0, 5));

        const notifList = n.notifications || n.results || n || [];
        setNotifications(notifList.filter(x => !x.is_read).slice(0, 4));
        
        setFavCount((f.favorites || f.results || f || []).length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     allBookings.length,
    confirmed: allBookings.filter(b => b.status === "confirmed").length,
    pending:   allBookings.filter(b => b.status === "pending").length,
    cancelled: allBookings.filter(b => b.status === "cancelled").length,
  };

  const quickActions = [
    { label: "Browse Grounds",  path: "/grounds",          color: "from-emerald-500 to-teal-600" },
    { label: "My Bookings",     path: "/my-bookings",      color: "from-blue-500 to-indigo-600" },
    { label: "My Favorites",    path: "/my-favorites",     color: "from-rose-500 to-pink-600" },
    { label: "Payment History", path: "/my-payments",      color: "from-amber-500 to-orange-500" },
    { label: "Notifications",   path: "/notifications",    color: "from-purple-500 to-violet-600" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 pb-12">

      <div className="max-w-7xl mx-auto px-6 py-10">   {/* Wider container for full space */}

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-semibold text-gray-900 tracking-tight capitalize">
            {firstName}
          </h1>
        </div>

        {/* Stats Cards - Full Width */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Bookings", value: stats.total,     icon: <Ticket size={28} />, color: "from-gray-700 to-gray-900" },
            { label: "Confirmed",      value: stats.confirmed, icon: <Calendar size={28} />, color: "from-emerald-500 to-teal-600" },
            { label: "Pending",        value: stats.pending,   icon: <Clock size={28} />, color: "from-amber-500 to-orange-500" },
            { label: "Favorites",      value: favCount,        icon: <Heart size={28} />, color: "from-rose-500 to-pink-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} mb-6 text-white shadow-md`}>
                {s.icon}
              </div>
              <p className="text-5xl font-bold text-gray-900 tracking-tighter">{s.value}</p>
              <p className="text-gray-500 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-8">

          {/* LEFT - Takes more space */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {quickActions.map((a, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(a.path)}
                    className={`bg-gradient-to-br ${a.color} text-white rounded-2xl p-6 text-left hover:scale-[1.03] active:scale-95 transition-all duration-200 shadow-md flex items-center gap-4 group`}
                  >
                    <span className="text-3xl opacity-90 group-hover:scale-110 transition">•</span>
                    <span className="font-semibold text-lg tracking-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Bookings - Wider */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <h2 className="text-2xl font-semibold text-gray-900">Recent Bookings</h2>
                <button 
                  onClick={() => navigate("/my-bookings")}
                  className="text-yellow-600 font-semibold hover:text-yellow-700 transition flex items-center gap-1"
                >
                  View all →
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                    <Ticket size={42} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">No bookings yet</p>
                  <button 
                    onClick={() => navigate("/grounds")}
                    className="mt-6 px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl font-semibold transition"
                  >
                    Book a Ground Now
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="px-8 py-6 hover:bg-gray-50 transition flex items-center gap-6">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">{b.ground_name}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {b.date} • {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">₹{b.total_price}</p>
                        </div>
                        <span 
                          className={`px-5 py-1.5 rounded-2xl text-xs font-bold capitalize border ${STATUS_COLOR[b.status] || STATUS_COLOR.pending}`}
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

          {/* RIGHT COLUMN - Alerts + Account */}
          <div className="col-span-12 lg:col-span-4 space-y-8">

            {/* Unread Alerts */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Bell size={22} className="text-yellow-600" />
                  <h2 className="text-2xl font-semibold text-gray-900">Unread Alerts</h2>
                </div>
                <button 
                  onClick={() => navigate("/notifications")}
                  className="text-yellow-600 text-sm font-semibold hover:text-yellow-700 transition"
                >
                  View all →
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-500">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-8 py-5 hover:bg-gray-50 transition">
                      <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Card */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <p className="uppercase tracking-widest text-xs font-semibold text-gray-400 mb-4">Account</p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                  🎮
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{firstName}</p>
                  <p className="text-gray-500 text-sm truncate">{email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-5 text-center">
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500 mt-1">Bookings</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-5 text-center border border-rose-100">
                  <p className="text-3xl font-bold text-rose-600">{favCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Favorites</p>
                </div>
              </div>

              <button 
                onClick={() => navigate("/my-favorites")}
                className="w-full mt-6 py-3.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl font-semibold transition flex items-center justify-center gap-2"
              >
                View All Favorites
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}