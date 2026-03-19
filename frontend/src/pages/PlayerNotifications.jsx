import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const TYPE_CONFIG = {
  booking_received: {
    color: "text-blue-400",
    bg: "bg-blue-500/20",
    border: "border-blue-500/30",
  },
  booking_confirmed: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
  },
  booking_cancelled: {
    color: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
  },
  general: {
    color: "text-amber-400",
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
  },
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function PlayerNotifications() {
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
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/player-dashboard")}
            className="text-white/40 hover:text-white text-sm mb-6 flex items-center gap-2 transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-black text-white tracking-tight">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-amber-400 text-sm mt-2 font-medium">
                  {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-3 mb-8">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold capitalize transition
                ${
                  filter === f
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-white/10 text-white/70 hover:bg-white/15 border border-white/10"
                }`}
            >
              {f}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-white/50 text-lg">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const cfg =
                TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.general;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-4 p-5 rounded-xl border-2 transition cursor-pointer
                    ${
                      n.is_read
                        ? `${cfg.bg} ${cfg.border} opacity-60`
                        : `${cfg.bg} ${cfg.border} hover:border-white/30 shadow-md`
                    }`}
                >
                  <div
                    className={`w-1 h-full rounded-full ${cfg.color.replace("text-", "bg-")} flex-shrink-0 mt-0.5`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-base leading-relaxed font-medium ${n.is_read ? "text-white/60" : `${cfg.color} text-white`}`}
                    >
                      {n.message}
                    </p>
                    <p className="text-white/40 text-xs mt-2">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div
                      className={`w-3 h-3 rounded-full ${cfg.color.replace("text-", "bg-")} flex-shrink-0`}
                    />
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
