import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell, User, Trophy, Heart, CreditCard,
  LayoutDashboard, Home, MapPin, Settings,
} from "lucide-react";

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

  /* ── notifications ───────────────────────── */
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
      } catch {}
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [token]);

  /* ── close menus on outside click ─────────── */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current    && !menuRef.current.contains(e.target))    setMenuOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  /* ── Nav links per role ──────────────────── */

  const playerLinks = [
    { to: "/",               icon: <Home size={16} />,          label: "Home"      },
    { to: "/grounds",        icon: <MapPin size={16} />,         label: "Grounds"   },
    { to: "/player-dashboard", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
    { to: "/my-bookings",    icon: <LayoutDashboard size={16} />, label: "Bookings"  },
    { to: "/my-payments",    icon: <CreditCard size={16} />,     label: "Payments"  },
    { to: "/my-favorites",   icon: <Heart size={16} />,          label: "Favorites" },
    { to: "/player-loyalty", icon: <Trophy size={16} />,         label: "Loyalty"   },
  ];

  const ownerLinks = [
    { to: "/owner-dashboard",   label: "Dashboard"          },
    { to: "/add-ground",        label: "Add Ground"         },
    { to: "/manage-grounds",    label: "My Grounds"         },
    { to: "/owner-bookings",    label: "Bookings"           },
    { to: "/owner-pricing",     icon: <Settings size={16} />, label: "Pricing & Availability" }, // ← updated
  ];

  const adminLinks = [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/grounds",   label: "Grounds"   },
    { to: "/admin/users",     label: "Users"     },
    { to: "/admin/bookings",  label: "Bookings"  },
  ];

  const publicLinks = [
    { to: "/",       label: "Home"    },
    { to: "/grounds", label: "Grounds" },
    { to: "/about",   label: "About"   },
  ];

  const links =
    role === "player" ? playerLinks
    : role === "owner"  ? ownerLinks
    : role === "admin"  ? adminLinks
    : publicLinks;

  return (
    <nav className="fixed top-0 w-full z-50 bg-black border-b border-white/10">
      <div className="px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="text-xl font-bold text-white">
          Futsal<span className="text-amber-400">Hub</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-1 text-sm font-semibold transition
                ${location.pathname === l.to ? "text-white" : "text-gray-400 hover:text-white"}`}>
              {l.icon}
              {l.label}
            </Link>
          ))}

          {/* Auth area */}
          {!role ? (
            <>
              <Link to="/login"    className="text-gray-400 hover:text-white text-sm">Login</Link>
              <Link to="/register" className="bg-amber-400 text-black px-4 py-2 rounded-lg text-sm font-bold">Register</Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* Notification bell */}
              <Link to={notifPath} className="relative text-gray-400 hover:text-white">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[9px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(!profileOpen)}>
                  <User size={18} className="text-white" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-10 w-48 bg-[#0f1825] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    <Link to="/profile"
                      className="block px-4 py-3 text-sm text-white/70 hover:bg-white/10 transition">
                      👤 Profile
                    </Link>
                    <Link to={dashPath}
                      className="block px-4 py-3 text-sm text-white/70 hover:bg-white/10 transition">
                      📊 Dashboard
                    </Link>
                    {role === "player" && (
                      <Link to="/player-loyalty"
                        className="block px-4 py-3 text-sm text-white/70 hover:bg-white/10 transition">
                        🏆 Loyalty
                      </Link>
                    )}
                    {role === "owner" && (
                      <Link to="/owner-pricing"
                        className="block px-4 py-3 text-sm text-white/70 hover:bg-white/10 transition">
                        ⚙️ Pricing & Availability
                      </Link>
                    )}
                    <div className="border-t border-white/10" />
                    <button onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 text-sm transition">
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white text-xl">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div ref={menuRef} className="md:hidden bg-[#0a0f1e] px-6 py-4 flex flex-col gap-3 border-t border-white/10">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`text-sm font-medium transition flex items-center gap-2
                ${location.pathname === l.to ? "text-white" : "text-gray-400 hover:text-white"}`}>
              {l.icon}{l.label}
            </Link>
          ))}
          {role && (
            <>
              <div className="border-t border-white/10 pt-3 mt-1 space-y-3">
                <Link to="/profile" className="text-gray-400 hover:text-white text-sm block">👤 Profile</Link>
                <Link to={notifPath} className="text-gray-400 hover:text-white text-sm flex items-center gap-2">
                  <Bell size={14} /> Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <button onClick={handleLogout} className="text-red-400 text-sm text-left">🚪 Logout</button>
              </div>
            </>
          )}
          {!role && (
            <div className="border-t border-white/10 pt-3 mt-1 flex gap-3">
              <Link to="/login"    className="text-gray-400 hover:text-white text-sm">Login</Link>
              <Link to="/register" className="bg-amber-400 text-black px-3 py-1.5 rounded-lg text-sm font-bold">Register</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
