import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const role      = localStorage.getItem("role");
  const token     = localStorage.getItem("access");

  const [unreadCount, setUnreadCount]   = useState(0);
  const [menuOpen, setMenuOpen]         = useState(false);
  const menuRef = useRef(null);

  // ── fetch unread notification count ────────────────────────
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/notifications/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data.notifications || data.results || data || [];
        setUnreadCount(list.filter((n) => !n.is_read).length);
      } catch (_) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [token]);

  // ── close dropdown on outside click ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── close mobile menu on route change ──────────────────────
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const isActive = (path) => location.pathname === path;

  const linkCls = (path) =>
    `transition-colors duration-200 text-sm font-medium ${
      isActive(path) ? "text-amber-400" : "text-white/70 hover:text-white"
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-black text-white tracking-tight">
            Futsal<span className="text-amber-400">Hub</span>
          </span>
        </Link>

        {/* ── Desktop Nav ──────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-6">

          {/* ── PUBLIC ─────────────────────────────────────── */}
          {!role && (
            <>
              <Link to="/"        className={linkCls("/")}>Home</Link>
              <Link to="/grounds" className={linkCls("/grounds")}>Grounds</Link>
              <Link to="/about"   className={linkCls("/about")}>About</Link>
            </>
          )}

          {/* ── PLAYER ─────────────────────────────────────── */}
          {role === "player" && (
            <>
              <Link to="/"                 className={linkCls("/")}>Home</Link>
              <Link to="/grounds"          className={linkCls("/grounds")}>Grounds</Link>
              <Link to="/player-dashboard" className={linkCls("/player-dashboard")}>Dashboard</Link>
              <Link to="/my-bookings"      className={linkCls("/my-bookings")}>My Bookings</Link>
              <Link to="/my-payments"      className={linkCls("/my-payments")}>Payments</Link>
            </>
          )}

          {/* ── OWNER ──────────────────────────────────────── */}
          {role === "owner" && (
            <>
              <Link to="/owner-dashboard"     className={linkCls("/owner-dashboard")}>Dashboard</Link>
              <Link to="/add-ground"          className={linkCls("/add-ground")}>My Ground</Link>
              <Link to="/owner-bookings"      className={linkCls("/owner-bookings")}>Bookings</Link>
            </>
          )}

          {/* ── ADMIN ──────────────────────────────────────── */}
          {role === "admin" && (
            <>
              <Link to="/admin-dashboard" className={linkCls("/admin-dashboard")}>Dashboard</Link>
              <Link to="/admin/users"     className={linkCls("/admin/users")}>Users</Link>
              <Link to="/admin/bookings"  className={linkCls("/admin/bookings")}>Bookings</Link>
            </>
          )}
        </div>

        {/* ── Right Side ───────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">

          {/* Not logged in */}
          {!role && (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white/70 hover:text-white transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-amber-400 text-black text-sm font-bold rounded-lg hover:bg-amber-300 transition"
              >
                Register
              </Link>
            </>
          )}

          {/* Logged in — notification bell + logout */}
          {role && (
            <>
              {/* Notification Bell */}
              <Link
                to={role === "owner" ? "/owner-notifications" : "/notifications"}
                className="relative p-2 text-white/60 hover:text-white transition"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Role badge */}
              <span className="px-2 py-1 bg-white/5 border border-white/10 text-white/50 text-xs rounded-full capitalize">
                {role}
              </span>

              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/30 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* ── Mobile Hamburger ─────────────────────────────── */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden p-2 text-white/70 hover:text-white transition"
          aria-label="Toggle menu"
        >
          <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "rotate-45 translate-y-1.5" : ""}`} />
          <div className={`w-5 h-0.5 bg-current mb-1 transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <div className={`w-5 h-0.5 bg-current transition-all ${menuOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
        </button>

      </div>

      {/* ── Mobile Menu ──────────────────────────────────────── */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="md:hidden bg-black/95 border-t border-white/10 px-4 py-4 flex flex-col gap-3"
        >
          {/* PUBLIC */}
          {!role && (
            <>
              <Link to="/"         className={linkCls("/")}>Home</Link>
              <Link to="/grounds"  className={linkCls("/grounds")}>Grounds</Link>
              <Link to="/about"    className={linkCls("/about")}>About</Link>
              <Link to="/login"    className={linkCls("/login")}>Login</Link>
              <Link to="/register" className="px-4 py-2 bg-amber-400 text-black font-bold rounded-lg text-sm text-center">Register</Link>
            </>
          )}

          {/* PLAYER */}
          {role === "player" && (
            <>
              <Link to="/"                 className={linkCls("/")}>Home</Link>
              <Link to="/grounds"          className={linkCls("/grounds")}>Grounds</Link>
              <Link to="/player-dashboard" className={linkCls("/player-dashboard")}>Dashboard</Link>
              <Link to="/my-bookings"      className={linkCls("/my-bookings")}>My Bookings</Link>
              <Link to="/my-payments"      className={linkCls("/my-payments")}>Payments</Link>
              <Link to="/notifications"    className={linkCls("/notifications")}>
                Notifications {unreadCount > 0 && <span className="ml-1 bg-amber-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
              </Link>
            </>
          )}

          {/* OWNER */}
          {role === "owner" && (
            <>
              <Link to="/owner-dashboard"     className={linkCls("/owner-dashboard")}>Dashboard</Link>
              <Link to="/add-ground"          className={linkCls("/add-ground")}>My Ground</Link>
              <Link to="/owner-bookings"      className={linkCls("/owner-bookings")}>Bookings</Link>
              <Link to="/owner-notifications" className={linkCls("/owner-notifications")}>
                Notifications {unreadCount > 0 && <span className="ml-1 bg-amber-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
              </Link>
            </>
          )}

          {/* ADMIN */}
          {role === "admin" && (
            <>
              <Link to="/admin-dashboard" className={linkCls("/admin-dashboard")}>Dashboard</Link>
              <Link to="/admin/users"     className={linkCls("/admin/users")}>Users</Link>
              <Link to="/admin/bookings"  className={linkCls("/admin/bookings")}>Bookings</Link>
            </>
          )}

          {/* Logout */}
          {role && (
            <button
              onClick={handleLogout}
              className="mt-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/30 transition text-left"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
