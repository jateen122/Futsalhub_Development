import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, User } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("access");

  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef(null);

  // 🔔 Fetch notifications
  useEffect(() => {
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/notifications/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data.notifications || data.results || data || [];
        setUnreadCount(list.filter((n) => !n.is_read).length);
      } catch {}
    };

    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [token]);

  // ❌ Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 🔄 Close on route change
  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const notifPath =
    role === "owner" ? "/owner-notifications"
    : role === "admin" ? "/admin/notifications"
    : "/notifications";

  const links = [
    { to: "/", label: "Home" },
    { to: "/grounds", label: "Grounds" },
    { to: "/player-dashboard", label: "Dashboard" },
    { to: "/my-bookings", label: "Bookings" },
    { to: "/my-payments", label: "Payments" },
    { to: "/my-favorites", label: "Favorites" },
    { to: "/player-loyalty", label: "Loyalty" },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] bg-white border-b border-gray-100 shadow-sm">
      <div className="h-16 flex items-center justify-between px-8">

        {/* LOGO */}
        <Link to="/" className="text-2xl font-black text-gray-900">
          Futsal<span className="text-amber-500">Hub</span>
        </Link>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-6">

          {/* LINKS */}
          <div className="hidden md:flex items-center gap-6 font-semibold">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`${
                  isActive(l.to)
                    ? "text-amber-600 border-b-2 border-amber-600 pb-1"
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* 🔔 NOTIFICATION */}
          <Link to={notifPath} className="relative text-gray-700 hover:text-amber-600">
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* 👤 PROFILE */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="text-gray-700 hover:text-amber-600"
            >
              <User size={22} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl shadow-2xl border z-[9999]">
                
                {/* Profile */}
                <Link
                  to="/profile"
                  className="block px-5 py-3 text-gray-700 hover:bg-gray-50"
                >
                  Profile
                </Link>

                <div className="border-t" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-5 py-3 text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}