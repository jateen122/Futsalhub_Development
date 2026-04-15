// frontend/src/pages/PlayerDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Calendar, Clock, Heart, Bell, ArrowRight } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ── fetch ALL pages of a paginated DRF endpoint ────────────────────────────
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

const fmt12 = (t) => {
  if (!t) return "";
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_COLOR = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  refunded:  "bg-gray-100 text-gray-500 border-gray-200",
};

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const email = localStorage.getItem("email") || "Player";
  const firstName = email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

  const [allBookings, setAllBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const [allB, notifRes, favRes] = await Promise.all([
          fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
          fetch(`${BASE_URL}/api/notifications/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BASE_URL}/api/grounds/favorites/`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setAllBookings(allB);
        setRecentBookings(allB.slice(0, 5));

        const notifData = await notifRes.json();
        const notifList = notifData.notifications || notifData.results || notifData || [];
        setNotifications(notifList.filter((x) => !x.is_read).slice(0, 4));

        const favData = await favRes.json();
        setFavCount((favData.favorites || favData.results || favData || []).length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, navigate]);

  const stats = {
    total: allBookings.length,
    confirmed: allBookings.filter((b) => b.status === "confirmed").length,
    pending: allBookings.filter((b) => b.status === "pending").length,
    cancelled: allBookings.filter((b) => b.status === "cancelled").length,
  };

  const quickActions = [
    { label: "Browse Grounds", path: "/grounds", color: "from-emerald-500 to-teal-600" },
    { label: "My Bookings", path: "/my-bookings", color: "from-blue-500 to-indigo-600" },
    { label: "My Favorites", path: "/my-favorites", color: "from-rose-500 to-pink-600" },
    { label: "Payment History", path: "/my-payments", color: "from-amber-500 to-orange-500" },
    { label: "Notifications", path: "/notifications", color: "from-purple-500 to-violet-600" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-6shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Player Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate("/notifications")}
              className="relative p-3 hover:bg-gray-100 rounded-2xl transition"
            >
              <Bell size={24} className="text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-12 space-y-12">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Total Bookings", value: stats.total, icon: <Ticket size={28} />, color: "from-slate-700 to-slate-900" },
            { label: "Confirmed", value: stats.confirmed, icon: <Calendar size={28} />, color: "from-emerald-500 to-teal-600" },
            { label: "Pending", value: stats.pending, icon: <Clock size={28} />, color: "from-amber-500 to-orange-500" },
            { label: "Favorites", value: favCount, icon: <Heart size={28} />, color: "from-rose-500 to-pink-600" },
          ].map((s) => (
            <div 
              key={s.label} 
              className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} mb-6 text-white`}>
                {s.icon}
              </div>
              <p className="text-5xl font-bold tracking-tighter text-gray-900">{s.value}</p>
              <p className="text-sm font-semibold text-gray-500 mt-2 tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-10">

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className={`group bg-gradient-to-br ${action.color} text-white rounded-3xl p-8 text-left hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex flex-col justify-between h-full`}
                  >
                    <div className="text-4xl mb-6 opacity-90 group-hover:scale-110 transition-transform">→</div>
                    <div>
                      <p className="font-bold text-2xl tracking-tight">{action.label}</p>
                      <p className="text-white/70 text-sm mt-1">Go to section</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-10 py-7 border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Recent Bookings</h2>
                  <p className="text-gray-500 mt-1">{allBookings.length} total bookings</p>
                </div>
                <button 
                  onClick={() => navigate("/my-bookings")}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold transition"
                >
                  View All <ArrowRight size={20} />
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
                    <Ticket size={48} className="text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">No bookings yet</h3>
                  <p className="text-gray-500 mt-3 max-w-sm mx-auto">Start booking your favorite futsal grounds today!</p>
                  <button 
                    onClick={() => navigate("/grounds")} 
                    className="mt-8 px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-3xl transition"
                  >
                    Browse Grounds
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="px-10 py-7 hover:bg-gray-50 transition flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xl text-gray-900 truncate">{b.ground_name}</p>
                        <p className="text-gray-500 mt-1 text-base">
                          {b.date} • {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right">
                          {b.is_free_booking ? (
                            <p className="font-bold text-amber-600 text-lg">FREE</p>
                          ) : (
                            <p className="font-bold text-emerald-700 text-lg">Rs {b.total_price}</p>
                          )}
                        </div>

                        <span className={`px-6 py-2 rounded-2xl text-sm font-bold capitalize border ${STATUS_COLOR[b.status] || STATUS_COLOR.pending}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">

            {/* Unread Alerts */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-7 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Bell size={26} className="text-amber-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Unread Alerts</h2>
                </div>
                <button 
                  onClick={() => navigate("/notifications")}
                  className="text-amber-600 hover:text-amber-700 font-semibold text-sm transition flex items-center gap-1"
                >
                  View all <ArrowRight size={18} />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-16 text-center text-gray-500">
                  You're all caught up!
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <div key={n.id} className="px-8 py-6 hover:bg-gray-50 transition">
                      <p className="text-base text-gray-800 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-3">
                        {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Summary */}
            <div className="bg-white rounded-3xl p-9 border border-gray-100 shadow-sm">
              <p className="uppercase text-xs font-bold tracking-widest text-gray-400 mb-6">Your Account</p>
              
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center text-5xl shadow-inner">
                  👟
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900 capitalize">{firstName}</p>
                  <p className="text-gray-500 text-sm break-all">{email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                  <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-2 tracking-widest">BOOKINGS</p>
                </div>
                <div className="bg-rose-50 rounded-2xl p-6 text-center border border-rose-100">
                  <p className="text-4xl font-bold text-rose-600">{favCount}</p>
                  <p className="text-xs font-semibold text-gray-500 mt-2 tracking-widest">FAVORITES</p>
                </div>
              </div>

              <button 
                onClick={() => navigate("/my-favorites")}
                className="w-full mt-8 py-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-2xl transition"
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