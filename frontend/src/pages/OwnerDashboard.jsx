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
        setNotifications(
          (notif.notifications || notif.results || notif || []).slice(0, 5),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    (n) => n.notification_type === "booking_received" && !n.is_read,
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
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
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40  w-[400px] h-[400px] bg-amber-500/5  rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[500px] h-[300px] bg-teal-500/4  rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-white/30 text-sm uppercase tracking-[0.2em] mb-1">
              Owner Dashboard
            </p>
            <h1 className="text-4xl font-black text-white capitalize">
              {firstName} <span className="text-emerald-400">•</span>
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {[
            {
              label: "My Grounds",
              value: stats.totalGrounds,
              color: "text-white",
              from: "from-white/5",
            },
            {
              label: "Approved",
              value: stats.approvedGrounds,
              color: "text-emerald-400",
              from: "from-emerald-500/10",
            },
            {
              label: "Awaiting",
              value: stats.pendingGrounds,
              color: "text-amber-400",
              from: "from-amber-500/10",
            },
            {
              label: "Total Bookings",
              value: stats.totalBookings,
              color: "text-sky-400",
              from: "from-sky-500/10",
            },
            {
              label: "Pending",
              value: stats.pendingBookings,
              color: "text-amber-400",
              from: "from-amber-500/10",
            },
            {
              label: "Revenue",
              value: `Rs ${stats.revenue.toFixed(0)}`,
              color: "text-emerald-400",
              from: "from-emerald-500/10",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-gradient-to-br ${s.from} to-transparent border border-white/10 rounded-2xl p-4 text-center`}
            >
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-2 uppercase tracking-widest leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            {
              label: "Add Ground",
              desc: "List a new futsal",
              path: "/add-ground",
              style: "bg-emerald-500 text-white hover:bg-emerald-400",
              primary: true,
            },
            {
              label: "My Grounds",
              desc: `${stats.totalGrounds} listed`,
              path: "/add-ground",
              style:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
            },
            {
              label: "Bookings",
              desc: `${stats.pendingBookings} pending`,
              path: "/owner-bookings",
              style:
                "bg-white/5 border border-white/10 text-white hover:bg-white/10",
              badge: stats.pendingBookings > 0 ? stats.pendingBookings : null,
            },
            {
              label: "Notifications",
              desc: unreadCount > 0 ? `${unreadCount} unread` : "All read",
              path: "/owner-notifications",
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
              <p className="font-bold text-sm">{action.label}</p>
              <p
                className={`text-xs mt-1 ${action.primary ? "text-white/70" : "text-white/40"}`}
              >
                {action.desc}
              </p>
            </button>
          ))}
        </div>

        {newBookingCount > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
              →
            </div>
            <div className="flex-1">
              <p className="text-blue-300 font-bold">
                {newBookingCount} new booking{newBookingCount > 1 ? "s" : ""}{" "}
                received!
              </p>
              <p className="text-blue-400/60 text-sm">
                Players have booked your ground. Review them now.
              </p>
            </div>
            <button
              onClick={() => navigate("/owner-bookings")}
              className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl text-sm hover:bg-blue-400 transition"
            >
              View Bookings
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-bold text-lg">My Grounds</h2>
                <button
                  onClick={() => navigate("/add-ground")}
                  className="text-emerald-400 text-sm hover:text-emerald-300 transition font-semibold"
                >
                  Manage →
                </button>
              </div>

              {myGrounds.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <div className="text-3xl font-bold text-white/20">·</div>
                  </div>
                  <p className="text-white/40 text-sm mb-4">
                    You haven't listed any grounds yet
                  </p>
                  <button
                    onClick={() => navigate("/add-ground")}
                    className="px-5 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-400 transition"
                  >
                    Add Your First Ground
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {myGrounds.map((g) => {
                    const imgSrc = g.image
                      ? g.image.startsWith("http")
                        ? g.image
                        : `${BASE_URL}${g.image}`
                      : null;
                    return (
                      <div
                        key={g.id}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-white/3 transition"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white/10">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={g.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {g.name}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {g.location}
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-emerald-400 font-bold text-sm">
                            Rs {g.price_per_hour}/hr
                          </p>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border mt-1 inline-block
                            ${
                              g.is_approved
                                ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/30"
                                : "text-amber-400 bg-amber-400/10 border-amber-400/30"
                            }`}
                          >
                            {g.is_approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-bold text-lg">
                  Recent Bookings
                </h2>
                <button
                  onClick={() => navigate("/owner-bookings")}
                  className="text-emerald-400 text-sm hover:text-emerald-300 transition font-semibold"
                >
                  View all →
                </button>
              </div>

              {recentBookings.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-2">
                    <div className="text-2xl font-bold text-white/20">·</div>
                  </div>
                  <p className="text-white/40 text-sm">
                    No bookings received yet
                  </p>
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
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {b.ground_name}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {b.user_email} • {b.date}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-emerald-400 font-bold text-sm">
                            Rs {b.total_price}
                          </p>
                          <span
                            className={`text-xs font-semibold border px-2 py-1 rounded-full ${s.badge} ${s.text} capitalize inline-block mt-1`}
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
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => navigate("/owner-notifications")}
                  className="text-emerald-400 text-sm hover:text-emerald-300 transition font-semibold"
                >
                  All →
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <div className="text-3xl font-bold text-white/20">·</div>
                  </div>
                  <p className="text-white/40 text-sm">No notifications yet</p>
                  <p className="text-white/20 text-xs mt-1">
                    You'll be notified when someone books
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-5 py-4 hover:bg-white/3 transition ${
                        !n.is_read ? "bg-white/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                            !n.is_read ? "bg-emerald-400" : "bg-white/20"
                          }`}
                        />
                        <div className="min-w-0">
                          <p
                            className={`text-xs leading-relaxed ${
                              n.is_read
                                ? "text-white/40"
                                : "text-white/80 font-medium"
                            }`}
                          >
                            {n.message.length > 90
                              ? n.message.slice(0, 90) + "…"
                              : n.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-lg font-black text-black">
                  {firstName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold text-sm capitalize">
                    {profile?.full_name || firstName}
                  </p>
                  <p className="text-white/40 text-xs">{profile?.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold rounded-full">
                      Owner
                    </span>
                    {profile?.is_verified ? (
                      <span className="px-2.5 py-1 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-bold rounded-full">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold rounded-full">
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/profile")}
                className="w-full py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition font-semibold"
              >
                Edit Profile →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
