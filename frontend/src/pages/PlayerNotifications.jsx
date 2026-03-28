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
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={18} />
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2.5 rounded-2xl font-semibold text-sm transition disabled:opacity-50"
            >
              <CheckCircle size={18} />
              {markingAll ? "Marking..." : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Stats / Unread Count */}
        <div className="bg-white rounded-3xl p-8 shadow border border-gray-100 mb-10 flex items-center gap-6">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
            <Bell size={32} className="text-amber-600" />
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900">{unreadCount}</p>
            <p className="text-gray-500">Unread notifications</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-3xl shadow-sm w-fit">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-3 rounded-2xl font-semibold capitalize transition-all text-sm
                ${filter === f
                  ? "bg-yellow-500 text-white shadow"
                  : "bg-transparent hover:bg-gray-100 text-gray-600"}`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-24 text-center shadow">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
              <Bell size={42} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800">No notifications yet</h3>
            <p className="text-gray-500 mt-2">You’ll see updates here</p>
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
                  className={`bg-white rounded-3xl p-6 border transition-all cursor-pointer hover:shadow-xl
                    ${n.is_read 
                      ? "border-gray-100 opacity-75" 
                      : `${cfg.border} shadow-sm hover:border-yellow-300`}`}
                >
                  <div className="flex gap-5">
                    <div className={`w-12 h-12 ${cfg.bg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <Icon size={26} className={cfg.color} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-base leading-relaxed font-medium ${n.is_read ? "text-gray-600" : "text-gray-900"}`}>
                        {n.message}
                      </p>
                      <p className="text-gray-400 text-xs mt-3 flex items-center gap-1.5">
                        <Clock size={14} />
                        {timeAgo(n.created_at)}
                      </p>
                    </div>

                    {!n.is_read && (
                      <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0 mt-2" />
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