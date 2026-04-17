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
  const [h] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const email = localStorage.getItem("email") || "Player";
  const firstName =
    email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);

  const [allBookings, setAllBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [favCount, setFavCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const [allB, notifRes, favRes, profileRes] = await Promise.all([
          fetchAllPages(`${BASE_URL}/api/bookings/my/`, token),
          fetch(`${BASE_URL}/api/notifications/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/grounds/favorites/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${BASE_URL}/api/accounts/profile/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setAllBookings(allB);
        setRecentBookings(allB.slice(0, 3));

        const notifData = await notifRes.json();
        const notifList =
          notifData.notifications || notifData.results || notifData || [];
        setNotifications(notifList.filter((x) => !x.is_read).slice(0, 4));

        const favData = await favRes.json();
        setFavCount(
          (favData.favorites || favData.results || favData || []).length,
        );

        const profileData = await profileRes.json();
        setProfile(profileData);
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
    {
      label: "Browse Grounds",
      path: "/grounds",
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "My Bookings",
      path: "/my-bookings",
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "My Favorites",
      path: "/my-favorites",
      color: "from-rose-500 to-pink-600",
    },
    {
      label: "Payment History",
      path: "/my-payments",
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Notifications",
      path: "/notifications",
      color: "from-purple-500 to-violet-600",
    },
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
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Player Dashboard
          </h1>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-24 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Bookings",
              value: stats.total,
              icon: <Ticket size={24} />,
              color: "from-slate-700 to-slate-900",
            },
            {
              label: "Confirmed",
              value: stats.confirmed,
              icon: <Calendar size={24} />,
              color: "from-emerald-500 to-teal-600",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: <Clock size={24} />,
              color: "from-amber-500 to-orange-500",
            },
            {
              label: "Favorites",
              value: favCount,
              icon: <Heart size={24} />,
              color: "from-rose-500 to-pink-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} mb-4 text-white`}
              >
                {s.icon}
              </div>
              <p className="text-4xl font-bold tracking-tighter text-gray-900">
                {s.value}
              </p>
              <p className="text-sm font-semibold text-gray-500 mt-2 tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className={`group bg-gradient-to-br ${action.color} text-white rounded-2xl p-6 text-left hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex flex-col justify-between h-full`}
                  >
                    <div className="text-3xl mb-4 opacity-90 group-hover:scale-110 transition-transform">
                      →
                    </div>
                    <div>
                      <p className="font-bold text-lg tracking-tight">
                        {action.label}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        Go to section
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Recent Bookings
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    {allBookings.length} total bookings
                  </p>
                </div>
                <button
                  onClick={() => navigate("/my-bookings")}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold transition text-sm"
                >
                  View All <ArrowRight size={18} />
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <Ticket size={40} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    No bookings yet
                  </h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
                    Start booking your favorite futsal grounds today!
                  </p>
                  <button
                    onClick={() => navigate("/grounds")}
                    className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition text-sm"
                  >
                    Browse Grounds
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <div
                      key={b.id}
                      className="px-8 py-6 hover:bg-gray-50 transition flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-gray-900 truncate">
                          {b.ground_name}
                        </p>
                        <p className="text-gray-500 mt-1 text-sm">
                          {b.date} • {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          {b.is_free_booking ? (
                            <p className="font-bold text-amber-600 text-sm">
                              FREE
                            </p>
                          ) : (
                            <p className="font-bold text-emerald-700 text-sm">
                              Rs {b.total_price}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-4 py-2 rounded-lg text-xs font-bold capitalize border ${STATUS_COLOR[b.status] || STATUS_COLOR.pending}`}
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

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Unread Alerts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell size={22} className="text-amber-600" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Unread Alerts
                  </h2>
                </div>
                <button
                  onClick={() => navigate("/notifications")}
                  className="text-amber-600 hover:text-amber-700 font-semibold text-xs transition flex items-center gap-1"
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">
                  You're all caught up!
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-8 py-5 hover:bg-gray-50 transition"
                    >
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(n.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Summary */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <p className="uppercase text-xs font-bold tracking-widest text-gray-400 mb-6">
                Your Account
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                  👟
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 capitalize">
                    {profile?.full_name || email.split("@")[0]}
                  </p>
                  <p className="text-gray-500 text-xs break-all">{email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {favCount}
                  </p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    Favorites
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.confirmed}
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Confirmed
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/profile")}
                className="w-full py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold rounded-xl transition text-sm"
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
