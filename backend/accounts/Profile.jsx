import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const TABS = ["Profile", "Security", "Activity"];

/* ── small helpers ───────────────────────────────────────────── */
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const ROLE_STYLE = {
  player: "bg-sky-400/10 border-sky-400/30 text-sky-400",
  owner:  "bg-amber-400/10 border-amber-400/30 text-amber-400",
  admin:  "bg-violet-400/10 border-violet-400/30 text-violet-400",
};

const STATUS_DOT = {
  confirmed: "bg-emerald-400",
  pending:   "bg-amber-400",
  cancelled: "bg-red-400",
  refunded:  "bg-blue-400",
};

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, type }) {
  if (!msg) return null;
  const colours =
    type === "error"
      ? "bg-[#0f1825] border-red-500/40 text-red-400"
      : "bg-[#0f1825] border-emerald-500/40 text-emerald-400";
  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold border whitespace-nowrap ${colours}`}>
      {msg}
    </div>
  );
}

/* ── Avatar preview ──────────────────────────────────────────── */
function Avatar({ src, name, size = "w-24 h-24" }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        className={`${size} rounded-full object-cover border-4 border-white/10`}
      />
    );
  }
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-3xl border-4 border-white/10`}>
      {initial}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function Profile() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem("access");
  const fileRef   = useRef(null);

  /* ── state ───────────────────────────────────────────────── */
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("Profile");
  const [toast,      setToast]      = useState({ msg: "", type: "" });

  /* profile edit */
  const [form,       setForm]       = useState({ full_name: "", phone: "", city: "" });
  const [imageFile,  setImageFile]  = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving,     setSaving]     = useState(false);

  /* password change */
  const [pwForm,     setPwForm]     = useState({ old_password: "", new_password: "" });
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwErrors,   setPwErrors]   = useState({});

  /* activity */
  const [activity,   setActivity]   = useState(null);
  const [actLoading, setActLoading] = useState(false);

  /* ── fetch profile on mount ──────────────────────────────── */
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/accounts/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setForm({ full_name: d.full_name || "", phone: d.phone || "", city: d.city || "" });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── fetch activity when tab changes ─────────────────────── */
  useEffect(() => {
    if (tab !== "Activity" || activity) return;
    setActLoading(true);
    fetch(`${BASE_URL}/api/accounts/activity/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setActivity)
      .catch(console.error)
      .finally(() => setActLoading(false));
  }, [tab]);

  /* ── helpers ─────────────────────────────────────────────── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  const dashPath =
    profile?.role === "owner"
      ? "/owner-dashboard"
      : profile?.role === "admin"
      ? "/admin-dashboard"
      : "/player-dashboard";

  /* ── profile save ────────────────────────────────────────── */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData();
    fd.append("full_name", form.full_name);
    fd.append("phone",     form.phone);
    fd.append("city",      form.city);
    if (imageFile) fd.append("profile_image", imageFile);

    try {
      const res  = await fetch(`${BASE_URL}/api/accounts/profile/`, {
        method : "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body   : fd,
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.user || data);
        setImageFile(null);
        setImagePreview(null);
        showToast("Profile updated successfully.");
      } else {
        showToast(data?.detail || "Update failed.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── image pick ──────────────────────────────────────────── */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* ── password change ─────────────────────────────────────── */
  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwErrors({});
    if (!pwForm.old_password) { setPwErrors({ old_password: "Required." }); return; }
    if (!pwForm.new_password) { setPwErrors({ new_password: "Required." }); return; }
    setPwSaving(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/accounts/change-password/`, {
        method : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body   : JSON.stringify(pwForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Password changed. Please log in again.");
        setPwForm({ old_password: "", new_password: "" });
        setTimeout(() => { localStorage.clear(); navigate("/login"); }, 2000);
      } else {
        // map field errors
        const errs = {};
        if (data.old_password) errs.old_password = Array.isArray(data.old_password) ? data.old_password[0] : data.old_password;
        if (data.new_password) errs.new_password = Array.isArray(data.new_password) ? data.new_password[0] : data.new_password;
        if (data.non_field_errors) errs.general = data.non_field_errors[0];
        if (data.detail) errs.general = data.detail;
        if (!Object.keys(errs).length) errs.general = "Change failed.";
        setPwErrors(errs);
      }
    } catch {
      setPwErrors({ general: "Network error." });
    } finally {
      setPwSaving(false);
    }
  };

  /* ── forgot-password simulation ──────────────────────────── */
  const handleForgotPassword = async () => {
    if (!profile?.email) return;
    try {
      const res  = await fetch(`${BASE_URL}/api/accounts/forgot-password/`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      showToast(data.message || "Reset link sent.");
    } catch {
      showToast("Network error.", "error");
    }
  };

  /* ── loading screen ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avatarSrc = imagePreview
    ? imagePreview
    : profile?.profile_image
    ? profile.profile_image.startsWith("http")
      ? profile.profile_image
      : `${BASE_URL}${profile.profile_image}`
    : null;

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#080d18] pt-20 pb-16">

      {/* bg blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-amber-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-3xl" />
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      <div className="relative max-w-4xl mx-auto px-4">

        {/* ── breadcrumb ──────────────────────────────────── */}
        <div className="flex items-center gap-2 text-sm mb-8">
          <button onClick={() => navigate(dashPath)}
            className="text-white/30 hover:text-white transition">
            Dashboard
          </button>
          <span className="text-white/15">/</span>
          <span className="text-amber-400 font-semibold">Profile</span>
        </div>

        {/* ── hero card ────────────────────────────────────── */}
        <div className="bg-white/3 border border-white/8 rounded-3xl p-8 mb-6 flex items-center gap-6">
          {/* avatar + upload button */}
          <div className="relative flex-shrink-0">
            <Avatar src={avatarSrc} name={profile?.full_name} size="w-24 h-24" />
            <button
              onClick={() => fileRef.current?.click()}
              title="Change avatar"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs font-black shadow-lg hover:bg-amber-300 transition"
            >
              ✎
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white truncate">
              {profile?.full_name || "No name"}
            </h1>
            <p className="text-white/40 text-sm">{profile?.email}</p>
            {profile?.city && (
              <p className="text-white/30 text-xs mt-0.5">📍 {profile.city}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${ROLE_STYLE[profile?.role] || ROLE_STYLE.player}`}>
                {profile?.role}
              </span>
              {profile?.is_verified
                ? <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-400/10 border-emerald-400/30 text-emerald-400">✓ Verified</span>
                : <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-400/10 border-amber-400/30 text-amber-400">⏳ Pending</span>}
            </div>
          </div>

          {imageFile && (
            <div className="flex-shrink-0 text-right">
              <p className="text-amber-400 text-xs font-semibold mb-1">New avatar selected</p>
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-white/30 hover:text-white text-xs">Remove</button>
            </div>
          )}
        </div>

        {/* ── tab bar ──────────────────────────────────────── */}
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-2xl p-1.5 mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                ${tab === t ? "bg-amber-400 text-black shadow" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB: Profile
        ══════════════════════════════════════════════════ */}
        {tab === "Profile" && (
          <form onSubmit={handleProfileSave}
            className="bg-white/3 border border-white/8 rounded-3xl p-8 space-y-6">
            <h2 className="text-white font-black text-lg">Edit Profile</h2>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Full name */}
              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Your phone number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition text-sm"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Kathmandu"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition text-sm"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Email (read-only)</label>
                <input
                  value={profile?.email || ""}
                  readOnly
                  className="w-full bg-white/3 border border-white/5 rounded-xl px-4 py-3 text-white/30 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            {/* Avatar preview row */}
            {imagePreview && (
              <div className="flex items-center gap-4 bg-amber-400/8 border border-amber-400/20 rounded-xl p-4">
                <img src={imagePreview} alt="preview" className="w-14 h-14 rounded-full object-cover border-2 border-amber-400/50" />
                <div>
                  <p className="text-amber-400 font-semibold text-sm">New avatar ready to save</p>
                  <p className="text-amber-400/50 text-xs">Click "Save Changes" to apply it.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/8">
              <button type="submit" disabled={saving}
                className="px-8 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition disabled:opacity-50 flex items-center gap-2 text-sm">
                {saving
                  ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Saving…</>
                  : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: Security
        ══════════════════════════════════════════════════ */}
        {tab === "Security" && (
          <div className="space-y-5">

            {/* Change password */}
            <form onSubmit={handlePwChange}
              className="bg-white/3 border border-white/8 rounded-3xl p-8 space-y-5">
              <h2 className="text-white font-black text-lg">Change Password</h2>

              {pwErrors.general && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                  {pwErrors.general}
                </div>
              )}

              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">Current Password</label>
                <input
                  type="password"
                  value={pwForm.old_password}
                  onChange={(e) => setPwForm((f) => ({ ...f, old_password: e.target.value }))}
                  placeholder="Enter your current password"
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition text-sm
                    ${pwErrors.old_password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-amber-400/50"}`}
                />
                {pwErrors.old_password && <p className="text-red-400 text-xs mt-1">{pwErrors.old_password}</p>}
              </div>

              <div>
                <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">New Password</label>
                <input
                  type="password"
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                  placeholder="Enter your new password"
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition text-sm
                    ${pwErrors.new_password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-amber-400/50"}`}
                />
                {pwErrors.new_password && <p className="text-red-400 text-xs mt-1">{pwErrors.new_password}</p>}
                <p className="text-white/20 text-xs mt-1.5">Min 8 chars. Cannot be too similar to your email.</p>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/8">
                <button type="submit" disabled={pwSaving}
                  className="px-8 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition disabled:opacity-50 flex items-center gap-2 text-sm">
                  {pwSaving
                    ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Changing…</>
                    : "Change Password"}
                </button>
              </div>
            </form>

            {/* Forgot password (simulated) */}
            <div className="bg-white/3 border border-white/8 rounded-3xl p-8">
              <h2 className="text-white font-black text-lg mb-1">Forgot Password?</h2>
              <p className="text-white/40 text-sm mb-5">
                We'll simulate sending a reset link to <span className="text-white/60 font-semibold">{profile?.email}</span>.
              </p>
              <button onClick={handleForgotPassword}
                className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 hover:text-white transition">
                Send Reset Link
              </button>
            </div>

            {/* Account info */}
            <div className="bg-white/3 border border-white/8 rounded-3xl p-8">
              <h2 className="text-white font-black text-lg mb-4">Account Info</h2>
              <div className="space-y-3 text-sm">
                {[
                  ["Member since", profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                    : "—"],
                  ["Role",        profile?.role || "—"],
                  ["Verified",    profile?.is_verified ? "Yes" : "No"],
                  ["Active",      profile?.is_active ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <span className="text-white/30">{k}</span>
                    <span className="text-white/70 font-semibold capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: Activity
        ══════════════════════════════════════════════════ */}
        {tab === "Activity" && (
          <div>
            {actLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !activity ? (
              <div className="text-center py-20 text-white/40">Could not load activity.</div>
            ) : (
              <div className="space-y-5">

                {/* stat cards */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Total Bookings", value: activity.total_bookings, color: "text-white"       },
                    { label: "Total Spent",    value: `Rs ${parseFloat(activity.total_spent).toFixed(0)}`, color: "text-amber-400"   },
                    { label: "Last Booking",   value: activity.last_booking ? activity.last_booking.date : "—", color: "text-emerald-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 text-center">
                      <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-white/30 text-xs mt-1.5 uppercase tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* last booking detail */}
                {activity.last_booking ? (
                  <div className="bg-white/3 border border-white/8 rounded-3xl p-8">
                    <h2 className="text-white font-black text-lg mb-5">Most Recent Booking</h2>
                    <div className="space-y-3 text-sm">
                      {[
                        ["Ground",      activity.last_booking.ground_name],
                        ["Date",        activity.last_booking.date],
                        ["Time",        `${fmt12(activity.last_booking.start_time)} – ${fmt12(activity.last_booking.end_time)}`],
                        ["Amount",      `Rs ${activity.last_booking.total_price}`],
                        ["Status",      activity.last_booking.status],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                          <span className="text-white/30">{k}</span>
                          <span className={`font-semibold capitalize
                            ${k === "Status"
                              ? `${STATUS_DOT[v]?.replace("bg-", "text-") || "text-white/60"}`
                              : k === "Amount"
                              ? "text-amber-400"
                              : "text-white/70"}`}>
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/3 border border-white/8 rounded-3xl p-10 text-center">
                    <p className="text-4xl mb-3">🏟️</p>
                    <p className="text-white/40">No bookings yet. Go book a futsal ground!</p>
                    <button onClick={() => navigate("/grounds")}
                      className="mt-5 px-6 py-2.5 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition text-sm">
                      Browse Grounds
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
