import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("access");

  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Notifications
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
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Close menu
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  const linkCls = (path) =>
    `relative text-base font-semibold transition ${
      isActive(path)
        ? "text-white"
        : "text-gray-400 hover:text-white"
    }`;

  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-white/10">

      {/* FULL WIDTH (NO max-width) */}
      <div className="w-full px-6 h-16 flex items-center justify-between">

        {/* LEFT - LOGO (FULL LEFT) */}
        <Link to="/" className="text-xl font-bold text-white">
          Futsal<span className="text-amber-400">Hub</span>
        </Link>

        {/* RIGHT - MENU */}
        <div className="hidden md:flex items-center gap-8">

          {/* NAV LINKS */}
          {!role && (
            <>
              <NavItem to="/" label="Home" active={isActive("/")} />
              <NavItem to="/grounds" label="Grounds" active={isActive("/grounds")} />
              <NavItem to="/about" label="About" active={isActive("/about")} />
            </>
          )}

          {role === "player" && (
            <>
              <NavItem to="/" label="Home" active={isActive("/")} />
              <NavItem to="/grounds" label="Grounds" active={isActive("/grounds")} />
              <NavItem to="/player-dashboard" label="Dashboard" active={isActive("/player-dashboard")} />
              <NavItem to="/my-bookings" label="My Bookings" active={isActive("/my-bookings")} />
              <NavItem to="/my-payments" label="Payments" active={isActive("/my-payments")} />
            </>
          )}

          {role === "owner" && (
            <>
              <NavItem to="/owner-dashboard" label="Dashboard" active={isActive("/owner-dashboard")} />
              <NavItem to="/add-ground" label="My Ground" active={isActive("/add-ground")} />
              <NavItem to="/owner-bookings" label="Bookings" active={isActive("/owner-bookings")} />
            </>
          )}

          {role === "admin" && (
            <>
              <NavItem to="/admin-dashboard" label="Dashboard" active={isActive("/admin-dashboard")} />
              <NavItem to="/admin/users" label="Users" active={isActive("/admin/users")} />
              <NavItem to="/admin/bookings" label="Bookings" active={isActive("/admin/bookings")} />
            </>
          )}

          {/* AUTH */}
          {!role && (
            <>
              <Link to="/login" className="text-gray-400 hover:text-white">
                Login
              </Link>

              <Link
                to="/register"
                className="px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-300 transition"
              >
                Register
              </Link>
            </>
          )}

          {/* LOGGED IN */}
          {role && (
            <>
              <Link
                to={role === "owner" ? "/owner-notifications" : "/notifications"}
                className="relative text-gray-400 hover:text-white"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <span className="text-sm text-gray-400 capitalize">
                {role}
              </span>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500/20 border border-red-500/30 text-red-400 rounded-md hover:bg-red-500/30 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* MOBILE */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-xl"
        >
          ☰
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="md:hidden bg-black border-t border-white/10 px-6 py-4 flex flex-col gap-4"
        >
          <Link to="/">Home</Link>
          <Link to="/grounds">Grounds</Link>
          <Link to="/about">About</Link>

          {!role && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="bg-amber-400 text-black p-2 rounded text-center font-bold">
                Register
              </Link>
            </>
          )}

          {role && (
            <button onClick={handleLogout} className="text-left text-red-400">
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

// NavItem
function NavItem({ to, label, active }) {
  return (
    <Link
      to={to}
      className="relative group text-base font-semibold text-gray-400 hover:text-white transition"
    >
      {label}
      <span
        className={`absolute left-0 -bottom-1 h-[2px] bg-amber-400 transition-all duration-300 ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </Link>
  );
}