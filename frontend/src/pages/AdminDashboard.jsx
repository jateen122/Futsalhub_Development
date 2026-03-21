import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const STATUS_STYLE = {
  pending:   { dot: "bg-amber-400",   text: "text-amber-400",   badge: "bg-amber-400/10 border-amber-400/30"    },
  confirmed: { dot: "bg-emerald-400", text: "text-emerald-400", badge: "bg-emerald-400/10 border-emerald-400/30" },
  cancelled: { dot: "bg-red-400",     text: "text-red-400",     badge: "bg-red-400/10 border-red-400/30"        },
};

const ROLE_STYLE = {
  player: "bg-sky-400/10 border-sky-400/30 text-sky-400",
  owner:  "bg-amber-400/10 border-amber-400/30 text-amber-400",
  admin:  "bg-violet-400/10 border-violet-400/30 text-violet-400",
};

function Counter({ value, prefix = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    if (target === 0) { setN(0); return; }
    const step = target / 28;
    let cur = 0;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setN(target); clearInterval(t); }
      else setN(Math.floor(cur));
    }, 22);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{n.toLocaleString()}</>;
}

function Empty({ icon, msg }) {
  return (
    <div className="py-14 text-center">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-white/30">{msg}</p>
    </div>
  );
}

function Spin() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

function Row({ k, v, vc = "text-white/60" }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-white/30">{k}</span>
      <span className={`font-semibold ${vc}`}>{v}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem("access");
  const userEmail = localStorage.getItem("email") || "admin@futsalhub.com";

  const [grounds,   setGrounds]   = useState([]);
  const [users,     setUsers]     = useState([]);
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("grounds");
  const [approving, setApproving] = useState(null);
  const [toast,     setToast]     = useState("");

  const fetchAll = () => {
    if (!token) { navigate("/login"); return; }
    setLoading(true);

    Promise.all([
      fetch(`${BASE_URL}/api/grounds/admin/all/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),

      fetch(`${BASE_URL}/api/accounts/users/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),

      fetch(`${BASE_URL}/api/bookings/owner/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([g, u, b]) => {
        setGrounds(Array.isArray(g)  ? g  : (g.results  || []));
        setUsers(  Array.isArray(u)  ? u  : (u.results  || []));
        setBookings(Array.isArray(b) ? b  : (b.results  || []));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const handleApproval = async (id, approve) => {
    setApproving(id);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${id}/approve/`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ is_approved: approve }),
      });
      if (res.ok) {
        setGrounds(prev => prev.map(g => g.id === id ? { ...g, is_approved: approve } : g));
        showToast(approve ? "Ground approved!" : "Ground approval revoked.");
      } else {
        showToast("Action failed. Check your permissions.");
      }
    } catch {
      showToast("Network error.");
    } finally {
      setApproving(null);
    }
  };

  /* ── safe arrays (always arrays even if API returns unexpected shape) ── */
  const safeGrounds  = Array.isArray(grounds)  ? grounds  : [];
  const safeUsers    = Array.isArray(users)    ? users    : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];

  const s = {
    users:     safeUsers.length,
    players:   safeUsers.filter(u => u.role === "player").length,
    owners:    safeUsers.filter(u => u.role === "owner").length,
    grounds:   safeGrounds.length,
    approved:  safeGrounds.filter(g => g.is_approved).length,
    pending:   safeGrounds.filter(g => !g.is_approved).length,
    bookings:  safeBookings.length,
    confirmed: safeBookings.filter(b => b.status === "confirmed").length,
    revenue:   safeBookings
      .filter(b => b.status === "confirmed")
      .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
          </div>
          <p className="text-white/25 text-xs tracking-[0.3em] uppercase font-mono">Loading Admin Panel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] pt-20 pb-20">

      {/* bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-violet-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-indigo-600/3 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.012]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
          backgroundSize:  "56px 56px",
        }} />
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0f1825] border border-violet-500/30 text-violet-300 px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-400 text-xs font-bold uppercase tracking-[0.2em]">Admin Control Panel</span>
            </div>
            <h1 className="text-5xl font-black text-white leading-none">
              Futsal<span className="text-violet-400">Hub</span>
            </h1>
            <p className="text-white/25 text-sm mt-2 font-mono">{userEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin/notifications")}
              className="px-4 py-2.5 bg-white/5 border border-white/8 text-white/50 rounded-xl text-sm hover:bg-white/10 hover:text-white transition">
              Alerts
            </button>
            <button onClick={handleLogout}
              className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm hover:bg-red-500/20 transition font-semibold">
              Sign out
            </button>
          </div>
        </div>

        {/* ── KPI CARDS ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 md:grid-cols-9 gap-3 mb-8">
          {[
            { label: "Users",     value: s.users,                color: "text-white",       border: "border-white/10"       },
            { label: "Players",   value: s.players,              color: "text-sky-400",     border: "border-sky-500/15"     },
            { label: "Owners",    value: s.owners,               color: "text-amber-400",   border: "border-amber-500/15"   },
            { label: "Grounds",   value: s.grounds,              color: "text-white",       border: "border-white/10"       },
            { label: "Approved",  value: s.approved,             color: "text-emerald-400", border: "border-emerald-500/15" },
            { label: "Pending",   value: s.pending,              color: "text-amber-400",   border: "border-amber-500/15"   },
            { label: "Bookings",  value: s.bookings,             color: "text-white",       border: "border-white/10"       },
            { label: "Confirmed", value: s.confirmed,            color: "text-emerald-400", border: "border-emerald-500/15" },
            { label: "Revenue",   value: Math.floor(s.revenue),  color: "text-amber-400",   border: "border-amber-500/15", prefix: "Rs " },
          ].map((k) => (
            <div key={k.label} className={`col-span-1 bg-white/3 border ${k.border} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${k.color}`}>
                <Counter value={k.value} prefix={k.prefix || ""} />
              </p>
              <p className="text-white/30 text-xs mt-1 uppercase tracking-widest leading-tight">{k.label}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK NAV ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: "Ground Approvals", path: "/admin/grounds",       desc: `${s.pending} pending`,   color: "amber", urgent: s.pending > 0 },
            { label: "All Users",        path: "/admin/users",         desc: `${s.users} registered`,  color: "sky"   },
            { label: "All Bookings",     path: "/admin/bookings",      desc: `${s.bookings} total`,    color: "blue"  },
            { label: "Notifications",    path: "/admin/notifications", desc: "View alerts",             color: "violet"},
            { label: "Sign Out",         action: handleLogout,         desc: "End session",             color: "red"   },
          ].map((a) => (
            <button key={a.label}
              onClick={() => a.path ? navigate(a.path) : a.action?.()}
              className="relative p-4 rounded-2xl border text-left transition-all duration-200 bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15">
              {a.urgent && (
                <span className="absolute top-2.5 right-2.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 relative" />
                </span>
              )}
              <p className="text-white font-bold text-sm">{a.label}</p>
              <p className="text-white/30 text-xs mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>

        {/* ── PENDING ALERT ──────────────────────────────────── */}
        {s.pending > 0 && (
          <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-amber-300 font-bold">
                {s.pending} ground{s.pending > 1 ? "s" : ""} awaiting your approval
              </p>
              <p className="text-amber-400/45 text-sm">Review and approve or reject from the table below.</p>
            </div>
            <button onClick={() => navigate("/admin/grounds")}
              className="px-4 py-2 bg-amber-400 text-black font-black rounded-xl text-sm hover:bg-amber-300 transition flex-shrink-0">
              Review All
            </button>
          </div>
        )}

        {/* ── TAB PANEL ──────────────────────────────────────── */}
        <div className="bg-white/3 border border-white/8 rounded-3xl overflow-hidden mb-6">

          {/* tab bar */}
          <div className="flex border-b border-white/8">
            {[
              { id: "grounds",  label: "Grounds",  count: s.grounds  },
              { id: "bookings", label: "Bookings", count: s.bookings },
              { id: "users",    label: "Users",    count: s.users    },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all
                  ${tab === t.id
                    ? "text-white border-b-2 border-violet-400 bg-violet-400/5"
                    : "text-white/30 hover:text-white/60 border-b-2 border-transparent"}`}>
                {t.label}
                <span className={`px-2 py-0.5 rounded-full text-xs font-black
                  ${tab === t.id ? "bg-violet-400 text-black" : "bg-white/8 text-white/35"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── GROUNDS TAB ─────────────────────────────────── */}
          {tab === "grounds" && (
            <div>
              {safeGrounds.length === 0 ? (
                <Empty icon="🏟️" msg="No grounds found." />
              ) : (
                <div className="divide-y divide-white/5">
                  {safeGrounds.map((g) => {
                    const imgSrc = g.image
                      ? g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`
                      : null;
                    const busy = approving === g.id;
                    return (
                      <div key={g.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/8 flex-shrink-0 border border-white/8">
                          {imgSrc
                            ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-white/20 text-xl">🏟️</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate">{g.name}</p>
                          <p className="text-white/35 text-xs mt-0.5">📍 {g.location} · Rs {g.price_per_hour}/hr</p>
                          <p className="text-white/20 text-xs font-mono mt-0.5">Owner: {g.owner}</p>
                        </div>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border
                          ${g.is_approved
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-amber-400/10 border-amber-400/25 text-amber-400"}`}>
                          {g.is_approved ? "Approved" : "Pending"}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                          {!g.is_approved ? (
                            <button onClick={() => handleApproval(g.id, true)} disabled={busy}
                              className="px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-500/25 transition disabled:opacity-40 flex items-center gap-1.5">
                              {busy ? <Spin /> : "Approve"}
                            </button>
                          ) : (
                            <button onClick={() => handleApproval(g.id, false)} disabled={busy}
                              className="px-4 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-black hover:bg-red-500/20 transition disabled:opacity-40 flex items-center gap-1.5">
                              {busy ? <Spin /> : "Revoke"}
                            </button>
                          )}
                          <button onClick={() => navigate(`/admin/ground/${g.id}`)}
                            className="px-4 py-1.5 bg-white/5 border border-white/10 text-white/45 rounded-xl text-xs font-bold hover:bg-white/10 hover:text-white transition">
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-6 py-4 border-t border-white/8">
                <button onClick={() => navigate("/admin/grounds")}
                  className="text-violet-400 text-sm hover:text-violet-300 transition">
                  Full ground management →
                </button>
              </div>
            </div>
          )}

          {/* ── BOOKINGS TAB ────────────────────────────────── */}
          {tab === "bookings" && (
            <div>
              <div className="hidden md:grid grid-cols-12 px-6 py-3 border-b border-white/8 text-xs uppercase tracking-widest text-white/20">
                <div className="col-span-3">Ground</div>
                <div className="col-span-3">Player</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-1">Rs</div>
                <div className="col-span-1">Status</div>
              </div>
              {safeBookings.length === 0
                ? <Empty icon="📋" msg="No bookings yet" />
                : (
                  <div className="divide-y divide-white/5">
                    {safeBookings.slice(0, 8).map((b) => {
                      const st = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
                      return (
                        <div key={b.id} className="grid md:grid-cols-12 grid-cols-1 gap-1 md:gap-0 px-6 py-4 hover:bg-white/3 transition items-center">
                          <div className="md:col-span-3 flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
                            <span className="text-white font-medium text-sm truncate">{b.ground_name}</span>
                          </div>
                          <div className="md:col-span-3 text-white/40 text-sm truncate">{b.user_email}</div>
                          <div className="md:col-span-2 text-white/60 text-sm">{b.date}</div>
                          <div className="md:col-span-2 text-white/60 text-sm">{fmt12(b.start_time)} – {fmt12(b.end_time)}</div>
                          <div className="md:col-span-1 text-amber-400 font-bold text-sm">{b.total_price}</div>
                          <div className="md:col-span-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.badge} ${st.text} capitalize`}>
                              {b.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              {safeBookings.length > 8 && (
                <div className="px-6 py-4 border-t border-white/8">
                  <button onClick={() => navigate("/admin/bookings")}
                    className="text-violet-400 text-sm hover:text-violet-300 transition">
                    View all {safeBookings.length} bookings →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── USERS TAB ───────────────────────────────────── */}
          {tab === "users" && (
            <div>
              <div className="hidden md:grid grid-cols-12 px-6 py-3 border-b border-white/8 text-xs uppercase tracking-widest text-white/20">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Name</div>
                <div className="col-span-4">Email</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-1">Status</div>
              </div>
              {safeUsers.length === 0
                ? <Empty icon="👥" msg="No users yet" />
                : (
                  <div className="divide-y divide-white/5">
                    {safeUsers.slice(0, 8).map((u, i) => (
                      <div key={u.id} className="grid md:grid-cols-12 grid-cols-1 gap-1 md:gap-0 px-6 py-4 hover:bg-white/3 transition items-center">
                        <div className="md:col-span-1 text-white/20 text-sm font-mono">{i + 1}</div>
                        <div className="md:col-span-4">
                          <p className="text-white font-medium text-sm">{u.full_name || "—"}</p>
                          {u.phone && <p className="text-white/25 text-xs">{u.phone}</p>}
                        </div>
                        <div className="md:col-span-4 text-white/40 text-sm truncate">{u.email}</div>
                        <div className="md:col-span-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${ROLE_STYLE[u.role] || ROLE_STYLE.player}`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="md:col-span-1">
                          {u.is_verified
                            ? <span className="text-emerald-400 text-xs font-black">✓</span>
                            : <span className="text-amber-400/50 text-xs">–</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              {safeUsers.length > 8 && (
                <div className="px-6 py-4 border-t border-white/8">
                  <button onClick={() => navigate("/admin/users")}
                    className="text-violet-400 text-sm hover:text-violet-300 transition">
                    View all {safeUsers.length} users →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM ROW ─────────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white/3 border border-white/8 rounded-2xl p-6">
            <p className="text-white/25 text-xs uppercase tracking-[0.2em] mb-5">Platform Health</p>
            <div className="space-y-5">
              {[
                { label: "Ground Approval Rate",
                  value: s.grounds  > 0 ? Math.round((s.approved  / s.grounds)  * 100) : 0,
                  color: "bg-emerald-400" },
                { label: "Booking Confirmation Rate",
                  value: s.bookings > 0 ? Math.round((s.confirmed / s.bookings) * 100) : 0,
                  color: "bg-violet-400"  },
                { label: "Owner Verification Rate",
                  value: s.owners   > 0
                    ? Math.round((safeUsers.filter(u => u.role === "owner" && u.is_verified).length / s.owners) * 100)
                    : 0,
                  color: "bg-amber-400" },
              ].map((bar) => (
                <div key={bar.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white/45">{bar.label}</span>
                    <span className="text-white font-bold">{bar.value}%</span>
                  </div>
                  <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full ${bar.color} rounded-full transition-all duration-1000`}
                      style={{ width: `${bar.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col">
            <p className="text-white/25 text-xs uppercase tracking-[0.2em] mb-4">Admin Session</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                A
              </div>
              <div>
                <p className="text-white font-bold">Administrator</p>
                <p className="text-white/30 text-xs font-mono truncate max-w-[160px]">{userEmail}</p>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <Row k="Role"    v="Admin"     vc="text-violet-400"  />
              <Row k="Access"  v="Full"      vc="text-emerald-400" />
              <Row k="Grounds" v={s.grounds} />
              <Row k="Users"   v={s.users}   />
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 grid grid-cols-2 gap-2">
              <button onClick={() => navigate("/admin/users")}
                className="py-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl text-xs font-bold hover:bg-violet-500/20 transition">
                Users
              </button>
              <button onClick={() => navigate("/admin/grounds")}
                className="py-2.5 bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-bold hover:bg-white/10 hover:text-white transition">
                Grounds
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
