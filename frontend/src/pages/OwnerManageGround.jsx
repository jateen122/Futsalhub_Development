import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── time helpers ───────────────────────────────────────────── */
const toBackendTime = ({ hour, ampm }) => {
  if (!hour) return "";
  let h = parseInt(hour, 10);
  if (ampm === "AM" && h === 12) h = 0;
  if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:00`;
};

const fromBackendTime = (val) => {
  if (!val) return { hour: "", ampm: "AM" };
  const h    = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? "12" : String(h % 12);
  return { hour, ampm };
};

const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "—");

/* ─── validation ─────────────────────────────────────────────── */
const validate = (form) => {
  const e = {};
  if (!form.name.trim())        e.name          = "Ground name is required.";
  if (!form.location.trim())    e.location       = "Location is required.";
  if (!form.description.trim()) e.description   = "Description is required.";
  if (!form.facilities.trim())  e.facilities    = "List at least one facility.";
  if (!form.opening_time.hour)  e.opening_time  = "Select opening time.";
  if (!form.closing_time.hour)  e.closing_time  = "Select closing time.";
  if (form.opening_time.hour && form.closing_time.hour) {
    const open  = toBackendTime(form.opening_time);
    const close = toBackendTime(form.closing_time);
    if (open >= close) e.closing_time = "Closing must be after opening.";
  }
  const price = parseFloat(form.price_per_hour);
  if (!form.price_per_hour || isNaN(price) || price <= 0)
    e.price_per_hour = "Enter a valid price greater than 0.";
  return e;
};

/* ─── TimePicker ─────────────────────────────────────────────── */
function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  return (
    <div className={`bg-[#0a1120] border-2 rounded-2xl p-5 transition-all duration-200
      ${error ? "border-red-500/50" : value.hour ? "border-emerald-500/40" : "border-white/8 hover:border-white/15"}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">{label}</p>
        {value.hour
          ? <span className="text-emerald-400 text-sm font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{toLabel(value)}</span>
          : <span className="text-white/20 text-xs">Not set</span>}
      </div>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {hours.map((h) => (
          <button key={h} type="button" onClick={() => onChange({ ...value, hour: h })}
            className={`h-11 rounded-xl text-sm font-bold transition-all duration-150
              ${value.hour === h
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white/5 text-white/40 hover:bg-white/12 hover:text-white hover:scale-105"}`}>
            {h}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {["AM","PM"].map((a) => (
          <button key={a} type="button" onClick={() => onChange({ ...value, ampm: a })}
            className={`py-3 rounded-xl text-sm font-black tracking-widest transition-all duration-150
              ${value.ampm === a
                ? a === "AM" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                             : "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"}`}>
            {a}
          </button>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mt-3 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/20
   focus:outline-none transition
   ${err ? "border-red-500/50" : "border-white/8 focus:border-emerald-500/40"}`;

/* ─── Delete Confirm Modal ───────────────────────────────────── */
function DeleteModal({ ground, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f1825] border border-red-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-4xl">
          🗑️
        </div>
        <h2 className="text-2xl font-black text-white text-center mb-2">Delete Ground?</h2>
        <p className="text-white/40 text-center text-sm mb-2">
          You are about to permanently delete:
        </p>
        <p className="text-white font-bold text-center text-lg mb-1">{ground.name}</p>
        <p className="text-white/30 text-center text-sm mb-8">📍 {ground.location}</p>

        <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 mb-6">
          <p className="text-red-400 text-sm text-center font-medium">
            ⚠ This action cannot be undone. All bookings for this ground will also be affected.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold hover:bg-white/10 transition">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-3.5 bg-red-500 text-white font-black rounded-xl hover:bg-red-400 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Deleting...</>
              : "🗑️ Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function OwnerManageGround() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [grounds,     setGrounds]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editingId,   setEditingId]   = useState(null); // which ground is being edited
  const [deleteTarget,setDeleteTarget]= useState(null); // ground to confirm delete
  const [deleting,    setDeleting]    = useState(false);
  const [form,        setForm]        = useState({});
  const [errors,      setErrors]      = useState({});
  const [preview,     setPreview]     = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [toast,       setToast]       = useState("");

  const fileRef = useRef(null);

  /* ── fetch ──────────────────────────────────────────────────── */
  const fetchGrounds = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/my/`, {
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

  /* ── show toast ─────────────────────────────────────────────── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  /* ── open edit form ─────────────────────────────────────────── */
  const openEdit = (g) => {
    setEditingId(g.id);
    setForm({
      name:           g.name          || "",
      location:       g.location      || "",
      description:    g.description   || "",
      facilities:     g.facilities    || "",
      opening_time:   fromBackendTime(g.opening_time?.slice(0,5)),
      closing_time:   fromBackendTime(g.closing_time?.slice(0,5)),
      price_per_hour: g.price_per_hour || "",
      image:          null,
    });
    const img = g.image ? (g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`) : null;
    setPreview(img);
    setErrors({});
  };

  const closeEdit = () => { setEditingId(null); setErrors({}); setPreview(null); };

  /* ── field handlers ─────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(e2 => ({ ...e2, [name]: "" }));
  };

  const setTime = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e2 => ({ ...e2, [field]: "" }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  /* ── update ─────────────────────────────────────────────────── */
  const handleUpdate = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);

    const fd = new FormData();
    fd.append("name",           form.name);
    fd.append("location",       form.location);
    fd.append("description",    form.description);
    fd.append("facilities",     form.facilities);
    fd.append("opening_time",   toBackendTime(form.opening_time));
    fd.append("closing_time",   toBackendTime(form.closing_time));
    fd.append("price_per_hour", form.price_per_hour);
    if (form.image) fd.append("image", form.image);

    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${editingId}/update/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Ground updated successfully! ✅");
        closeEdit();
        fetchGrounds();
      } else {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error. Please try again." }); }
    finally  { setSubmitting(false); }
  };

  /* ── delete ─────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/grounds/${deleteTarget.id}/delete/`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setGrounds(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Ground deleted successfully.");
    } catch { showToast("Failed to delete. Please try again."); }
    finally  { setDeleting(false); }
  };

  /* ── loading ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── no grounds ──────────────────────────────────────────────── */
  if (grounds.length === 0) {
    return (
      <div className="min-h-screen bg-[#080d18] pt-24 px-4 pb-16 flex flex-col items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-6xl mb-4">🏟️</p>
          <h2 className="text-2xl font-black text-white mb-2">No Grounds Yet</h2>
          <p className="text-white/40 text-sm mb-8">You haven't listed any grounds. Add your first one to get started.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-3.5 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">
            + Add Ground
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     MAIN UI
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#080d18] pt-24 px-4 pb-24">

      {/* bg effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/3 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.013]"
          style={{
            backgroundImage:"linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize:"48px 48px",
          }}
        />
      </div>

      {/* toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#0f1825] border border-emerald-500/30 text-emerald-400 px-6 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-pulse">
          {toast}
        </div>
      )}

      {/* delete modal */}
      {deleteTarget && (
        <DeleteModal
          ground={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      <div className="relative max-w-4xl mx-auto">

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <button onClick={() => navigate("/owner-dashboard")}
              className="text-white/30 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition">
              ← Dashboard
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-2xl">
                🏟️
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Manage Grounds</h1>
                <p className="text-white/35 text-sm mt-0.5">Edit or remove your listed grounds</p>
              </div>
            </div>
          </div>

          <button onClick={() => navigate("/add-ground")}
            className="px-5 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition flex items-center gap-2">
            + Add Ground
          </button>
        </div>

        {/* ── GROUND CARDS ────────────────────────────────────── */}
        <div className="space-y-5">
          {grounds.map((g) => {
            const imgSrc = g.image
              ? g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`
              : null;
            const isEditing = editingId === g.id;

            return (
              <div key={g.id} className={`bg-[#0f1825] border rounded-3xl overflow-hidden transition-all duration-300
                ${isEditing ? "border-emerald-500/30 shadow-xl shadow-emerald-500/5" : "border-white/8 hover:border-white/15"}`}>

                {/* ── GROUND SUMMARY ROW ───────────────────── */}
                {!isEditing && (
                  <div className="flex items-center gap-5 p-5">

                    {/* thumbnail */}
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/8">
                      {imgSrc
                        ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">⚽</div>}
                    </div>

                    {/* info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-white font-black text-xl truncate">{g.name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0
                          ${g.is_approved
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                            : "bg-amber-400/10 border-amber-400/25 text-amber-400"}`}>
                          {g.is_approved ? "✓ Approved" : "⏳ Pending"}
                        </span>
                      </div>
                      <p className="text-white/45 text-sm mb-2">📍 {g.location}</p>
                      <div className="flex items-center gap-4 text-xs text-white/30">
                        <span>💰 Rs {g.price_per_hour}/hr</span>
                        <span>🕐 {toLabel(fromBackendTime(g.opening_time?.slice(0,5)))} – {toLabel(fromBackendTime(g.closing_time?.slice(0,5)))}</span>
                      </div>
                    </div>

                    {/* action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(g)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/22 transition">
                        ✏️ Edit
                      </button>
                      <button onClick={() => setDeleteTarget(g)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition">
                        🗑️ Delete
                      </button>
                    </div>

                  </div>
                )}

                {/* ── EDIT FORM (inline, expands) ───────────── */}
                {isEditing && (
                  <form onSubmit={handleUpdate} noValidate>

                    {/* edit header */}
                    <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-white/8">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg">
                          ✏️
                        </div>
                        <div>
                          <p className="text-white font-black text-lg">{g.name}</p>
                          <p className="text-white/30 text-xs">Editing ground details</p>
                        </div>
                      </div>
                      <button type="button" onClick={closeEdit}
                        className="w-8 h-8 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition flex items-center justify-center text-sm">
                        ✕
                      </button>
                    </div>

                    <div className="px-7 py-6 space-y-6">

                      {errors.api && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                          ⚠ {errors.api}
                        </div>
                      )}

                      {/* row 1 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Ground Name *" error={errors.name}>
                          <input name="name" value={form.name} onChange={handleChange}
                            placeholder="Ground name" className={inputCls(errors.name)} />
                        </Field>
                        <Field label="Location *" error={errors.location}>
                          <input name="location" value={form.location} onChange={handleChange}
                            placeholder="City, Area" className={inputCls(errors.location)} />
                        </Field>
                      </div>

                      {/* description */}
                      <Field label="Description *" error={errors.description}>
                        <textarea name="description" value={form.description} onChange={handleChange}
                          rows={3} placeholder="Describe your ground..."
                          className={`${inputCls(errors.description)} resize-none`} />
                      </Field>

                      {/* facilities */}
                      <Field label="Facilities *" error={errors.facilities}>
                        <input name="facilities" value={form.facilities} onChange={handleChange}
                          placeholder="Parking, Shower, WiFi..." className={inputCls(errors.facilities)} />
                      </Field>

                      {/* time pickers */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-4 h-px bg-white/15" /> Operating Hours
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <TimePicker label="Opening Time"
                            value={form.opening_time}
                            onChange={(v) => setTime("opening_time", v)}
                            error={errors.opening_time} />
                          <TimePicker label="Closing Time"
                            value={form.closing_time}
                            onChange={(v) => setTime("closing_time", v)}
                            error={errors.closing_time} />
                        </div>
                        {form.opening_time?.hour && form.closing_time?.hour && (
                          <div className="mt-3 bg-emerald-500/8 border border-emerald-500/15 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                            <span className="text-emerald-400">🕐</span>
                            <span className="text-emerald-300/70">
                              Open <strong className="text-emerald-300">{toLabel(form.opening_time)}</strong>
                              {" – "}
                              <strong className="text-emerald-300">{toLabel(form.closing_time)}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* price */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-4 h-px bg-white/15" /> Pricing
                        </p>
                        <Field label="Price per Hour (Rs) *" error={errors.price_per_hour}>
                          <div className={`flex items-center bg-white/5 border rounded-2xl overflow-hidden transition
                            ${errors.price_per_hour ? "border-red-500/50" : "border-white/8 focus-within:border-emerald-500/40"}`}>
                            <span className="pl-5 pr-3 text-white/30 font-bold text-lg select-none">Rs</span>
                            <input type="number" name="price_per_hour" value={form.price_per_hour}
                              onChange={handleChange} min="1" placeholder="e.g. 1200"
                              className="flex-1 bg-transparent py-4 pr-4 text-white text-2xl font-black placeholder-white/15 focus:outline-none" />
                            <span className="pr-5 text-white/20 text-sm select-none">/ hr</span>
                          </div>
                        </Field>
                      </div>

                      {/* image */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-4 h-px bg-white/15" /> Ground Image
                        </p>
                        <div className="flex items-start gap-4">
                          {/* current/preview */}
                          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 bg-white/5">
                            {preview
                              ? <img src={preview} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-4xl">⚽</div>}
                          </div>
                          {/* upload area */}
                          <div className="flex-1">
                            <button type="button" onClick={() => fileRef.current?.click()}
                              className="w-full h-32 rounded-2xl border-2 border-dashed border-white/12 bg-white/2 hover:border-emerald-500/40 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2 transition-all duration-200">
                              <span className="text-3xl text-white/15">📷</span>
                              <span className="text-white/30 text-xs font-semibold">Click to change image</span>
                              <span className="text-white/15 text-xs">JPG, PNG supported</span>
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                            {form.image && (
                              <p className="text-emerald-400 text-xs mt-2 font-semibold">
                                ✓ New image selected: {form.image.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="flex gap-3 pt-2 border-t border-white/8">
                        <button type="button" onClick={closeEdit}
                          className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/55 rounded-xl font-bold hover:bg-white/10 transition">
                          Cancel
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(g)}
                          className="px-6 py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition">
                          🗑️ Delete
                        </button>
                        <button type="submit" disabled={submitting}
                          className="flex-1 py-3.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                          {submitting
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving...</>
                            : "✅ Save Changes"}
                        </button>
                      </div>

                    </div>
                  </form>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

