import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h    = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

function StatusBadge({ approved }) {
  return approved ? (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Approved
    </span>
  ) : (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Pending
    </span>
  );
}

function GroundDetailPanel({ ground, onClose, onApprove, onReject, approving }) {
  const busy   = approving === ground.id;
  const imgSrc = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="relative h-52 flex-shrink-0">
          {imgSrc
            ? <img src={imgSrc} alt={ground.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-6xl">⚽</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 text-gray-700 rounded-lg flex items-center justify-center hover:bg-white transition text-sm font-black shadow">✕</button>
          <div className="absolute bottom-4 left-5 flex gap-2">
            <StatusBadge approved={ground.is_approved} />
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
          <h2 className="text-2xl font-black text-gray-900 mb-1">{ground.name}</h2>
          <p className="text-gray-500 text-sm mb-1">📍 {ground.location}</p>
          <p className="text-gray-400 text-xs mb-5">Owner: {ground.owner}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              ["🕐 Opens",  toLabel(ground.opening_time?.slice(0,5))],
              ["🕕 Closes", toLabel(ground.closing_time?.slice(0,5))],
              ["💰 Price",  `Rs ${ground.price_per_hour} / hr`],
              ["🛠 Facilities", ground.facilities || "—"],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">{k}</p>
                <p className="text-gray-800 font-semibold text-sm">{v}</p>
              </div>
            ))}
          </div>
          {ground.description && (
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
              <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 rounded-xl p-4">{ground.description}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={onClose}
              className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
              Close
            </button>
            {ground.is_approved ? (
              <button onClick={() => onReject(ground.id)} disabled={busy}
                className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                {busy ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : "✕ Revoke"}
              </button>
            ) : (
              <>
                <button onClick={() => onReject(ground.id)} disabled={busy}
                  className="flex-1 py-3 bg-red-50 border border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                  {busy ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : "✕ Reject"}
                </button>
                <button onClick={() => onApprove(ground.id)} disabled={busy}
                  className="flex-1 py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-sm">
                  {busy ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "✅ Approve"}
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
  const token    = localStorage.getItem("access");

  const [grounds,   setGrounds]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("all");
  const [sizeFilter,setSizeFilter]= useState("");
  const [typeFilter,setTypeFilter]= useState("");
  const [search,    setSearch]    = useState("");
  const [approving, setApproving] = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [toast,     setToast]     = useState({ msg: "", type: "" });

  const fetchGrounds = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/admin/all/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setGrounds(data.results || data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchGrounds();
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  const handleApproval = async (groundId, approve) => {
    setApproving(groundId);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${groundId}/approve/`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ is_approved: approve }),
      });
      if (res.ok) {
        setGrounds(prev => prev.map(g => g.id === groundId ? { ...g, is_approved: approve } : g));
        if (selected?.id === groundId) setSelected(p => ({ ...p, is_approved: approve }));
        showToast(approve ? "Ground approved ✅" : "Approval revoked.", approve ? "success" : "error");
      } else { showToast("Action failed.", "error"); }
    } catch { showToast("Network error.", "error"); }
    finally  { setApproving(null); }
  };

  const filtered = grounds.filter(g => {
    const matchFilter = filter === "approved" ?  g.is_approved : filter === "pending" ? !g.is_approved : true;
    const matchSize   = !sizeFilter || g.ground_size === sizeFilter;
    const matchType   = !typeFilter || g.ground_type?.toLowerCase() === typeFilter;
    const matchSearch = !search.trim() ||
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.location?.toLowerCase().includes(search.toLowerCase()) ||
      (g.owner || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSize && matchType && matchSearch;
  });

  const stats = {
    total:    grounds.length,
    approved: grounds.filter(g => g.is_approved).length,
    pending:  grounds.filter(g => !g.is_approved).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading grounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {toast.msg && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold border whitespace-nowrap
          ${toast.type === "success" ? "bg-white border-green-200 text-green-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.msg}
        </div>
      )}
      {selected && (
        <GroundDetailPanel ground={selected} onClose={() => setSelected(null)}
          onApprove={id => handleApproval(id, true)} onReject={id => handleApproval(id, false)}
          approving={approving} />
      )}

      {/* top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/admin-dashboard")}
          className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">← Dashboard</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">Ground Approvals</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* stats */}
        <div className="grid grid-cols-3 gap-4 mb-7">
          {[
            { label: "Total",   value: stats.total,    icon: "⚽", color: "text-gray-800"   },
            { label: "Approved",value: stats.approved, icon: "✅", color: "text-green-600"  },
            { label: "Pending", value: stats.pending,  icon: "⏳", color: "text-amber-600"  },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* pending alert */}
        {stats.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4">
            <span className="text-2xl">⏳</span>
            <div className="flex-1">
              <p className="text-amber-700 font-bold text-sm">{stats.pending} ground{stats.pending > 1 ? "s" : ""} waiting for review</p>
              <p className="text-amber-600/60 text-xs">Click Approve or Reject on each card.</p>
            </div>
            <button onClick={() => setFilter("pending")}
              className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition flex-shrink-0">
              Show Pending
            </button>
          </div>
        )}

        {/* search + filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input type="text" placeholder="Search by name, location or owner..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-500 transition" />
            </div>

            {/* status filter */}
            <div className="flex gap-1.5">
              {[["all","All"], ["pending","Pending"], ["approved","Approved"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition border
                    ${filter === val ? "bg-green-500 border-green-500 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* size filter */}
            <div className="flex gap-1.5">
              {[["","Size"], ["5","5v5"], ["6","6v6"], ["7","7v7"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setSizeFilter(val)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition border
                    ${sizeFilter === val ? "bg-blue-500 border-blue-500 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* type filter */}
            <div className="flex gap-1.5">
              {[["","Type"], ["indoor","Indoor"], ["outdoor","Outdoor"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setTypeFilter(val)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition border
                    ${typeFilter === val ? "bg-purple-500 border-purple-500 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🏟️</p>
            <p className="text-gray-500 text-lg font-semibold">No grounds found</p>
            <p className="text-gray-400 text-sm mt-1">
              {grounds.length === 0 ? "No grounds listed yet." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(g => {
              const imgSrc = g.image ? (g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`) : null;
              const busy   = approving === g.id;
              return (
                <div key={g.id}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all duration-200 group border
                    ${g.is_approved ? "border-gray-200 hover:border-gray-300" : "border-amber-200 hover:border-amber-300"}`}>
                  {/* image */}
                  <div className="relative h-44 overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setSelected(g)}>
                    {imgSrc
                      ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-50 to-emerald-100">⚽</div>}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-lg">View Details →</span>
                    </div>
                    <div className="absolute top-3 left-3"><StatusBadge approved={g.is_approved} /></div>
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {g.ground_size && (
                        <span className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">{g.ground_size}v{g.ground_size}</span>
                      )}
                      {g.ground_type && (
                        <span className="bg-black/60 text-white text-xs font-bold px-2 py-1 rounded capitalize">{g.ground_type}</span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-black px-2.5 py-1 rounded">
                      Rs {g.price_per_hour}/hr
                    </div>
                  </div>
                  {/* body */}
                  <div className="p-5">
                    <h3 className="font-black text-gray-900 text-base mb-0.5 truncate">{g.name}</h3>
                    <p className="text-gray-500 text-xs mb-0.5">📍 {g.location}</p>
                    <p className="text-gray-400 text-xs mb-3 font-mono">Owner: {g.owner}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                      <span>🕐 {toLabel(g.opening_time?.slice(0,5))}</span>
                      <span>🕕 {toLabel(g.closing_time?.slice(0,5))}</span>
                    </div>
                    <div className="flex gap-2">
                      {!g.is_approved ? (
                        <>
                          <button onClick={() => handleApproval(g.id, true)} disabled={busy}
                            className="flex-1 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-black hover:bg-green-100 transition disabled:opacity-40 flex items-center justify-center gap-1.5">
                            {busy ? <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : "✅ Approve"}
                          </button>
                          <button onClick={() => setSelected(g)}
                            className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-100 transition">
                            Details
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setSelected(g)}
                            className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition">
                            View Details
                          </button>
                          <button onClick={() => handleApproval(g.id, false)} disabled={busy}
                            className="px-3 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-black hover:bg-red-100 transition disabled:opacity-40 flex items-center justify-center">
                            {busy ? <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : "✕"}
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
