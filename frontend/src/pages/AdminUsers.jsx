import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const ROLE_CONFIG = {
  player: { color: "text-sky-400",    bg: "bg-sky-400/10",    border: "border-sky-400/30",    icon: "🎮" },
  owner:  { color: "text-amber-400",  bg: "bg-amber-400/10",  border: "border-amber-400/30",  icon: "🏟️" },
  admin:  { color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", icon: "⚙️" },
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/accounts/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { setUsers(d.results || d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchRole   = filter === "all" || u.role === filter;
    const matchSearch = !search.trim() ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const stats = {
    total:   users.length,
    players: users.filter((u) => u.role === "player").length,
    owners:  users.filter((u) => u.role === "owner").length,
    admins:  users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <button onClick={() => navigate("/admin-dashboard")} className="text-white/40 hover:text-white text-sm mb-4 flex items-center gap-1 transition">
            ← Dashboard
          </button>
          <h1 className="text-4xl font-black text-white">User Management</h1>
          <p className="text-white/40 mt-1">All registered users on FutsalHub</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",   value: stats.total,   color: "text-white"        },
            { label: "Players", value: stats.players, color: "text-sky-400"      },
            { label: "Owners",  value: stats.owners,  color: "text-amber-400"    },
            { label: "Admins",  value: stats.admins,  color: "text-purple-400"   },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 text-sm"
          />
          <div className="flex gap-2">
            {["all", "player", "owner", "admin"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition
                  ${filter === f ? "bg-amber-400 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👥</p>
            <p className="text-white/40 text-lg">No users found</p>
          </div>
        ) : (
          <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
            {/* Table Head */}
            <div className="grid grid-cols-12 px-5 py-3 border-b border-white/10 text-xs uppercase tracking-widest text-white/30">
              <div className="col-span-1">#</div>
              <div className="col-span-4">User</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Verified</div>
            </div>

            {/* Rows */}
            {filtered.map((u, i) => {
              const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.player;
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-12 px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition items-center"
                >
                  <div className="col-span-1 text-white/30 text-sm">{i + 1}</div>
                  <div className="col-span-4">
                    <p className="text-white font-semibold text-sm truncate">{u.full_name || "—"}</p>
                    <p className="text-white/30 text-xs mt-0.5">{u.phone || "No phone"}</p>
                  </div>
                  <div className="col-span-3 text-white/60 text-sm truncate">{u.email}</div>
                  <div className="col-span-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleCfg.color} ${roleCfg.bg} ${roleCfg.border} capitalize`}>
                      {roleCfg.icon} {u.role}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {u.is_verified ? (
                      <span className="text-emerald-400 text-sm font-semibold">✓ Verified</span>
                    ) : (
                      <span className="text-amber-400/70 text-sm">⏳ Pending</span>
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
