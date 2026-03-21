import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_COLOR = {
  pending:   "bg-amber-50 border-amber-200 text-amber-700",
  confirmed: "bg-green-50 border-green-200 text-green-700",
  cancelled: "bg-red-50 border-red-200 text-red-600",
  refunded:  "bg-gray-100 border-gray-200 text-gray-500",
};

export default function PlayerDashboard() {
  const navigate   = useNavigate();
  const token      = localStorage.getItem("access");
  const email      = localStorage.getItem("email") || "Player";
  const firstName  = email.split("@")[0];

  const [bookings,       setBookings]       = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [favCount,       setFavCount]       = useState(0);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    Promise.all([
      fetch(`${BASE_URL}/api/bookings/my/`,      { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${BASE_URL}/api/notifications/`,    { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${BASE_URL}/api/grounds/favorites/`,        { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([b, n, f]) => {
        setBookings((b.results || b || []).slice(0, 5));
        const notifList = n.notifications || n.results || n || [];
        setNotifications(notifList.filter(x => !x.is_read).slice(0, 4));
        setFavCount((f.favorites || f.results || f || []).length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    pending:   bookings.filter(b => b.status === "pending").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  const quickActions = [
    { label: "Browse Grounds",  icon: "⚽", path: "/grounds",          color: "bg-green-50 border-green-200 text-green-700"  },
    { label: "My Bookings",     icon: "📋", path: "/my-bookings",      color: "bg-blue-50 border-blue-200 text-blue-700"    },
    { label: "My Favorites",    icon: "♥",  path: "/my-favorites",     color: "bg-red-50 border-red-200 text-red-600"       },
    { label: "Payment History", icon: "💳", path: "/my-payments",      color: "bg-amber-50 border-amber-200 text-amber-700" },
    { label: "Notifications",   icon: "🔔", path: "/notifications",    color: "bg-purple-50 border-purple-200 text-purple-700" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* header */}
        <div className="mb-8">
          <p className="text-gray-400 text-sm font-medium mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-black text-gray-900 capitalize">{firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">Here's your booking overview</p>
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Bookings", value: stats.total,     color: "text-gray-900",   bg: "bg-white"  },
            { label: "Confirmed",      value: stats.confirmed, color: "text-green-600",  bg: "bg-white"  },
            { label: "Pending",        value: stats.pending,   color: "text-amber-600",  bg: "bg-white"  },
            { label: "Favorites",      value: favCount,        color: "text-red-500",    bg: "bg-white"  },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border border-gray-200 shadow-sm p-5 text-center`}>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">

          {/* LEFT */}
          <div className="col-span-12 lg:col-span-8 space-y-5">

            {/* quick actions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-black text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickActions.map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)}
                    className={`${a.color} border rounded-xl p-4 text-left hover:scale-[1.02] transition-all font-semibold text-sm flex items-center gap-2.5`}>
                    <span className="text-xl">{a.icon}</span> {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* recent bookings */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-800">Recent Bookings</h2>
                <button onClick={() => navigate("/my-bookings")}
                  className="text-green-600 text-sm font-semibold hover:text-green-700 transition">
                  View all →
                </button>
              </div>
              {bookings.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-gray-400 text-sm">No bookings yet</p>
                  <button onClick={() => navigate("/grounds")}
                    className="mt-4 px-5 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition">
                    Book a Ground
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {bookings.map(b => (
                    <div key={b.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-bold text-sm truncate">{b.ground_name}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{b.date} · {fmt12(b.start_time)} – {fmt12(b.end_time)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-green-600 font-black text-sm">Rs {b.total_price}</span>
                        <span className={`px-2.5 py-1 rounded text-xs font-bold border capitalize ${STATUS_COLOR[b.status] || STATUS_COLOR.pending}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            {/* notifications */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-800 text-sm">Unread Alerts</h2>
                <button onClick={() => navigate("/notifications")}
                  className="text-green-600 text-xs font-semibold hover:text-green-700 transition">
                  View all →
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">🔔</p>
                  <p className="text-gray-400 text-xs">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div key={n.id} className="px-5 py-3 hover:bg-gray-50 transition">
                      <p className="text-gray-700 text-xs leading-relaxed">{n.message}</p>
                      <p className="text-gray-300 text-xs mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* account card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account</p>
              <div className="w-12 h-12 rounded-2xl bg-green-100 border border-green-200 flex items-center justify-center text-2xl mb-3">🎮</div>
              <p className="text-gray-900 font-bold capitalize">{firstName}</p>
              <p className="text-gray-400 text-xs truncate mt-0.5">{email}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-gray-800 font-black text-lg">{stats.total}</p>
                  <p className="text-gray-400">Bookings</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2.5 text-center border border-red-100">
                  <p className="text-red-500 font-black text-lg">{favCount}</p>
                  <p className="text-gray-400">Favorites</p>
                </div>
              </div>
              <button onClick={() => navigate("/my-favorites")}
                className="w-full mt-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition">
                ♥ View Favorites
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
