import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
  User,
  Home,
  Sun,
  CheckCircle,
  X,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (val) => {
  if (!val) return "—";
  const h = parseInt(val.split(":")[0], 10);
  return `${h % 12 || 12}:00 ${h >= 12 ? "PM" : "AM"}`;
};

export default function AdminGroundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/grounds/admin/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setGround)
      .catch(() => navigate("/admin/grounds"))
      .finally(() => setLoading(false));
  }, [id, token, navigate]);

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
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center pt-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading ground details...</p>
        </div>
      </div>
    );
  }

  if (!ground && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={40} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Ground Not Found
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            The ground you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate("/admin/grounds")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition text-sm"
          >
            <ArrowLeft size={16} /> Back to Approvals
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-10 lg:px-14 xl:px-20 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/grounds")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {ground?.name}
          </h1>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Image Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
              {/* Image */}
              <div className="relative h-64 bg-gray-100">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={ground.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center">
                    <Building2 size={64} className="text-amber-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {ground.name}
                  </h2>
                  <p className="text-gray-600 text-sm flex items-center gap-1">
                    <MapPin size={16} />
                    {ground.location}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
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
                    <span className="px-3 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold">
                      {ground.ground_size}v{ground.ground_size}
                    </span>
                  )}
                  {ground.ground_type && (
                    <span className="px-3 py-1 bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold capitalize flex items-center gap-1">
                      {ground.ground_type === "indoor" ? (
                        <Home size={12} />
                      ) : (
                        <Sun size={12} />
                      )}
                      {ground.ground_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Ground Details Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Ground Information
              </p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Opens", toLabel(ground.opening_time?.slice(0, 5)), Clock],
                  ["Closes", toLabel(ground.closing_time?.slice(0, 5)), Clock],
                  ["Price / hr", `Rs ${ground.price_per_hour}`, DollarSign],
                  ["Owner", ground.owner || "—", User],
                  [
                    "Size",
                    ground.ground_size ? `${ground.ground_size}-a-side` : "—",
                    Building2,
                  ],
                  [
                    "Type",
                    ground.ground_type
                      ? ground.ground_type.charAt(0).toUpperCase() +
                        ground.ground_type.slice(1)
                      : "—",
                    ground.ground_type === "indoor" ? Home : Sun,
                  ],
                ].map(([label, value, Icon]) => (
                  <div
                    key={label}
                    className="bg-gray-50 border border-gray-100 rounded-xl p-3"
                  >
                    <p className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                      <Icon size={14} /> {label}
                    </p>
                    <p className="text-gray-800 font-semibold text-sm">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {ground.description && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {ground.description}
                  </p>
                </div>
              )}

              {facilitiesList.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Facilities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {facilitiesList.map((f) => (
                      <span
                        key={f}
                        className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium capitalize"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Admin Actions
              </p>

              {!ground.is_approved ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 font-semibold text-sm">
                      Pending Review
                    </p>
                    <p className="text-amber-600/70 text-xs mt-1">
                      Approve to make this ground visible to players on the
                      platform.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleApproval(false)}
                      disabled={approving}
                      className="py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                      {approving ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <X size={16} /> Reject
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleApproval(true)}
                      disabled={approving}
                      className="py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      {approving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle size={16} /> Approve
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-emerald-800 font-semibold text-sm flex items-center gap-2">
                      <CheckCircle size={16} /> Ground is Live
                    </p>
                    <p className="text-emerald-600/70 text-xs mt-1">
                      Visible to all players on the platform.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApproval(false)}
                    disabled={approving}
                    className="w-full py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-100 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {approving ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <X size={16} /> Revoke Approval
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Meta Info */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Metadata
              </p>
              <div className="space-y-3 text-sm">
                {[
                  ["Ground ID", `#${ground.id}`],
                  ["Status", ground.is_approved ? "Approved" : "Pending"],
                  [
                    "Created On",
                    ground.created_at
                      ? new Date(ground.created_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "—",
                  ],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between pb-2 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <span className="text-gray-500">{k}</span>
                    <span
                      className={`font-semibold ${
                        v === "Approved"
                          ? "text-emerald-600"
                          : v === "Pending"
                            ? "text-amber-600"
                            : "text-gray-700"
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/admin/grounds")}
                className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> All Grounds
              </button>
              <button
                onClick={() => navigate("/admin-dashboard")}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition text-sm"
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
