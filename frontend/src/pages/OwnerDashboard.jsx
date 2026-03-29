import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, MapPin, Calendar, Bell, LogOut, 
  TrendingUp, Award, Clock 
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_STYLES = {
  pending: { 
    dot: "bg-amber-500", 
    text: "text-amber-700", 
    badge: "bg-amber-100 text-amber-700 border border-amber-200" 
  },
  confirmed: { 
    dot: "bg-emerald-500", 
    text: "text-emerald-700", 
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" 
  },
  cancelled: { 
    dot: "bg-red-500", 
    text: "text-red-700", 
    badge: "bg-red-100 text-red-700 border border-red-200" 
  },
  refunded: { 
    dot: "bg-blue-500", 
    text: "text-blue-700", 
    badge: "bg-blue-100 text-blue-700 border border-blue-200" 
  },
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const userEmail = localStorage.getItem("email") || "";
  const firstName = userEmail.split("@")[0] || "Owner";

  const [profile, setProfile] = useState(null);
  const [myGrounds, setMyGrounds] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    Promise.all([
      fetch(`${BASE_URL}/api/accounts/profile/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/api/grounds/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/api/bookings/owner/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([prof, grounds, book, notif]) => {
        setProfile(prof);
        setMyGrounds(grounds.results || grounds || []);
        setBookings(book.results || book || []);
        setNotifications((notif.notifications || notif.results || notif || []).slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const stats = {
    totalGrounds: myGrounds.length,
    approvedGrounds: myGrounds.filter((g) => g.is_approved).length,
    pendingGrounds: myGrounds.filter((g) => !g.is_approved).length,
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    revenue: bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + parseFloat(b.total_price || 0), 0),
  };

  const recentBookings = [...bookings].slice(0, 4);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const newBookingCount = notifications.filter(
    (n) => n.notification_type === "booking_received" && !n.is_read
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <p className="text-gray-500 uppercase tracking-widest text-sm font-medium">Owner Dashboard</p>
            <h1 className="text-4xl font-bold text-gray-900 mt-1">
              Welcome, <span className="text-yellow-600">{firstName}</span>
            </h1>
            {profile?.email && <p className="text-gray-500 mt-1">{profile.email}</p>}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 text-red-600 hover:bg-red-50 rounded-2xl font-medium transition border border-red-100"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
          {[
            { label: "My Grounds", value: stats.totalGrounds, icon: MapPin },
            { label: "Approved", value: stats.approvedGrounds, icon: Award, color: "text-emerald-600" },
            { label: "Pending Grounds", value: stats.pendingGrounds, icon: Clock, color: "text-amber-600" },
            { label: "Total Bookings", value: stats.totalBookings, icon: Calendar },
            { label: "Pending Bookings", value: stats.pendingBookings, icon: Bell, color: "text-amber-600" },
            { label: "Revenue", value: `Rs ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600" },
          ].map((stat, index) => (
            <div key={index} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow transition">
              <div className="flex items-center justify-between mb-4">
                <stat.icon size={28} className={stat.color || "text-gray-400"} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-2 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              label: "Add New Ground",
              desc: "List a new futsal ground",
              path: "/add-ground",
              icon: Plus,
              primary: true,
            },
            {
              label: "My Grounds",
              desc: `${stats.totalGrounds} grounds listed`,
              path: "/add-ground",
              icon: MapPin,
            },
            {
              label: "Bookings",
              desc: `${stats.pendingBookings} pending`,
              path: "/owner-bookings",
              icon: Calendar,
              badge: stats.pendingBookings || null,
            },
            {
              label: "Notifications",
              desc: unreadCount > 0 ? `${unreadCount} unread` : "All read",
              path: "/owner-notifications",
              icon: Bell,
              badge: unreadCount || null,
            },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.path)}
              className={`group p-7 rounded-3xl border border-gray-200 bg-white hover:border-yellow-300 transition-all flex flex-col h-full relative ${action.primary ? "bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700" : ""}`}
            >
              {action.badge && (
                <span className="absolute top-5 right-5 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {action.badge}
                </span>
              )}

              <action.icon size={32} className={action.primary ? "text-white" : "text-gray-400 group-hover:text-yellow-600"} />

              <div className="mt-auto">
                <p className="font-semibold text-xl mt-8">{action.label}</p>
                <p className={`text-sm mt-1 ${action.primary ? "text-white/80" : "text-gray-500"}`}>
                  {action.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* New Bookings Alert */}
        {newBookingCount > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mb-10 flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Bell size={28} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-700">
                {newBookingCount} new booking{newBookingCount > 1 ? "s" : ""} received!
              </p>
              <p className="text-emerald-600 mt-1">Check and confirm them quickly.</p>
            </div>
            <button
              onClick={() => navigate("/owner-bookings")}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition"
            >
              View Bookings
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Grounds & Bookings */}
          <div className="lg:col-span-3 space-y-8">

            {/* My Grounds */}
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b flex items-center justify-between">
                <h2 className="font-semibold text-2xl text-gray-900">My Grounds</h2>
                <button
                  onClick={() => navigate("/add-ground")}
                  className="text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1"
                >
                  Add Ground <Plus size={18} />
                </button>
              </div>

              {myGrounds.length === 0 ? (
                <div className="px-8 py-16 text-center">
                  <p className="text-gray-400 mb-6">You haven't listed any grounds yet.</p>
                  <button
                    onClick={() => navigate("/add-ground")}
                    className="px-8 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl transition"
                  >
                    List Your First Ground
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myGrounds.map((g) => {
                    const imgSrc = g.image
                      ? g.image.startsWith("http")
                        ? g.image
                        : `${BASE_URL}${g.image}`
                      : null;

                    return (
                      <div key={g.id} className="px-8 py-6 flex items-center gap-6 hover:bg-gray-50 transition">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                          {imgSrc ? (
                            <img src={imgSrc} alt={g.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-50">⚽</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                          <p className="text-gray-500 text-sm mt-1">{g.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">Rs {g.price_per_hour}</p>
                          <span className={`text-xs px-4 py-1.5 rounded-full mt-2 inline-block border ${g.is_approved ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                            {g.is_approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b flex items-center justify-between">
                <h2 className="font-semibold text-2xl text-gray-900">Recent Bookings</h2>
                <button
                  onClick={() => navigate("/owner-bookings")}
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  View All
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="px-8 py-16 text-center text-gray-400">No bookings received yet</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => {
                    const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                    return (
                      <div key={b.id} className="px-8 py-6 flex items-center gap-6 hover:bg-gray-50 transition">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{b.ground_name}</p>
                          <p className="text-gray-500 text-sm mt-1">{b.user_email} • {b.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">Rs {b.total_price}</p>
                          <span className={`text-xs px-4 py-1.5 rounded-full mt-2 inline-block border ${s.badge}`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-2 space-y-8">

            {/* Notifications */}
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 border-b flex items-center justify-between">
                <h2 className="font-semibold text-2xl text-gray-900 flex items-center gap-3">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => navigate("/owner-notifications")}
                  className="text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                >
                  View All
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="px-8 py-12 text-center text-gray-400">No notifications yet</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[420px] overflow-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`px-8 py-5 hover:bg-gray-50 transition ${!n.is_read ? "bg-yellow-50" : ""}`}>
                      <p className={`text-sm ${n.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                        {n.message.length > 95 ? n.message.slice(0, 95) + "..." : n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center text-4xl font-bold text-yellow-600 border border-yellow-200">
                  {firstName[0]?.toUpperCase() || "O"}
                </div>
                <div>
                  <p className="font-semibold text-2xl text-gray-900">
                    {profile?.full_name || firstName}
                  </p>
                  <p className="text-gray-500">{profile?.email}</p>
                  <span className="inline-block mt-3 px-5 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                    Owner
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate("/profile")}
                className="mt-10 w-full py-4 border border-gray-300 hover:bg-gray-50 rounded-2xl font-medium transition"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}