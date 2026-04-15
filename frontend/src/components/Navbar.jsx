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
  const menuRef = useRef(null);
  const profileRef = useRef(null);

  // Fetch unread notifications
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

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
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

  const dashPath =
    role === "admin" ? "/admin-dashboard"
    : role === "owner" ? "/owner-dashboard"
    : "/player-dashboard";

  const playerLinks = [
    { to: "/", label: "Home" },
    { to: "/grounds", label: "Grounds" },
    { to: "/player-dashboard", label: "Dashboard" },
    { to: "/my-bookings", label: "Bookings" },
    { to: "/my-payments", label: "Payments" },
    { to: "/my-favorites", label: "Favorites" },
    { to: "/player-loyalty", label: "Loyalty" },
  ];

  const ownerLinks = [
    { to: "/owner-dashboard", label: "Dashboard" },
    { to: "/add-ground", label: "Add Ground" },
    { to: "/manage-grounds", label: "My Grounds" },
    { to: "/owner-bookings", label: "Bookings" },
    { to: "/owner-pricing", label: "Pricing & Availability" },
    { to: "/owner-analytics", label: "Analytics" },
  ];

  const adminLinks = [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/grounds", label: "Grounds" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/bookings", label: "Bookings" },
  ];

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/grounds", label: "Grounds" },
    { to: "/about", label: "About" },
  ];

  const links =
    role === "player" ? playerLinks
    : role === "owner" ? ownerLinks
    : role === "admin" ? adminLinks
    : publicLinks;

  const isActive = (to) => location.pathname === to;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="h-16 flex items-center justify-between px-8">

        {/* LEFT: Logo */}
        <Link to="/" className="text-2xl font-black tracking-tight text-gray-900">
          Futsal<span className="text-amber-500">Hub</span>
        </Link>

        {/* RIGHT: Links + Notification + Profile */}
        <div className="flex items-center gap-6">

          {/* Page Links */}
          <div className="hidden md:flex items-center gap-6 text-base font-semibold">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`transition-all duration-200 ${
                  isActive(l.to)
                    ? "text-amber-600 border-b-2 border-amber-600 pb-1"
                    : "text-gray-700 hover:text-amber-600"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {!role ? (
            <>
              <Link to="/login" className="text-gray-700 hover:text-gray-900 text-sm font-medium">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-3xl text-sm font-semibold"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              {/* Notifications */}
              <Link to={notifPath} className="relative text-gray-700 hover:text-amber-600">
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="text-gray-700 hover:text-amber-600"
                >
                  <User size={22} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-12 w-56 bg-white border rounded-2xl shadow-lg py-2">
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-50">
                      Profile
                    </Link>
                    <Link to={dashPath} className="block px-4 py-2 hover:bg-gray-50">
                      Dashboard
                    </Link>
                    <div className="border-t my-2" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile menu */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-xl">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </nav>
  );
}