// frontend/src/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Home,
  CheckCircle,
  Clock,
  ArrowRight,
  Building2,
  Settings,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ── fetch ALL pages ────────────────────────────────────────────────────────
async function fetchAllPages(url, token) {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data)) {
      results = results.concat(data);
      break;
    }
    results = results.concat(data.results || []);
    nextUrl = data.next || null;
  }
  return results;
}

const STATUS_COLOR = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-500 border-gray-200",
};

const ROLE_STYLE = {
  player: "bg-sky-100 text-sky-700 border-sky-200",
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const email = localStorage.getItem("email") || "Admin";

  const [grounds, setGrounds] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);

  const fetchAll = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const [groundsAll, usersAll] = await Promise.all([
        fetchAllPages(`${BASE_URL}/api/grounds/admin/all/`, token),
        fetchAllPages(`${BASE_URL}/api/accounts/users/`, token),
      ]);
      setGrounds(groundsAll);
      setUsers(usersAll);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  const handleApproval = async (id, approve) => {
    setApproving(id);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${id}/approve/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: approve }),
      });
      if (res.ok) {
        setGrounds((prev) =>
          prev.map((g) => (g.id === id ? { ...g, is_approved: approve } : g)),
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(null);
    }
  };

  const stats = {
    total_users: users.length,
    players: users.filter((u) => u.role === "player").length,
    owners: users.filter((u) => u.role === "owner").length,
    total_grounds: grounds.length,
    approved: grounds.filter((g) => g.is_approved).length,
    pending: grounds.filter((g) => !g.is_approved).length,
  };

  const quickActions = [
    {
      label: "Ground Approvals",
      path: "/admin/grounds",
      color: "from-emerald-500 to-teal-600",
    },
    {
      label: "All Users",
      path: "/admin/users",
      color: "from-blue-500 to-indigo-600",
    },
    {
      label: "Notifications",
      path: "/admin/notifications",
      color: "from-purple-500 to-violet-600",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 lg:px-14 xl:px-20 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Admin Dashboard
          </h1>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Total Users",
              value: stats.total_users,
              icon: <Users size={24} />,
              color: "from-slate-700 to-slate-900",
            },
            {
              label: "Players",
              value: stats.players,
              icon: <Users size={24} />,
              color: "from-blue-500 to-indigo-600",
            },
            {
              label: "Owners",
              value: stats.owners,
              icon: <Home size={24} />,
              color: "from-amber-500 to-orange-500",
            },
            {
              label: "Total Grounds",
              value: stats.total_grounds,
              icon: <Building2 size={24} />,
              color: "from-emerald-500 to-teal-600",
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: <CheckCircle size={24} />,
              color: "from-emerald-600 to-green-700",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: <Clock size={24} />,
              color: "from-amber-600 to-yellow-700",
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className={`group bg-gradient-to-br ${action.color} text-white rounded-2xl p-6 text-left hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-md flex flex-col justify-between h-full`}
                  >
                    <div className="text-3xl mb-4 opacity-90 group-hover:scale-110 transition-transform">
                      <ArrowRight size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-lg tracking-tight">
                        {action.label}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        Go to section
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pending Grounds */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Pending Approvals
                  </h2>
                  <p className="text-gray-500 mt-1 text-sm">
                    {stats.pending} grounds awaiting approval
                  </p>
                </div>
                <button
                  onClick={() => navigate("/admin/grounds")}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold transition text-sm"
                >
                  View All <ArrowRight size={18} />
                </button>
              </div>

              {grounds.filter((g) => !g.is_approved).length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <CheckCircle size={40} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    All caught up!
                  </h3>
                  <p className="text-gray-500 mt-2 max-w-sm mx-auto text-sm">
                    All grounds have been reviewed and approved.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {grounds
                    .filter((g) => !g.is_approved)
                    .slice(0, 5)
                    .map((g) => {
                      const imgSrc = g.image
                        ? g.image.startsWith("http")
                          ? g.image
                          : `${BASE_URL}${g.image}`
                        : null;
                      const busy = approving === g.id;
                      return (
                        <div
                          key={g.id}
                          className="px-8 py-6 hover:bg-gray-50 transition flex items-center gap-4"
                        >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={g.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-amber-50">
                                <Building2
                                  size={32}
                                  className="text-amber-400"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-gray-900 truncate">
                              {g.name}
                            </p>
                            <p className="text-gray-500 mt-1 text-sm">
                              {g.location} • Rs {g.price_per_hour}/hr
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApproval(g.id, true)}
                              disabled={busy}
                              className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl transition disabled:opacity-50 text-sm"
                            >
                              {busy ? "..." : "Approve"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Users Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users size={22} className="text-amber-600" />
                  <h2 className="text-lg font-bold text-gray-900">Users</h2>
                </div>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="text-amber-600 hover:text-amber-700 font-semibold text-xs transition flex items-center gap-1"
                >
                  View all <ArrowRight size={14} />
                </button>
              </div>

              {users.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">
                  No users found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {users.slice(0, 5).map((u) => (
                    <div
                      key={u.id}
                      className="px-8 py-5 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {u.full_name || u.email.split("@")[0]}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {u.email}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize ${ROLE_STYLE[u.role] || ROLE_STYLE.player}`}
                        >
                          {u.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account Summary */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <p className="uppercase text-xs font-bold tracking-widest text-gray-400 mb-6">
                Your Account
              </p>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <Settings size={28} className="text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">Admin</p>
                  <p className="text-gray-500 text-xs break-all">{email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.pending}
                  </p>
                  <p className="text-xs text-amber-600 font-semibold mt-1">
                    Pending
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.approved}
                  </p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    Approved
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/admin/grounds")}
                className="w-full py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold rounded-xl transition text-sm"
              >
                Review Grounds
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
