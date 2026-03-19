import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${ampm}`;
};

function StatusBadge({ approved }) {
  return approved ? (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Approved
    </span>
  ) : (
    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-black rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{" "}
      Pending
    </span>
  );
}

function DeleteModal({ ground, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[#0f1825] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <p className="text-5xl text-center mb-4">.</p>
        <h2 className="text-xl font-black text-white text-center mb-2">
          {ground.is_approved ? "Revoke Approval?" : "Confirm Approval?"}
        </h2>
        <p className="text-white/40 text-sm text-center mb-6">
          <strong className="text-white">{ground.name}</strong>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 py-3 font-black rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2
              ${
                ground.is_approved
                  ? "bg-red-500 text-white hover:bg-red-400"
                  : "bg-emerald-500 text-white hover:bg-emerald-400"
              }`}
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : ground.is_approved ? (
              "Revoke"
            ) : (
              "Approve"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0f1825] border border-white/10 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="relative h-56 flex-shrink-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={ground.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/3 flex items-center justify-center text-6xl">
              .
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1825] via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-black/50 backdrop-blur-sm text-white rounded-xl flex items-center justify-center hover:bg-black/70 transition text-sm font-black"
          >
            X
          </button>
          <div className="absolute bottom-4 left-5">
            <StatusBadge approved={ground.is_approved} />
          </div>
          <div className="absolute bottom-4 right-5 bg-black/60 backdrop-blur-sm text-white text-sm font-black px-4 py-1.5 rounded-full">
            Rs {ground.price_per_hour}/hr
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-7">
          <h2 className="text-3xl font-black text-white mb-1">{ground.name}</h2>
          <p className="text-white/45 text-sm mb-1">📍 {ground.location}</p>
          <p className="text-white/25 text-xs font-mono mb-6">
            Owner: {ground.owner}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              ["Opens", toLabel(ground.opening_time?.slice(0, 5))],
              ["Closes", toLabel(ground.closing_time?.slice(0, 5))],
              ["Price", `Rs ${ground.price_per_hour} / hr`],
              ["Facilities", ground.facilities || "—"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="bg-white/3 border border-white/8 rounded-xl p-4"
              >
                <p className="text-white/30 text-xs mb-1.5">{k}</p>
                <p className="text-white font-bold text-sm">{v}</p>
              </div>
            ))}
          </div>

          {ground.description && (
            <div className="mb-6">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-2">
                Description
              </p>
              <p className="text-white/65 text-sm leading-relaxed bg-white/3 border border-white/8 rounded-xl p-4">
                {ground.description}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-white/8">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/55 rounded-xl font-bold hover:bg-white/10 transition"
            >
              Close
            </button>
            {ground.is_approved ? (
              <button
                onClick={() => onReject(ground.id)}
                disabled={busy}
                className="flex-1 py-3.5 bg-red-500/15 border border-red-500/30 text-red-400 font-black rounded-xl hover:bg-red-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Revoke Approval"
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onReject(ground.id)}
                  disabled={busy}
                  className="flex-1 py-3.5 bg-red-500/12 border border-red-500/25 text-red-400 font-black rounded-xl hover:bg-red-500/22 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Reject"
                  )}
                </button>
                <button
                  onClick={() => onApprove(ground.id)}
                  disabled={busy}
                  className="flex-1 py-3.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Approve"
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
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState({ msg: "", type: "" });

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
      setToast({ msg: "Failed to load grounds.", type: "error" });
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
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  const handleApproval = async (groundId, approve) => {
    setApproving(groundId);
    setConfirm(null);
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
        showToast(
          approve ? "Ground approved" : "Approval revoked.",
          approve ? "success" : "error",
        );
      } else {
        showToast("Action failed. Check permissions.", "error");
      }
    } catch {
      showToast("Network error.", "error");
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
    const matchSearch =
      !search.trim() ||
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.location?.toLowerCase().includes(search.toLowerCase()) ||
      (g.owner || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = {
    total: grounds.length,
    approved: grounds.filter((g) => g.is_approved).length,
    pending: grounds.filter((g) => !g.is_approved).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
          </div>
          <p className="text-white/25 text-xs tracking-widest font-mono uppercase">
            Loading Grounds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a12] pt-20 pb-20">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-violet-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {toast.msg && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold border whitespace-nowrap
          ${
            toast.type === "success"
              ? "bg-[#0f1825] border-emerald-500/30 text-emerald-400"
              : "bg-[#0f1825] border-red-500/30 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {selected && (
        <GroundDetailPanel
          ground={selected}
          onClose={() => setSelected(null)}
          onApprove={(id) => handleApproval(id, true)}
          onReject={(id) => handleApproval(id, false)}
          approving={approving}
        />
      )}

      {confirm && (
        <DeleteModal
          ground={confirm.ground}
          onConfirm={() => handleApproval(confirm.ground.id, confirm.approve)}
          onCancel={() => setConfirm(null)}
          busy={approving === confirm.ground.id}
        />
      )}

      <div className="relative max-w-6xl mx-auto px-4">
        {/* header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/admin-dashboard")}
            className="text-white/30 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition"
          >
            Admin Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-3xl shadow-lg shadow-violet-500/10">
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                  Admin
                </span>
              </div>
              <h1 className="text-4xl font-black text-white leading-none">
                Ground Approvals
              </h1>
              <p className="text-white/30 text-sm mt-1.5">
                Review and approve futsal grounds
              </p>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total", value: stats.total, color: "text-white" },
            {
              label: "Approved",
              value: stats.approved,
              color: "text-emerald-400",
            },
            {
              label: "Pending Review",
              value: stats.pending,
              color: "text-amber-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/3 border border-white/8 rounded-2xl p-5 text-center"
            >
              <div className="text-2xl mb-2">..</div>
              <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/35 text-xs mt-1 uppercase tracking-widest">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* pending alert */}
        {stats.pending > 0 && (
          <div className="bg-amber-400/8 border border-amber-400/20 rounded-2xl p-4 mb-6 flex items-center gap-4">
            <span className="text-2xl">.</span>
            <div className="flex-1">
              <p className="text-amber-300 font-bold">
                {stats.pending} ground{stats.pending > 1 ? "s" : ""} waiting for
                review
              </p>
              <p className="text-amber-400/50 text-sm">
                Click Approve or Reject on each card.
              </p>
            </div>
            <button
              onClick={() => setFilter("pending")}
              className="px-4 py-2 bg-amber-400 text-black font-black rounded-xl text-sm hover:bg-amber-300 transition flex-shrink-0"
            >
              Show Pending
            </button>
          </div>
        )}

        {/* search + filter */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
              .
            </span>
            <input
              type="text"
              placeholder="Search by name, location or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition text-sm"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: "all", label: "All", count: stats.total },
              { id: "pending", label: "Pending", count: stats.pending },
              { id: "approved", label: "Approved", count: stats.approved },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                  ${
                    filter === f.id
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25"
                      : "bg-white/5 border border-white/8 text-white/45 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {f.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-black
                  ${filter === f.id ? "bg-white/20 text-white" : "bg-white/10 text-white/40"}`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">..</p>
            <p className="text-white/40 text-xl font-semibold">
              No grounds found
            </p>
            <p className="text-white/20 text-sm mt-2">
              {grounds.length === 0
                ? "No grounds have been listed yet. Owners need to add grounds first."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
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
                  className={`bg-[#0f1825] border rounded-2xl overflow-hidden transition-all duration-200 group
                    ${g.is_approved ? "border-white/8 hover:border-emerald-500/25" : "border-amber-400/20 hover:border-amber-400/40"}`}
                >
                  <div
                    className="relative h-44 overflow-hidden cursor-pointer"
                    onClick={() => setSelected(g)}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={g.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/2 flex items-center justify-center text-6xl">
                        .
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition bg-black/50 text-white text-sm font-bold px-4 py-2 rounded-xl">
                        View Details
                      </span>
                    </div>
                    <div className="absolute top-3 left-3">
                      <StatusBadge approved={g.is_approved} />
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-black px-3 py-1 rounded-full">
                      Rs {g.price_per_hour}/hr
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-white font-black text-lg mb-1 truncate">
                      {g.name}
                    </h3>
                    <p className="text-white/40 text-sm mb-0.5">
                      📍 {g.location}
                    </p>
                    <p className="text-white/20 text-xs font-mono mb-3">
                      Owner: {g.owner}
                    </p>
                    <div className="flex gap-4 text-xs text-white/30 mb-4">
                      <span>{toLabel(g.opening_time?.slice(0, 5))}</span>
                      <span>{toLabel(g.closing_time?.slice(0, 5))}</span>
                    </div>

                    <div className="flex gap-2">
                      {!g.is_approved ? (
                        <>
                          <button
                            onClick={() => handleApproval(g.id, true)}
                            disabled={busy}
                            className="flex-1 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-black hover:bg-emerald-500/25 transition disabled:opacity-40 flex items-center justify-center gap-1.5"
                          >
                            {busy ? (
                              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </button>
                          <button
                            onClick={() => setSelected(g)}
                            className="px-3 py-2.5 bg-white/5 border border-white/10 text-white/45 rounded-xl text-sm hover:bg-white/10 hover:text-white transition"
                          >
                            Details
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelected(g)}
                            className="flex-1 py-2.5 bg-white/5 border border-white/8 text-white/55 rounded-xl text-sm font-bold hover:bg-white/10 hover:text-white transition"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleApproval(g.id, false)}
                            disabled={busy}
                            className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-black hover:bg-red-500/20 transition disabled:opacity-40 flex items-center justify-center"
                          >
                            {busy ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "X"
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
