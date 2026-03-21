import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h = parseInt(val.split(":")[0], 10);
  return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
};

export default function AdminGroundDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,    setGround]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [approving, setApproving] = useState(false);
  const [toast,     setToast]     = useState({ msg: "", type: "" });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/admin/${id}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setGround)
      .catch(() => setToast({ msg: "Failed to load ground.", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  const handleApproval = async (approve) => {
    setApproving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${id}/approve/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_approved: approve }),
      });
      if (res.ok) {
        setGround(prev => ({ ...prev, is_approved: approve }));
        showToast(approve ? "Ground approved! ✅" : "Approval revoked.");
      } else { showToast("Action failed.", "error"); }
    } catch { showToast("Network error.", "error"); }
    finally  { setApproving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center px-4 pt-20">
        <div>
          <p className="text-5xl mb-4">🏟️</p>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Ground Not Found</h2>
          <button onClick={() => navigate("/admin/grounds")}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm">
            ← Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground?.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;

  const facilitiesList = ground?.facilities
    ? ground.facilities.split(",").map(f => f.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {toast.msg && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold border whitespace-nowrap
          ${toast.type === "success" ? "bg-white border-green-200 text-green-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/admin/grounds")}
          className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">← Grounds</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm truncate">{ground?.name}</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">

          {/* image + basic */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {imgSrc
                ? <img src={imgSrc} alt={ground.name} className="w-full h-64 object-cover" />
                : <div className="w-full h-64 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-7xl">⚽</div>}
              <div className="p-5">
                <h2 className="text-xl font-black text-gray-900 mb-1">{ground.name}</h2>
                <p className="text-gray-500 text-sm">📍 {ground.location}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {ground.ground_size && (
                    <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded">
                      ⚽ {ground.ground_size}v{ground.ground_size}
                    </span>
                  )}
                  {ground.ground_type && (
                    <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded capitalize">
                      {ground.ground_type === "indoor" ? "🏠" : "☀️"} {ground.ground_type}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded text-xs font-bold border
                    ${ground.is_approved ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    {ground.is_approved ? "✓ Approved" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* details + actions */}
          <div className="col-span-12 lg:col-span-7 space-y-5">

            {/* info grid */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Ground Details</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ["🕐 Opens",     toLabel(ground.opening_time?.slice(0,5))],
                  ["🕕 Closes",    toLabel(ground.closing_time?.slice(0,5))],
                  ["💰 Price",     `Rs ${ground.price_per_hour} / hr`],
                  ["👤 Owner",     ground.owner || "—"],
                  ["⚽ Size",      ground.ground_size ? `${ground.ground_size}-a-side` : "—"],
                  ["🏟️ Type",     ground.ground_type ? (ground.ground_type === "indoor" ? "🏠 Indoor" : "☀️ Outdoor") : "—"],
                ].map(([k,v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">{k}</p>
                    <p className="text-gray-800 font-semibold text-sm">{v}</p>
                  </div>
                ))}
              </div>
              {ground.description && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{ground.description}</p>
                </div>
              )}
              {facilitiesList.length > 0 && (
                <div className="border-t border-gray-100 pt-4 mt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Facilities</p>
                  <div className="flex flex-wrap gap-2">
                    {facilitiesList.map(f => (
                      <span key={f} className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded text-xs font-medium capitalize">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* action card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Admin Actions</p>
              {!ground.is_approved ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                    <p className="text-amber-700 font-semibold text-sm">⏳ This ground is pending review</p>
                    <p className="text-amber-600/70 text-xs mt-1">Approve it to make it visible to players on the platform.</p>
                  </div>
                  <button onClick={() => handleApproval(true)} disabled={approving}
                    className="w-full py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm">
                    {approving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</> : "✅ Approve Ground"}
                  </button>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
                    <p className="text-green-600 text-2xl mb-1">✅</p>
                    <p className="text-green-700 font-bold text-sm">Ground is Live</p>
                    <p className="text-green-600/60 text-xs mt-1">Visible to all players on the platform</p>
                  </div>
                  <button onClick={() => handleApproval(false)} disabled={approving}
                    className="w-full py-3.5 bg-red-50 border border-red-200 text-red-600 font-black rounded-xl hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {approving ? <><div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />Processing...</> : "✕ Revoke Approval"}
                  </button>
                </>
              )}
            </div>

            {/* meta */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-2 text-sm">
              {[
                ["ID",      `#${ground.id}`],
                ["Status",  ground.is_approved ? "Approved" : "Pending"],
                ["Created", ground.created_at ? new Date(ground.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : "—"],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400">{k}</span>
                  <span className={`font-semibold ${v === "Approved" ? "text-green-600" : v === "Pending" ? "text-amber-600" : "text-gray-700"}`}>{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate("/admin/grounds")}
                className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
                ← All Grounds
              </button>
              <button onClick={() => navigate("/admin-dashboard")}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-400 rounded-xl text-sm hover:bg-gray-50 hover:text-gray-600 transition">
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
