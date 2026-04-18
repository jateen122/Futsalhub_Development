import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  X,
  MapPin,
  Eye,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

function GroundDetailPanel({
  ground,
  onClose,
  onApprove,
  onReject,
  approving,
}) {
  const busy = approving === ground.id;
  const imgSrc = ground.image
    ? ground.image.startsWith("http")
      ? ground.image
      : `${BASE_URL}${ground.image}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="relative h-52 flex-shrink-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={ground.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
              <Building2 size={80} className="text-amber-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center hover:bg-white transition shadow"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-5 flex gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                ground.is_approved
                  ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                  : "bg-amber-100 border-amber-200 text-amber-700"
              }`}
            >
              {ground.is_approved ? (
                <>
                  <CheckCircle size={14} /> Approved
                </>
              ) : (
                <>
                  <Clock size={14} /> Pending
                </>
              )}
            </span>
            {ground.ground_size && (
              <span className="px-2.5 py-1 bg-black/60 text-white text-xs font-bold rounded">
                {ground.ground_size}v{ground.ground_size}
              </span>
            )}
            {ground.ground_type && (
              <span className="px-2.5 py-1 bg-black/60 text-white text-xs font-bold rounded capitalize">
                {ground.ground_type}
              </span>
            )}
          </div>
          <div className="absolute bottom-4 right-5 bg-black/60 text-white text-sm font-black px-3 py-1.5 rounded">
            Rs {ground.price_per_hour}/hr
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-7">
          <h2 className="text-2xl font-black text-gray-900 mb-1">
            {ground.name}
          </h2>
          <p className="text-gray-500 text-sm mb-1 flex items-center gap-1">
            <MapPin size={16} /> {ground.location}
          </p>
          <p className="text-gray-400 text-xs mb-5">Owner: {ground.owner}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ["Opens", toLabel(ground.opening_time?.slice(0, 5))],
              ["Closes", toLabel(ground.closing_time?.slice(0, 5))],
              ["Price", `Rs ${ground.price_per_hour} / hr`],
              ["Facilities", ground.facilities || "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="bg-gray-50 border border-gray-100 rounded-xl p-3"
              >
                <p className="text-gray-400 text-xs mb-1">{k}</p>
                <p className="text-gray-800 font-semibold text-sm">{v}</p>
              </div>
            ))}
          </div>
          {ground.description && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-xl p-4">
                {ground.description}
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition text-sm"
            >
              Close
            </button>
            {ground.is_approved ? (
              <button
                onClick={() => onReject(ground.id)}
                disabled={busy}
                className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <X size={16} /> Revoke
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onReject(ground.id)}
                  disabled={busy}
                  className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <X size={16} /> Reject
                    </>
                  )}
                </button>
                <button
                  onClick={() => onApprove(ground.id)}
                  disabled={busy}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  {busy ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} /> Approve
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminGroundApproval() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchGrounds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/admin/all/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGrounds(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchGrounds();
  }, [token]);

  const handleApproval = async (groundId, approve) => {
    setApproving(groundId);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${groundId}/approve/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: approve }),
      });
      if (res.ok) {
        setGrounds((prev) =>
          prev.map((g) =>
            g.id === groundId ? { ...g, is_approved: approve } : g,
          ),
        );
        if (selected?.id === groundId)
          setSelected((p) => ({ ...p, is_approved: approve }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(null);
    }
  };

  const filtered = grounds.filter((g) => {
    const matchFilter =
      filter === "approved"
        ? g.is_approved
        : filter === "pending"
          ? !g.is_approved
          : true;
    const matchSize = !sizeFilter || g.ground_size === sizeFilter;
    const matchType =
      !typeFilter || g.ground_type?.toLowerCase() === typeFilter;
    const matchSearch =
      !search.trim() ||
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.location?.toLowerCase().includes(search.toLowerCase()) ||
      (g.owner || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSize && matchType && matchSearch;
  });

  const stats = {
    total: grounds.length,
    approved: grounds.filter((g) => g.is_approved).length,
    pending: grounds.filter((g) => !g.is_approved).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading grounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {selected && (
        <GroundDetailPanel
          ground={selected}
          onClose={() => setSelected(null)}
          onApprove={(id) => handleApproval(id, true)}
          onReject={(id) => handleApproval(id, false)}
          approving={approving}
        />
      )}

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
            Ground Approvals
          </h1>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total",
              value: stats.total,
              icon: <Building2 size={24} />,
              color: "from-slate-700 to-slate-900",
            },
            {
              label: "Approved",
              value: stats.approved,
              icon: <CheckCircle size={24} />,
              color: "from-emerald-500 to-teal-600",
            },
            {
              label: "Pending",
              value: stats.pending,
              icon: <Clock size={24} />,
              color: "from-amber-500 to-orange-500",
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

        {/* Pending Alert */}
        {stats.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
            <div className="flex-shrink-0">
              <Clock size={32} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-amber-800 font-bold">
                {stats.pending} ground{stats.pending > 1 ? "s" : ""} waiting for
                approval
              </p>
              <p className="text-amber-600/60 text-sm">
                Review and approve pending grounds below.
              </p>
            </div>
            <button
              onClick={() => setFilter("pending")}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex-shrink-0 text-sm"
            >
              Show Pending
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Search */}
          <div className="relative">
            <MapPin
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, location or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Filter Groups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["pending", "Pending"],
                  ["approved", "Approved"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setFilter(val)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      filter === val
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["", "All"],
                  ["5", "5v5"],
                  ["6", "6v6"],
                  ["7", "7v7"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setSizeFilter(val)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      sizeFilter === val
                        ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Type
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  ["", "All"],
                  ["indoor", "Indoor"],
                  ["outdoor", "Outdoor"],
                ].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition border ${
                      typeFilter === val
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

        {/* Grounds Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={40} className="text-gray-400" />
            </div>
            <p className="text-gray-900 text-lg font-semibold">
              No grounds found
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {grounds.length === 0
                ? "No grounds listed yet."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((g) => {
              const imgSrc = g.image
                ? g.image.startsWith("http")
                  ? g.image
                  : `${BASE_URL}${g.image}`
                : null;
              const busy = approving === g.id;
              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border ${
                    g.is_approved ? "border-gray-100" : "border-amber-200"
                  }`}
                >
                  {/* Image */}
                  <div
                    className="relative h-44 overflow-hidden bg-gray-100 cursor-pointer group"
                    onClick={() => setSelected(g)}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={g.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-100">
                        <Building2 size={48} className="text-amber-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
                        <Eye size={14} /> View Details
                      </span>
                    </div>
                    <div className="absolute top-3 left-3">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                          g.is_approved
                            ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                            : "bg-amber-100 border-amber-200 text-amber-700"
                        }`}
                      >
                        {g.is_approved ? (
                          <>
                            <CheckCircle size={12} /> Approved
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Pending
                          </>
                        )}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {g.ground_size && (
                        <span className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                          {g.ground_size}v{g.ground_size}
                        </span>
                      )}
                      {g.ground_type && (
                        <span className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded capitalize">
                          {g.ground_type}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-black px-2.5 py-1 rounded">
                      Rs {g.price_per_hour}/hr
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">
                      {g.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 flex items-center gap-1">
                      <MapPin size={14} /> {g.location}
                    </p>
                    <p className="text-gray-500 text-xs mb-4">
                      Owner: {g.owner}
                    </p>
                    <div className="flex gap-2">
                      {!g.is_approved ? (
                        <>
                          <button
                            onClick={() => handleApproval(g.id, true)}
                            disabled={busy}
                            className="flex-1 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {busy ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <CheckCircle size={16} /> Approve
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setSelected(g)}
                            className="px-3 py-2.5 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
                          >
                            <Eye size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelected(g)}
                            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleApproval(g.id, false)}
                            disabled={busy}
                            className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center"
                          >
                            {busy ? (
                              <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X size={16} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
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
