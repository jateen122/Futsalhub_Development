import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const ROLE_COLOR = {
  player: "bg-sky-50 border-sky-200 text-sky-700",
  owner:  "bg-amber-50 border-amber-200 text-amber-700",
  admin:  "bg-purple-50 border-purple-200 text-purple-700",
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");
  const [emailFilter, setEmailFilter] = useState("all"); // all | verified | unverified
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/accounts/users/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setUsers(d.results || d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const matchRole  = filter === "all" || u.role === filter;
    const matchEmail = emailFilter === "all" ? true
      : emailFilter === "verified"   ?  u.email_verified
      : emailFilter === "unverified" ? !u.email_verified : true;
    const matchSearch = !search.trim() ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchEmail && matchSearch;
  });

  const stats = {
    total:      users.length,
    players:    users.filter(u => u.role === "player").length,
    owners:     users.filter(u => u.role === "owner").length,
    verified:   users.filter(u => u.email_verified).length,
    unverified: users.filter(u => !u.email_verified).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/admin-dashboard")}
          className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">← Dashboard</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">All Users</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
          {[
            { label: "Total",      value: stats.total,      color: "text-gray-900"  },
            { label: "Players",    value: stats.players,    color: "text-sky-600"   },
            { label: "Owners",     value: stats.owners,     color: "text-amber-600" },
            { label: "Email ✓",    value: stats.verified,   color: "text-green-600" },
            { label: "Email ✗",    value: stats.unverified, color: "text-red-500"   },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input type="text" placeholder="Search by name or email..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500 transition" />
          </div>

          <div className="flex gap-1.5">
            {[["all","All"], ["player","Players"], ["owner","Owners"], ["admin","Admins"]].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition
                  ${filter === v ? "bg-green-500 border-green-500 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            {[["all","All Email"], ["verified","✓ Verified"], ["unverified","✗ Unverified"]].map(([v, l]) => (
              <button key={v} onClick={() => setEmailFilter(v)}
                className={`px-3 py-2 rounded-lg text-xs font-bold border transition
                  ${emailFilter === v ? "bg-purple-500 border-purple-500 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* header */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1">Email</div>
            <div className="col-span-1">Status</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-gray-400">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((u, i) => (
                <div key={u.id} className="grid md:grid-cols-12 grid-cols-1 gap-1 md:gap-0 px-6 py-4 hover:bg-gray-50 transition items-center">
                  <div className="md:col-span-1 text-gray-300 text-xs font-mono">{i+1}</div>
                  <div className="md:col-span-3">
                    <p className="text-gray-800 font-semibold text-sm">{u.full_name || "—"}</p>
                    {u.phone && <p className="text-gray-400 text-xs">{u.phone}</p>}
                  </div>
                  <div className="md:col-span-4 text-gray-500 text-sm truncate">{u.email}</div>
                  <div className="md:col-span-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold border capitalize ${ROLE_COLOR[u.role] || ""}`}>
                      {u.role === "player" ? "🎮" : u.role === "owner" ? "🏟️" : "⚙️"} {u.role}
                    </span>
                  </div>
                  <div className="md:col-span-1">
                    <span className={`text-xs font-bold ${u.email_verified ? "text-green-600" : "text-red-500"}`}>
                      {u.email_verified ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="md:col-span-1">
                    <span className={`text-xs font-bold ${u.is_active ? "text-green-500" : "text-gray-300"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>
    </div>
  );
}
