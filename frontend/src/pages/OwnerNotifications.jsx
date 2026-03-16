import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const TYPE_CONFIG = {
  booking_received:  { icon: "📥", color: "text-blue-400",    bg: "bg-blue-400/10",    label: "New Booking"  },
  booking_confirmed: { icon: "✅", color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Confirmed"    },
  booking_cancelled: { icon: "❌", color: "text-red-400",     bg: "bg-red-400/10",     label: "Cancelled"    },
  general:           { icon: "🔔", color: "text-amber-400",   bg: "bg-amber-400/10",   label: "General"      },
};

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function OwnerNotifications() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const fetchNotifications = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/notifications/`, {
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
    if (!token) { navigate("/login"); return; }
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    await fetch(`${BASE_URL}/api/notifications/${id}/read/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
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
  const newBookings = notifications.filter((n) => n.notification_type === "booking_received" && !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate("/owner-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-amber-400 text-sm mt-1">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm hover:bg-white/10 transition disabled:opacity-50"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
        </div>

        {/* New booking alert */}
        {newBookings > 0 && (
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <div>
              <p className="text-blue-300 font-bold">{newBookings} new booking{newBookings > 1 ? "s" : ""} received!</p>
              <p className="text-blue-400/60 text-sm">Check your bookings page for details.</p>
            </div>
            <button
              onClick={() => navigate("/owner-bookings")}
              className="ml-auto px-4 py-1.5 bg-blue-400 text-black text-sm font-bold rounded-lg"
            >
              View
            </button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🔔</p>
            <p className="text-white/40 text-lg">No notifications yet</p>
            <p className="text-white/20 text-sm mt-1">You'll be notified when someone books your ground</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.general;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition cursor-pointer
                    ${n.is_read
                      ? "bg-white/3 border-white/5 opacity-55"
                      : "bg-white/7 border-white/15 hover:border-white/25"}`}
                >
                  <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${n.is_read ? "text-white/50" : "text-white/85"}`}>
                      {n.message}
                    </p>
                    <p className="text-white/25 text-xs mt-1.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
