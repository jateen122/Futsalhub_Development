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

  /* ── poll notifications every 30s ──────────────────────────── */
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

  /* ── close mobile menu on outside click ─────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── close mobile menu on route change ──────────────────────── */
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  const notifPath =
    role === "owner"
      ? "/owner-notifications"
      : role === "admin"
        ? "/admin/notifications"
        : "/notifications";

  /* ════════════════════════════════════════════════════════════
     NAV LINKS PER ROLE
  ════════════════════════════════════════════════════════════ */
  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/grounds", label: "Grounds" },
    { to: "/about", label: "About" },
  ];

  const playerLinks = [
    { to: "/", label: "Home" },
    { to: "/grounds", label: "Grounds" },
    { to: "/player-dashboard", label: "Dashboard" },
    { to: "/my-bookings", label: "My Bookings" },
    { to: "/my-payments", label: "Payments" },
  ];

  const ownerLinks = [
    { to: "/owner-dashboard", label: "Dashboard" },
    { to: "/add-ground", label: "Add Ground" },
    { to: "/manage-grounds", label: "My Grounds" },
    { to: "/owner-bookings", label: "Bookings" },
  ];

  const adminLinks = [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/grounds", label: "Grounds" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/bookings", label: "Bookings" },
  ];

  const links =
    role === "player"
      ? playerLinks
      : role === "owner"
        ? ownerLinks
        : role === "admin"
          ? adminLinks
          : publicLinks;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-white/10">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* ── LOGO ────────────────────────────────────────────── */}
        <Link to="/" className="text-xl font-bold text-white flex-shrink-0">
          Futsal<span className="text-amber-400">Hub</span>
        </Link>

        {/* ── DESKTOP MENU ────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-7">
          {/* nav links */}
          {links.map((l) => (
            <NavItem
              key={l.to}
              to={l.to}
              label={l.label}
              active={location.pathname === l.to}
            />
          ))}

          {/* ── NOT LOGGED IN ──────────────────────────────────── */}
          {!role && (
            <div className="flex items-center gap-3 ml-2">
              <Link
                to="/login"
                className="text-gray-400 hover:text-white text-sm font-semibold transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-amber-400 text-black text-sm font-black rounded-lg hover:bg-amber-300 transition"
              >
                Register
              </Link>
            </div>
          )}

          {/* ── LOGGED IN ──────────────────────────────────────── */}
          {role && (
            <div className="flex items-center gap-4 ml-2">
              {/* role badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-black border capitalize
                ${
                  role === "admin"
                    ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                    : role === "owner"
                      ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
                      : "bg-sky-400/10 border-sky-400/20 text-sky-400"
                }`}
              >
                {role}
              </span>

              {/* bell */}
              <Link
                to={notifPath}
                className="relative text-gray-400 hover:text-white transition"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500/15 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500/25 transition font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* ── MOBILE HAMBURGER ────────────────────────────────── */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-2xl w-9 h-9 flex items-center justify-center"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── MOBILE MENU ─────────────────────────────────────────── */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="md:hidden bg-[#0a0f1e] border-t border-white/10 px-6 py-5 flex flex-col gap-4"
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-semibold transition
                ${location.pathname === l.to ? "text-white" : "text-gray-400 hover:text-white"}`}
            >
              {l.label}
            </Link>
          ))}

          {/* divider */}
          <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
            {!role && (
              <>
                <Link
                  to="/login"
                  className="text-gray-400 text-sm font-semibold hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-amber-400 text-black text-sm font-black p-2.5 rounded-xl text-center"
                >
                  Register
                </Link>
              </>
            )}

            {role && (
              <div className="flex items-center justify-between">
                <Link
                  to={notifPath}
                  className="relative text-gray-400 hover:text-white"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-400 text-sm font-semibold hover:text-red-300 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── NavItem ────────────────────────────────────────────────── */
function NavItem({ to, label, active }) {
  return (
    <Link
      to={to}
      className="relative group text-sm font-semibold text-gray-400 hover:text-white transition"
    >
      {label}
      <span
        className={`absolute left-0 -bottom-1 h-[2px] bg-amber-400 transition-all duration-300
        ${active ? "w-full" : "w-0 group-hover:w-full"}`}
      />
    </Link>
  );
}
