import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

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
const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "");

const validate = (form) => {
  const e = {};
  if (!form.name.trim())        e.name         = "Required.";
  if (!form.location.trim())    e.location      = "Required.";
  if (!form.description.trim()) e.description  = "Required.";
  if (!form.facilities.trim())  e.facilities   = "Required.";
  if (!form.opening_time.hour)  e.opening_time = "Select time.";
  if (!form.closing_time.hour)  e.closing_time = "Select time.";
  if (form.opening_time.hour && form.closing_time.hour) {
    const o = toBackendTime(form.opening_time);
    const c = toBackendTime(form.closing_time);
    if (o >= c) e.closing_time = "Must be after opening.";
  }
  const price = parseFloat(form.price_per_hour);
  if (!form.price_per_hour || isNaN(price) || price <= 0) e.price_per_hour = "Enter valid price.";
  if (!form.ground_size) e.ground_size = "Select size.";
  if (!form.ground_type) e.ground_type = "Select type.";
  return e;
};

function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className={`bg-white border rounded-lg transition-all
        ${error ? "border-red-400 ring-1 ring-red-200" : value.hour ? "border-green-500 ring-1 ring-green-200" : "border-gray-300 hover:border-gray-400"}`}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hour</span>
          {value.hour
            ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200">✓ {toLabel(value)}</span>
            : <span className="text-xs text-gray-400 italic">Not set</span>}
        </div>
        <div className="grid grid-cols-6 gap-1.5 p-3 border-b border-gray-100">
          {hours.map(h => (
            <button key={h} type="button" onClick={() => onChange({ ...value, hour: h })}
              className={`h-9 rounded text-xs font-bold transition-all border
                ${value.hour === h
                  ? "bg-green-500 text-white border-green-500"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-400 hover:text-green-700"}`}>
              {h}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-2.5">
          {["AM","PM"].map(a => (
            <button key={a} type="button" onClick={() => onChange({ ...value, ampm: a })}
              className={`py-2 rounded text-xs font-black tracking-widest transition-all border
                ${value.ampm === a
                  ? a === "AM" ? "bg-sky-500 text-white border-sky-500"
                               : "bg-orange-500 text-white border-orange-500"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">⚠ {error}</p>}
    </div>
  );
}

function FieldLabel({ label, hint, required }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-sm font-bold text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

const iCls = (err) =>
  `w-full rounded-lg px-4 py-3 text-sm font-medium text-gray-800 bg-white border
   placeholder-gray-400 focus:outline-none transition-all
   ${err ? "border-red-400 ring-1 ring-red-200" : "border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-200"}`;

function DeleteModal({ ground, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-3xl">🗑️</div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-2">Delete Ground?</h2>
        <p className="text-gray-500 text-center text-sm mb-1">Permanently removing:</p>
        <p className="text-gray-900 font-black text-center text-lg mb-1">{ground.name}</p>
        <p className="text-gray-400 text-center text-sm mb-5">📍 {ground.location}</p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
          <p className="text-red-600 text-sm text-center font-medium">⚠ This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-3 bg-red-500 text-white font-black rounded-lg hover:bg-red-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
            {deleting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</> : "🗑️ Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerManageGround() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [grounds,      setGrounds]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [form,         setForm]         = useState({});
  const [errors,       setErrors]       = useState({});
  const [newPreview,   setNewPreview]   = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [toast,        setToast]        = useState("");
  const fileRef = useRef(null);

  const fetchGrounds = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGrounds(data.results || data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchGrounds();
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const openEdit = (g) => {
    setEditingId(g.id);
    setForm({
      name:           g.name            || "",
      location:       g.location        || "",
      description:    g.description     || "",
      facilities:     g.facilities      || "",
      opening_time:   fromBackendTime(g.opening_time?.slice(0, 5)),
      closing_time:   fromBackendTime(g.closing_time?.slice(0, 5)),
      price_per_hour: g.price_per_hour  || "",
      ground_size:    g.ground_size     || "",
      ground_type:    g.ground_type     || "",
    });
    setNewPreview(null); setNewImageFile(null); setErrors({});
  };

  const closeEdit = () => { setEditingId(null); setErrors({}); setNewPreview(null); setNewImageFile(null); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(ex => ({ ...ex, [name]: "" }));
  };

  const setTime = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(ex => ({ ...ex, [field]: "" }));
  };

  const setChoice = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(ex => ({ ...ex, [field]: "" }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewImageFile(file);
    setNewPreview(URL.createObjectURL(file));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    const fd = new FormData();
    ["name","location","description","facilities","ground_size","ground_type","price_per_hour"]
      .forEach(k => fd.append(k, form[k]));
    fd.append("opening_time", toBackendTime(form.opening_time));
    fd.append("closing_time", toBackendTime(form.closing_time));
    if (newImageFile) fd.append("image", newImageFile);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${editingId}/update/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (res.ok) { showToast("Ground updated successfully! ✅"); closeEdit(); fetchGrounds(); }
      else {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error." }); }
    finally  { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/grounds/${deleteTarget.id}/delete/`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setGrounds(prev => prev.filter(g => g.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) closeEdit();
      showToast("Ground deleted.");
    } catch { showToast("Delete failed."); }
    finally  { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (grounds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-4xl mx-auto mb-5">🏟️</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">No Grounds Yet</h2>
          <p className="text-gray-500 text-sm mb-6">Add your first ground to start receiving bookings.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition shadow-sm">
            + Add Your First Ground
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white border border-green-200 text-green-700 px-6 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          ✅ {toast}
        </div>
      )}
      {deleteTarget && (
        <DeleteModal ground={deleteTarget} onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} deleting={deleting} />
      )}

      {/* top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">← Dashboard</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">Manage Grounds</span>
          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded border border-gray-200">
            {grounds.length} ground{grounds.length > 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={() => navigate("/add-ground")}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition shadow-sm">
          + Add Ground
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
        {grounds.map((g) => {
          const imgSrc    = g.image ? (g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`) : null;
          const isEditing = editingId === g.id;

          return (
            <div key={g.id}
              className={`bg-white rounded-xl overflow-hidden transition-all duration-300 shadow-sm
                ${isEditing ? "border-2 border-green-400 shadow-md" : "border border-gray-200 hover:border-gray-300 hover:shadow-md"}`}>

              {/* ── SUMMARY ROW ─── */}
              {!isEditing && (
                <div className="flex items-center gap-5 p-5">
                  <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                    {imgSrc ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-4xl">⚽</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="text-gray-900 font-black text-xl truncate">{g.name}</h3>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold border flex-shrink-0
                        ${g.is_approved ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                        {g.is_approved ? "✓ Approved" : "⏳ Pending"}
                      </span>
                      {g.ground_size && (
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded">
                          {g.ground_size}v{g.ground_size}
                        </span>
                      )}
                      {g.ground_type && (
                        <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded capitalize">
                          {g.ground_type}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-2">📍 {g.location}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="text-gray-600 font-semibold bg-gray-100 px-2.5 py-1 rounded border border-gray-200">
                        💰 Rs {g.price_per_hour}/hr
                      </span>
                      <span className="text-gray-500">
                        🕐 {toLabel(fromBackendTime(g.opening_time?.slice(0,5)))} – {toLabel(fromBackendTime(g.closing_time?.slice(0,5)))}
                      </span>
                      {g.facilities && (
                        <span className="text-gray-400 truncate max-w-xs">🛠 {g.facilities}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(g)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-bold hover:bg-green-100 transition">
                      ✏️ Edit
                    </button>
                    <button onClick={() => setDeleteTarget(g)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}

              {/* ── EDIT FORM ─── */}
              {isEditing && (
                <form onSubmit={handleUpdate} noValidate>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center text-lg">✏️</div>
                      <div>
                        <p className="text-gray-900 font-black">Editing: {g.name}</p>
                        <p className="text-gray-500 text-xs">Unchanged fields keep their current values</p>
                      </div>
                    </div>
                    <button type="button" onClick={closeEdit}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 transition flex items-center justify-center text-sm font-bold shadow-sm">✕</button>
                  </div>

                  <div className="p-6">
                    {errors.api && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm mb-4">⚠ {errors.api}</div>
                    )}

                    <div className="grid grid-cols-12 gap-6">

                      {/* LEFT — text fields */}
                      <div className="col-span-12 lg:col-span-7 space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <FieldLabel label="Ground Name" required />
                            <input name="name" value={form.name} onChange={handleChange}
                              placeholder={g.name} className={iCls(errors.name)} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">⚠ {errors.name}</p>}
                          </div>
                          <div>
                            <FieldLabel label="Location" required />
                            <input name="location" value={form.location} onChange={handleChange}
                              placeholder={g.location} className={iCls(errors.location)} />
                            {errors.location && <p className="text-red-500 text-xs mt-1">⚠ {errors.location}</p>}
                          </div>
                        </div>

                        <div>
                          <FieldLabel label="Description" required />
                          <textarea name="description" value={form.description} onChange={handleChange}
                            rows={3} placeholder={g.description || "Describe your ground..."}
                            className={`${iCls(errors.description)} resize-none`} />
                          {errors.description && <p className="text-red-500 text-xs mt-1">⚠ {errors.description}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <FieldLabel label="Facilities" hint="comma separated" required />
                            <input name="facilities" value={form.facilities} onChange={handleChange}
                              placeholder={g.facilities || "Parking, Shower..."} className={iCls(errors.facilities)} />
                            {errors.facilities && <p className="text-red-500 text-xs mt-1">⚠ {errors.facilities}</p>}
                          </div>
                          <div>
                            <FieldLabel label="Price per Hour (Rs)" required />
                            <div className={`flex items-center border rounded-lg overflow-hidden transition-all
                              ${errors.price_per_hour ? "border-red-400 ring-1 ring-red-200"
                                : "border-gray-300 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-200 hover:border-gray-400"}`}>
                              <span className="px-3 py-3 text-gray-500 font-bold text-sm bg-gray-50 border-r border-gray-200 select-none">Rs</span>
                              <input type="number" name="price_per_hour" value={form.price_per_hour}
                                onChange={handleChange} min="1"
                                placeholder={String(g.price_per_hour || "1200")}
                                className="flex-1 bg-white py-3 px-3 text-gray-800 font-bold placeholder-gray-400 focus:outline-none text-sm" />
                              <span className="px-3 text-gray-400 text-xs bg-gray-50 border-l border-gray-200 py-3 select-none">/hr</span>
                            </div>
                            {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.price_per_hour}</p>}
                          </div>
                        </div>

                        {/* Ground Size + Type */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <FieldLabel label="Ground Size" required />
                            <div className="grid grid-cols-3 gap-2">
                              {[{ val:"5", label:"5v5" }, { val:"6", label:"6v6" }, { val:"7", label:"7v7" }].map(opt => (
                                <button key={opt.val} type="button"
                                  onClick={() => setChoice("ground_size", opt.val)}
                                  className={`py-2.5 rounded-lg border-2 text-center font-black text-sm transition-all
                                    ${form.ground_size === opt.val
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {errors.ground_size && <p className="text-red-500 text-xs mt-1">⚠ {errors.ground_size}</p>}
                          </div>
                          <div>
                            <FieldLabel label="Ground Type" required />
                            <div className="grid grid-cols-2 gap-2">
                              {[{ val:"indoor", label:"🏠 Indoor" }, { val:"outdoor", label:"☀️ Outdoor" }].map(opt => (
                                <button key={opt.val} type="button"
                                  onClick={() => setChoice("ground_type", opt.val)}
                                  className={`py-2.5 rounded-lg border-2 text-center font-bold text-sm transition-all
                                    ${form.ground_type === opt.val
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            {errors.ground_type && <p className="text-red-500 text-xs mt-1">⚠ {errors.ground_type}</p>}
                          </div>
                        </div>

                        {/* Time pickers */}
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-t border-gray-100 pt-3">Operating Hours</p>
                          <div className="grid grid-cols-2 gap-4">
                            <TimePicker label="Opening Time" value={form.opening_time}
                              onChange={v => setTime("opening_time", v)} error={errors.opening_time} />
                            <TimePicker label="Closing Time" value={form.closing_time}
                              onChange={v => setTime("closing_time", v)} error={errors.closing_time} />
                          </div>
                          {form.opening_time?.hour && form.closing_time?.hour && (
                            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                              <span>🕐</span>
                              <p className="text-green-700 font-semibold text-sm">
                                {toLabel(form.opening_time)} – {toLabel(form.closing_time)}
                              </p>
                              <span className="ml-auto text-green-500 font-bold">✓</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RIGHT — image */}
                      <div className="col-span-12 lg:col-span-5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ground Image</p>
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-1.5 font-medium">Current</p>
                          <div className="rounded-lg overflow-hidden border border-gray-200 h-36 bg-gray-100">
                            {imgSrc ? <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-4xl">⚽</div>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5 font-medium">
                            {newPreview ? "New Image ✓" : "Upload New (optional)"}
                          </p>
                          {newPreview ? (
                            <div className="relative group rounded-lg overflow-hidden border-2 border-green-400 h-36">
                              <img src={newPreview} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <button type="button"
                                  onClick={() => { setNewPreview(null); setNewImageFile(null); }}
                                  className="px-3 py-1.5 bg-white text-gray-700 text-xs rounded font-semibold shadow">Remove</button>
                              </div>
                              <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">New ✓</span>
                            </div>
                          ) : (
                            <button type="button" onClick={() => fileRef.current?.click()}
                              className="w-full h-36 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-1.5 transition-all">
                              <span className="text-2xl text-gray-300">📷</span>
                              <span className="text-gray-500 text-xs font-semibold">Click to upload</span>
                              <span className="text-gray-400 text-xs">Kept if empty</span>
                            </button>
                          )}
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                        </div>
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                      <button type="button" onClick={closeEdit}
                        className="flex-1 py-3 bg-white border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition text-sm">
                        Cancel
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(g)}
                        className="px-5 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-100 transition text-sm">
                        🗑️ Delete
                      </button>
                      <button type="submit" disabled={submitting}
                        className="flex-1 py-3 bg-green-500 text-white font-black rounded-lg hover:bg-green-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 shadow-sm">
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
  );
}
