import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_STYLES = {
  pending: {
    dot: "bg-amber-400",
    text: "text-amber-400",
    badge: "bg-amber-400/10 border-amber-400/30",
  },
  confirmed: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    badge: "bg-emerald-400/10 border-emerald-400/30",
  },
  cancelled: {
    dot: "bg-red-400",
    text: "text-red-400",
    badge: "bg-red-400/10 border-red-400/30",
  },
  refunded: {
    dot: "bg-blue-400",
    text: "text-blue-400",
    badge: "bg-blue-400/10 border-blue-400/30",
  },
};

export default function PlayerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const userEmail = localStorage.getItem("email") || "";
  const firstName = userEmail.split("@")[0] || "Player";

  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
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
      fetch(`${BASE_URL}/api/bookings/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`${BASE_URL}/api/payments/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
    ])
      .then(([prof, book, notif, pay]) => {
        setProfile(prof);
        setBookings(book.results || book || []);
        setNotifications(
          (notif.notifications || notif.results || notif || []).slice(0, 5),
        );
        setPayments(pay.results || pay || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    spent: payments
      .filter((p) => p.status === "success")
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0),
  };

  const recentBookings = [...bookings].slice(0, 3);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm tracking-widest font-mono">
            LOADING DASHBOARD
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d18] pt-20 pb-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[300px] bg-blue-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-white/30 text-sm uppercase tracking-[0.2em] mb-1">
              Welcome back
            </p>
            <h1 className="text-4xl font-black text-white capitalize">
              {firstName}
            </h1>
            <p className="text-white/40 text-sm mt-1">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 transition-all"
          >
            Sign out
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            {
              label: "Total Bookings",
              value: stats.total,
              color: "text-white",
              accent: "from-white/5",
            },
            {
              label: "Confirmed",
              value: stats.confirmed,
              color: "text-emerald-400",
              accent: "from-emerald-500/10",
            },
            {
              label: "Pending",
              value: stats.pending,
              color: "text-amber-400",
              accent: "from-amber-500/10",
            },
            {
              label: "Total Spent",
              value: `Rs ${stats.spent.toFixed(0)}`,
              color: "text-amber-400",
              accent: "from-amber-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.accent} to-transparent border border-white/10 rounded-2xl p-5`}
            >
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            {
              label: "Browse Grounds",
              desc: "Find & book a futsal",
              path: "/grounds",
              style: "bg-amber-400 text-black hover:bg-amber-300",
              primary: true,
            },
            {
              label: "My Bookings",
              desc: "View all your sessions",
              path: "/my-bookings",
              style:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            },
            {
              label: "Payments",
              desc: "Transaction history",
              path: "/my-payments",
              style:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            },
            {
              label: "Notifications",
              desc: unreadCount > 0 ? `${unreadCount} unread` : "All caught up",
              path: "/notifications",
              style:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              badge: unreadCount > 0 ? unreadCount : null,
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`relative p-5 rounded-2xl text-left transition-all duration-200 ${action.style}`}
            >
              {action.badge && (
                <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                  {action.badge}
                </span>
              )}
              <p
                className={`font-bold text-sm ${action.primary ? "text-black" : "text-white"}`}
              >
                {action.label}
              </p>
              <p
                className={`text-xs mt-2 ${action.primary ? "text-black/60" : "text-white/40"}`}
              >
                {action.desc}
              </p>
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold">Recent Bookings</h2>
              <button
                onClick={() => navigate("/my-bookings")}
                className="text-amber-400 text-sm hover:text-amber-300 transition"
              >
                View all →
              </button>
            </div>

            {recentBookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-white/40 text-sm mb-4">No bookings yet</p>
                <button
                  onClick={() => navigate("/grounds")}
                  className="px-5 py-2 bg-amber-400 text-black text-sm font-bold rounded-xl hover:bg-amber-300 transition"
                >
                  Book Your First Ground
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentBookings.map((b) => {
                  const s = STATUS_STYLES[b.status] || STATUS_STYLES.pending;
                  return (
                    <div
                      key={b.id}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {b.ground_name}
                        </p>
                        <p className="text-white/40 text-xs mt-0.5">
                          {b.date} · {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-amber-400 font-bold text-sm">
                          Rs {b.total_price}
                        </p>
                        <span
                          className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${s.badge} ${s.text} capitalize`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-bold flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-amber-400 text-black text-xs font-black rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </h2>
              <button
                onClick={() => navigate("/notifications")}
                className="text-amber-400 text-sm hover:text-amber-300 transition"
              >
                All →
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-white/40 text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-5 py-3.5 hover:bg-white/3 transition ${!n.is_read ? "opacity-100" : "opacity-50"}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs leading-relaxed ${n.is_read ? "text-white/40" : "text-white/80"}`}
                        >
                          {n.message.length > 80
                            ? n.message.slice(0, 80) + "…"
                            : n.message}
                        </p>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white/3 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-black text-black">
                {firstName[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-bold text-lg capitalize">
                  {profile?.full_name || firstName}
                </p>
                <p className="text-white/40 text-sm">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 bg-sky-400/10 border border-sky-400/30 text-sky-400 text-xs font-bold rounded-full capitalize">
                    {profile?.role || "player"}
                  </span>
                  {profile?.is_verified && (
                    <span className="px-2.5 py-0.5 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-bold rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/profile")}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-xl text-sm hover:bg-white/10 transition"
            >
              Edit Profile →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
