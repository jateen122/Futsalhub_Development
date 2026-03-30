import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Bell, 
  Clock, 
  CheckCircle 
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const TYPE_CONFIG = {
  booking_received: {
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "New Booking",
  },
  booking_confirmed: {
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    label: "Confirmed",
  },
  booking_cancelled: {
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Cancelled",
  },
  general: { 
    color: "text-amber-600", 
    bg: "bg-amber-100", 
    label: "General" 
  },
};

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function OwnerNotifications() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

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
  const newBookings = notifications.filter(
    (n) => n.notification_type === "booking_received" && !n.is_read,
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/owner-dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-6 font-medium"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Bell size={28} className="text-gray-700" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-amber-600 font-medium mt-1">
                    {unreadCount} unread messages
                  </p>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-2xl transition disabled:opacity-70 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                {markingAll ? "Marking all..." : "Mark all as read"}
              </button>
            )}
          </div>
        </div>

        {/* New Bookings Alert */}
        {newBookings > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 mb-8 flex items-center justify-between">
            <div>
              <p className="text-blue-700 font-semibold text-lg">
                {newBookings} new booking{newBookings > 1 ? "s" : ""} received
              </p>
              <p className="text-blue-600/80 text-sm mt-1">
                Please check your bookings page to review them.
              </p>
            </div>
            <button
              onClick={() => navigate("/owner-bookings")}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition"
            >
              View Bookings
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-200 rounded-3xl">
            <Bell size={64} className="mx-auto text-gray-300 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-3">No notifications yet</h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              You'll receive notifications here when players book your ground or when important updates occur.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.general;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`p-7 rounded-3xl border transition-all cursor-pointer
                    ${n.is_read 
                      ? "bg-white border-gray-200 opacity-75" 
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className={`inline-block px-4 py-1.5 rounded-2xl text-xs font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <p className={`text-[15px] leading-relaxed ${n.is_read ? "text-gray-600" : "text-gray-800"}`}>
                        {n.message}
                      </p>

                      <div className="flex items-center gap-2 mt-5 text-xs text-gray-500">
                        <Clock size={15} />
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>

                    {!n.is_read && (
                      <div className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}