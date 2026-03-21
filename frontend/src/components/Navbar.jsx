import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, User } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const role     = localStorage.getItem("role");
  const token    = localStorage.getItem("access");

  const [unreadCount,  setUnreadCount]  = useState(0);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [profileOpen,  setProfileOpen]  = useState(false);
  const menuRef    = useRef(null);
  const profileRef = useRef(null);

  /* ── poll unread notifications ─────────────────────────────── */
  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/notifications/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const list = data.notifications || data.results || data || [];
        setUnreadCount(list.filter(n => !n.is_read).length);
      } catch {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [token]);

  /* ── close menus on outside click ──────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current    && !menuRef.current.contains(e.target))    setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── close on route change ──────────────────────────────────── */
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  /* ── notification path per role ─────────────────────────────── */
  const notifPath =
    role === "owner" ? "/owner-notifications" :
    role === "admin" ? "/admin/notifications" :
                       "/notifications";

  /* ── dashboard path per role ────────────────────────────────── */
  const dashPath =
    role === "admin" ? "/admin-dashboard" :
    role === "owner" ? "/owner-dashboard" :
                       "/player-dashboard";

  /* ── nav links per role ──────────────────────────────────────── */
  const publicLinks = [
    { to: "/",        label: "Home"    },
    { to: "/grounds", label: "Grounds" },
    { to: "/about",   label: "About"   },
  ];

  const playerLinks = [
    { to: "/",                 label: "Home"        },
    { to: "/grounds",          label: "Grounds"     },
    { to: "/player-dashboard", label: "Dashboard"   },
    { to: "/my-bookings",      label: "My Bookings" },
    { to: "/my-payments",      label: "Payments"    },
    { to: "/my-favorites",     label: "♥ Favorites" },
  ];

  const ownerLinks = [
    { to: "/owner-dashboard", label: "Dashboard"  },
    { to: "/add-ground",      label: "Add Ground" },
    { to: "/manage-grounds",  label: "My Grounds" },
    { to: "/owner-bookings",  label: "Bookings"   },
  ];

  const adminLinks = [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/grounds",   label: "Grounds"   },
    { to: "/admin/users",     label: "Users"     },
    { to: "/admin/bookings",  label: "Bookings"  },
  ];

  const links =
    role === "player" ? playerLinks :
    role === "owner"  ? ownerLinks  :
    role === "admin"  ? adminLinks  :
    publicLinks;

  const ROLE_BADGE = {
    player: "bg-sky-50 border-sky-200 text-sky-700",
    owner:  "bg-amber-50 border-amber-200 text-amber-700",
    admin:  "bg-purple-50 border-purple-200 text-purple-700",
  };

  const ROLE_ICON = { player: "🎮", owner: "🏟️", admin: "⚙️" };

  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-white/10">
      <div className="w-full px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-white flex-shrink-0">
          Futsal<span className="text-amber-400">Hub</span>
        </Link>

        {/* ── Desktop nav ────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-7">

          {links.map(l => (
            <NavItem key={l.to} to={l.to} label={l.label}
              active={location.pathname === l.to} />
          ))}

          {/* Not logged in */}
          {!role && (
            <div className="flex items-center gap-3 ml-2">
              <Link to="/login"
                className="text-gray-400 hover:text-white text-sm font-semibold transition">
                Login
              </Link>
              <Link to="/register"
                className="px-4 py-2 bg-amber-400 text-black text-sm font-black rounded-lg hover:bg-amber-300 transition">
                Register
              </Link>
            </div>
          )}

          {/* Logged in */}
          {role && (
            <div className="flex items-center gap-4 ml-2">

              {/* Role badge */}
              <span className={`px-2.5 py-1 rounded text-xs font-black border capitalize ${ROLE_BADGE[role] || ""}`}>
                {ROLE_ICON[role]} {role}
              </span>

              {/* Bell */}
              <Link to={notifPath} className="relative text-gray-400 hover:text-white transition">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(p => !p)}
                  className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition"
                >
                  <User size={16} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-10 w-44 bg-[#0f1825] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <Link to="/profile"
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:bg-white/8 hover:text-white transition">
                      <User size={14} />
                      My Profile
                    </Link>
                    <Link to={dashPath}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:bg-white/8 hover:text-white transition border-t border-white/5">
                      <span className="text-xs">⊞</span>
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition border-t border-white/5">
                      <span className="text-xs">→</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── Mobile hamburger ────────────────────────────────── */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-xl w-9 h-9 flex items-center justify-center">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── Mobile menu ─────────────────────────────────────────── */}
      {menuOpen && (
        <div ref={menuRef}
          className="md:hidden bg-[#0a0f1e] border-t border-white/10 px-6 py-5 flex flex-col gap-4">

          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`text-sm font-semibold transition
                ${location.pathname === l.to ? "text-white" : "text-gray-400 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}

          <div className="border-t border-white/10 pt-3 flex flex-col gap-3">
            {!role ? (
              <>
                <Link to="/login" className="text-gray-400 text-sm font-semibold hover:text-white">Login</Link>
                <Link to="/register"
                  className="bg-amber-400 text-black text-sm font-black p-2.5 rounded-xl text-center">
                  Register
                </Link>
              </>
            ) : (
              <>
                {/* Profile link in mobile */}
                <Link to="/profile"
                  className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-semibold transition">
                  <User size={15} />
                  My Profile
                </Link>

                <div className="flex items-center justify-between">
                  <Link to={notifPath} className="relative text-gray-400 hover:text-white">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <button onClick={handleLogout}
                    className="text-red-400 text-sm font-semibold hover:text-red-300 transition">
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavItem({ to, label, active }) {
  return (
    <Link to={to}
      className="relative group text-sm font-semibold text-gray-400 hover:text-white transition">
      {label}
      <span className={`absolute left-0 -bottom-1 h-[2px] bg-amber-400 transition-all duration-300
        ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
    </Link>
  );
}
