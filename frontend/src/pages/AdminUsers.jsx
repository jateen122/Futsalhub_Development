import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  User,
  Mail,
  CheckCircle,
  AlertCircle,
  Activity,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const ROLE_COLOR = {
  player: "bg-sky-100 text-sky-700 border-sky-200",
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
};

const ROLE_ICON = {
  player: User,
  owner: Users,
  admin: AlertCircle,
};

export default function AdminUsers() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [emailFilter, setEmailFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/accounts/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d.results || d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const filtered = users.filter((u) => {
    const matchRole = filter === "all" || u.role === filter;
    const matchEmail =
      emailFilter === "all"
        ? true
        : emailFilter === "verified"
          ? u.email_verified
          : emailFilter === "unverified"
            ? !u.email_verified
            : true;
    const matchSearch =
      !search.trim() ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchEmail && matchSearch;
  });

  const stats = {
    total: users.length,
    players: users.filter((u) => u.role === "player").length,
    owners: users.filter((u) => u.role === "owner").length,
    verified: users.filter((u) => u.email_verified).length,
    unverified: users.filter((u) => !u.email_verified).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 lg:px-14 xl:px-20 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            All Users
          </h1>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total",
              value: stats.total,
              icon: <Users size={24} />,
              color: "from-slate-700 to-slate-900",
            },
            {
              label: "Players",
              value: stats.players,
              icon: <User size={24} />,
              color: "from-sky-500 to-blue-600",
            },
            {
              label: "Owners",
              value: stats.owners,
              icon: <Users size={24} />,
              color: "from-amber-500 to-orange-500",
            },
            {
              label: "Email Verified",
              value: stats.verified,
              icon: <CheckCircle size={24} />,
              color: "from-emerald-500 to-teal-600",
            },
            {
              label: "Unverified",
              value: stats.unverified,
              icon: <AlertCircle size={24} />,
              color: "from-red-500 to-pink-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} mb-4 text-white`}
              >
                {s.icon}
              </div>
              <p className="text-4xl font-bold tracking-tighter text-gray-900">
                {s.value}
              </p>
              <p className="text-sm font-semibold text-gray-500 mt-2 tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Search */}
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Filter Groups */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Role
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["player", "Players"],
                  ["owner", "Owners"],
                  ["admin", "Admins"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setFilter(val)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      filter === val
                        ? "bg-sky-500 text-white border-sky-500 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Status Filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Email Verification
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["verified", "Verified"],
                  ["unverified", "Unverified"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setEmailFilter(val)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      emailFilter === val
                        ? "bg-purple-500 text-white border-purple-500 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Users size={40} className="text-gray-400" />
            </div>
            <p className="text-gray-900 text-lg font-semibold">
              No users found
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => {
              const RoleIcon = ROLE_ICON[u.role] || User;
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User size={20} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-gray-900 truncate">
                            {u.full_name || "—"}
                          </h3>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <Mail size={12} /> {u.email}
                          </p>
                          {u.phone && (
                            <p className="text-xs text-gray-400 mt-1">
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 items-center justify-end">
                      {/* Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${
                          ROLE_COLOR[u.role] || ""
                        }`}
                      >
                        <RoleIcon size={14} />
                        <span className="capitalize">{u.role}</span>
                      </span>

                      {/* Email Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${
                          u.email_verified
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-red-100 border-red-200 text-red-700"
                        }`}
                      >
                        {u.email_verified ? (
                          <>
                            <CheckCircle size={14} /> Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} /> Unverified
                          </>
                        )}
                      </span>

                      {/* Active Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${
                          u.is_active
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-gray-100 border-gray-200 text-gray-600"
                        }`}
                      >
                        <Activity size={14} />
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <p className="text-gray-400 text-xs text-center">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>
    </div>
  );
}
