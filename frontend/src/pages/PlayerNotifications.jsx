import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle, Clock } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const TYPE_CONFIG = {
  booking_received: {
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  booking_confirmed: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    border: "border-emerald-200",
  },
  booking_cancelled: {
    icon: Clock,
    color: "text-red-600",
    bg: "bg-red-100",
    border: "border-red-200",
  },
  general: {
    icon: Bell,
    color: "text-amber-600",
    bg: "bg-amber-100",
    border: "border-amber-200",
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
  }, [token]);

  const markRead = async (id) => {
    await fetch(`${BASE_URL}/api/notifications/${id}/read/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-24">

      {/* HEADER */}
      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/player-dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>

          <span className="text-gray-300">/</span>

          <h1 className="text-3xl font-black text-gray-900">
            Notifications
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-sm transition"
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 space-y-8">

        {/* SUMMARY */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
            <Bell size={32} className="text-amber-600" />
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900">{unreadCount}</p>
            <p className="text-gray-500">Unread Notifications</p>
          </div>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl border border-gray-100 w-fit">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl font-medium transition ${
                filter === f
                  ? "bg-amber-500 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* LIST */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-16 text-center border">
            <Bell size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notifications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((n) => {
              const cfg = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.general;
              const Icon = cfg.icon;

              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`bg-white rounded-2xl p-6 border cursor-pointer transition hover:shadow ${
                    n.is_read ? "opacity-70" : "border-amber-200"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 ${cfg.bg} rounded-xl flex items-center justify-center`}>
                      <Icon size={22} className={cfg.color} />
                    </div>

                    <div className="flex-1">
                      <p className={`${n.is_read ? "text-gray-600" : "font-semibold text-gray-900"}`}>
                        {n.message}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {!n.is_read && (
                      <div className="w-3 h-3 bg-amber-500 rounded-full mt-2" />
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