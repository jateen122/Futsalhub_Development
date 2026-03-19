import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${ampm}`;
};

export default function AdminGroundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "" });

  /* ── fetch ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    // Uses the correct admin detail endpoint
    fetch(`${BASE_URL}/api/grounds/admin/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setGround(data))
      .catch(() => setToast({ msg: "Failed to load ground.", type: "error" }))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── toast ─────────────────────────────────────────────────── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3000);
  };

  /* ── approve / reject ──────────────────────────────────────── */
  const handleApproval = async (approve) => {
    setApproving(true);
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
        setGround((prev) => ({ ...prev, is_approved: approve }));
        showToast(
          approve
            ? "Ground approved successfully!"
            : "Ground approval revoked.",
          approve ? "success" : "error",
        );
      } else {
        const data = await res.json();
        showToast(data?.detail || "Action failed.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setApproving(false);
    }
  };

  /* ── loading ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-400 border-t-transparent animate-spin" />
          </div>
          <p className="text-white/25 text-xs tracking-widest font-mono uppercase">
            Loading Ground
          </p>
        </div>
      </div>
    );
  }

  /* ── not found ─────────────────────────────────────────────── */
  if (!ground && !loading) {
    return (
      <div className="min-h-screen bg-[#060a12] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4"></p>
          <h2 className="text-2xl font-black text-white mb-2">
            Ground Not Found
          </h2>
          <p className="text-white/40 text-sm mb-6">
            This ground may have been deleted or doesn't exist.
          </p>
          {toast.msg && (
            <p className="text-red-400 text-sm mb-4">{toast.msg}</p>
          )}
          <button
            onClick={() => navigate("/admin/grounds")}
            className="px-6 py-3 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-400 transition"
          >
            Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground?.image
    ? ground.image.startsWith("http")
      ? ground.image
      : `${BASE_URL}${ground.image}`
    : null;

  const facilitiesList = ground?.facilities
    ? ground.facilities
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  /* ── UI ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#060a12] pt-20 pb-20">
      {/* bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-violet-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600/3 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      {/* toast */}
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

      <div className="relative max-w-4xl mx-auto px-4">
        {/* ── BACK + BREADCRUMB ──────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm mb-8">
          <button
            onClick={() => navigate("/admin/grounds")}
            className="text-white/30 hover:text-white transition flex items-center gap-1.5"
          >
            Grounds
          </button>
          <span className="text-white/15">/</span>
          <span className="text-violet-400 font-semibold truncate">
            {ground?.name}
          </span>
        </div>

        {/* ── HERO IMAGE ─────────────────────────────────────── */}
        <div className="relative h-72 rounded-3xl overflow-hidden mb-6 border border-white/8">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={ground.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/2 flex items-center justify-center text-8xl"></div>
          )}
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/80 via-transparent to-transparent" />

          {/* status badge */}
          <div className="absolute top-5 left-5">
            <span
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-black border backdrop-blur-sm
              ${
                ground.is_approved
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-amber-400/20 border-amber-400/40 text-amber-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${ground.is_approved ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}
              />
              {ground.is_approved ? "Approved" : "Pending Approval"}
            </span>
          </div>

          {/* price badge */}
          <div className="absolute top-5 right-5 bg-black/60 backdrop-blur-sm text-white font-black px-4 py-1.5 rounded-full text-sm border border-white/10">
            Rs {ground.price_per_hour}/hr
          </div>

          {/* name on image */}
          <div className="absolute bottom-5 left-5 right-5">
            <h1 className="text-3xl font-black text-white">{ground.name}</h1>
            <p className="text-white/60 mt-1">{ground.location}</p>
          </div>
        </div>

        {/* ── CONTENT GRID ───────────────────────────────────── */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* ── LEFT — main info ────────────────────────────── */}
          <div className="md:col-span-2 space-y-5">
            {/* info cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: "",
                  label: "Opens",
                  value: toLabel(ground.opening_time?.slice(0, 5)),
                },
                {
                  icon: "",
                  label: "Closes",
                  value: toLabel(ground.closing_time?.slice(0, 5)),
                },
                {
                  icon: "",
                  label: "Price",
                  value: `Rs ${ground.price_per_hour} / hr`,
                },
                { icon: "", label: "Owner", value: ground.owner || "—" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[#0f1825] border border-white/8 rounded-2xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-white/30 text-xs uppercase tracking-widest">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-white font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            {/* description */}
            <div className="bg-[#0f1825] border border-white/8 rounded-2xl p-6">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-3">
                About this Ground
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                {ground.description || "No description provided."}
              </p>
            </div>

            {/* facilities */}
            {facilitiesList.length > 0 && (
              <div className="bg-[#0f1825] border border-white/8 rounded-2xl p-6">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
                  Facilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {facilitiesList.map((f) => (
                    <span
                      key={f}
                      className="px-4 py-2 bg-white/5 border border-white/8 text-white/65 rounded-full text-sm font-medium capitalize"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT — actions ─────────────────────────────── */}
          <div className="space-y-4">
            {/* approval action card */}
            <div className="bg-[#0f1825] border border-white/8 rounded-2xl p-6">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
                Admin Actions
              </p>

              <div className="space-y-3">
                {!ground.is_approved ? (
                  <>
                    {/* approve */}
                    <button
                      onClick={() => handleApproval(true)}
                      disabled={approving}
                      className="w-full py-3.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {approving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        "Approve Ground"
                      )}
                    </button>

                    {/* reject info */}
                    <div className="bg-amber-400/8 border border-amber-400/15 rounded-xl p-4 text-center">
                      <p className="text-amber-400/80 text-xs leading-relaxed">
                        This ground is currently <strong>pending review</strong>
                        . Approve it to make it visible to players.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* approved state */}
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 text-center mb-3">
                      <p className="text-emerald-400 text-2xl mb-1"></p>
                      <p className="text-emerald-400 font-bold text-sm">
                        Ground is Live
                      </p>
                      <p className="text-emerald-400/50 text-xs mt-1">
                        Visible to all players on the platform
                      </p>
                    </div>

                    {/* revoke */}
                    <button
                      onClick={() => handleApproval(false)}
                      disabled={approving}
                      className="w-full py-3.5 bg-red-500/15 border border-red-500/30 text-red-400 font-black rounded-xl hover:bg-red-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {approving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />{" "}
                          Processing...
                        </>
                      ) : (
                        "Revoke Approval"
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ground meta */}
            <div className="bg-[#0f1825] border border-white/8 rounded-2xl p-6 space-y-3">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">
                Ground Info
              </p>
              {[
                ["ID", `#${ground.id}`],
                ["Status", ground.is_approved ? "Approved" : "Pending"],
                [
                  "Created",
                  ground.created_at
                    ? new Date(ground.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—",
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-white/30">{k}</span>
                  <span
                    className={`font-semibold ${
                      v === "Approved"
                        ? "text-emerald-400"
                        : v === "Pending"
                          ? "text-amber-400"
                          : "text-white/70"
                    }`}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>

            {/* nav buttons */}
            <div className="space-y-2">
              <button
                onClick={() => navigate("/admin/grounds")}
                className="w-full py-3 bg-white/5 border border-white/8 text-white/50 rounded-xl text-sm font-semibold hover:bg-white/10 hover:text-white transition"
              >
                All Grounds
              </button>
              <button
                onClick={() => navigate("/admin-dashboard")}
                className="w-full py-3 bg-white/3 border border-white/5 text-white/30 rounded-xl text-sm hover:bg-white/8 hover:text-white/60 transition"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
