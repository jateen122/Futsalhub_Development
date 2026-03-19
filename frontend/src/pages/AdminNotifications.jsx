import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const TYPE_CONFIG = {
  booking_received: {
    icon: "📮",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "New Booking",
  },
  booking_confirmed: {
    icon: "✓",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Confirmed",
  },
  booking_cancelled: {
    icon: "✕",
    color: "text-red-400",
    bg: "bg-red-400/10",
    label: "Cancelled",
  },
  general: {
    icon: "•",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    label: "General",
  },
};

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function AdminNotifications() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(data.notifications || data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    await fetch(`${BASE_URL}/api/notifications/${id}/read/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    await fetch(`${BASE_URL}/api/notifications/read-all/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : filter === "read"
        ? notifications.filter((n) => n.is_read)
        : notifications;

  return (
    <div className="min-h-screen bg-[#060a12] pt-24 px-4 pb-16">
      {/* bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-violet-600/4 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="text-white/30 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition"
          >
            ← Admin Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                  Admin
                </span>
              </div>
              <h1 className="text-4xl font-black text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-violet-400 text-sm mt-1">
                  {unreadCount} unread
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/55 rounded-xl text-sm hover:bg-white/10 transition disabled:opacity-50"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
        </div>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: "Total",
              value: notifications.length,
              color: "text-white",
            },
            { label: "Unread", value: unreadCount, color: "text-violet-400" },
            {
              label: "Read",
              value: notifications.length - unreadCount,
              color: "text-white/40",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center"
            >
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-xs mt-1 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* filter tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-bold capitalize transition
                ${
                  filter === f
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                    : "bg-white/5 border border-white/8 text-white/40 hover:bg-white/10 hover:text-white"
                }`}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 bg-white/20 text-white text-xs font-black w-4 h-4 rounded-full inline-flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">No notifications</p>
            <p className="text-white/40 text-lg">You're all caught up</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const cfg =
                TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.general;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition cursor-pointer
                    ${
                      n.is_read
                        ? "bg-white/2 border-white/5 opacity-50"
                        : "bg-white/5 border-white/12 hover:border-violet-500/25"
                    }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center text-xl flex-shrink-0`}
                  >
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${n.is_read ? "text-white/40" : "text-white/85"}`}
                    >
                      {n.message}
                    </p>
                    <p className="text-white/20 text-xs mt-1.5">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
