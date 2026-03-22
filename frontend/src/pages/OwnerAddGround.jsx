import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LocationPicker from "../components/LocationPicker";

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
const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "");

/* ─── validate ───────────────────────────────────────────────── */
const validate = (form, isEdit) => {
  const e = {};
  if (!form.name.trim())        e.name          = "Ground name is required.";
  if (!form.location.trim())    e.location       = "Location is required.";
  if (!form.description.trim()) e.description   = "Description is required.";
  if (!form.facilities.trim())  e.facilities    = "List at least one facility.";
  if (!form.opening_time.hour)  e.opening_time  = "Select opening time.";
  if (!form.closing_time.hour)  e.closing_time  = "Select closing time.";
  if (form.opening_time.hour && form.closing_time.hour) {
    const o = toBackendTime(form.opening_time);
    const c = toBackendTime(form.closing_time);
    if (o >= c) e.closing_time = "Must be after opening time.";
  }
  const price = parseFloat(form.price_per_hour);
  if (!form.price_per_hour || isNaN(price) || price <= 0)
    e.price_per_hour = "Enter a valid price greater than 0.";
  if (!form.ground_size) e.ground_size = "Select ground size.";
  if (!form.ground_type) e.ground_type = "Select ground type.";
  if (!isEdit && form.newImages.length === 0)
    e.images = "Upload at least one image.";
  return e;
};

const INIT = {
  name: "", location: "", description: "", facilities: "",
  opening_time: { hour: "", ampm: "AM" },
  closing_time:  { hour: "", ampm: "PM" },
  price_per_hour: "",
  ground_size: "",
  ground_type: "",
  lat: null,
  lng: null,
  newImages: [],
};

/* ─── TimePicker ─────────────────────────────────────────────── */
function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className={`bg-white border rounded-lg transition-all
        ${error ? "border-red-400 ring-1 ring-red-200" : value.hour ? "border-green-500 ring-1 ring-green-200" : "border-gray-300 hover:border-gray-400"}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Hour</span>
          {value.hour
            ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded border border-green-200">✓ {toLabel(value)}</span>
            : <span className="text-xs text-gray-400 italic">Not selected</span>}
        </div>
        <div className="grid grid-cols-6 gap-1.5 p-3 border-b border-gray-100">
          {hours.map(h => (
            <button key={h} type="button" onClick={() => onChange({ ...value, hour: h })}
              className={`h-10 rounded text-sm font-bold transition-all border
                ${value.hour === h
                  ? "bg-green-500 text-white border-green-500 shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-green-50 hover:border-green-400 hover:text-green-700"}`}>
              {h}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {["AM","PM"].map(a => (
            <button key={a} type="button" onClick={() => onChange({ ...value, ampm: a })}
              className={`py-2.5 rounded text-sm font-black tracking-widest transition-all border
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

function FieldLabel({ label, required, hint }) {
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

function SidebarStep({ step, title, subtitle, done }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5
        ${done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
        {done ? "✓" : step}
      </div>
      <div>
        <p className={`text-sm font-bold ${done ? "text-gray-700" : "text-gray-400"}`}>{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function OwnerAddGround() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [form,          setForm]          = useState(INIT);
  const [errors,        setErrors]        = useState({});
  const [newPreviews,   setNewPreviews]   = useState([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState("");
  const [apiError,      setApiError]      = useState("");
  const [myGround,      setMyGround]      = useState(null);
  const [editMode,      setEditMode]      = useState(false);
  const [loadingGround, setLoadingGround] = useState(true);
  const fileRef = useRef(null);

  /* ── fetch existing ground ─────────────────────────────────── */
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { const l = d.results || d || []; if (l.length > 0) setMyGround(l[0]); })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, []);

  const enableEdit = () => {
    if (!myGround) return;
    setForm({
      name:           myGround.name          || "",
      location:       myGround.location      || "",
      description:    myGround.description   || "",
      facilities:     myGround.facilities    || "",
      opening_time:   fromBackendTime(myGround.opening_time?.slice(0, 5)),
      closing_time:   fromBackendTime(myGround.closing_time?.slice(0, 5)),
      price_per_hour: myGround.price_per_hour || "",
      ground_size:    myGround.ground_size    || "",
      ground_type:    myGround.ground_type    || "",
      lat:            myGround.latitude  != null ? parseFloat(myGround.latitude)  : null,
      lng:            myGround.longitude != null ? parseFloat(myGround.longitude) : null,
      newImages:      [],
    });
    setNewPreviews([]); setErrors({}); setSuccess(""); setApiError(""); setEditMode(true);
  };

  /* ── field handlers ────────────────────────────────────────── */
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

  const handleImages = (e) => {
    const files  = Array.from(e.target.files);
    const merged = [...form.newImages, ...files].slice(0, 3);
    setForm(f => ({ ...f, newImages: merged }));
    setNewPreviews(merged.map(f2 => URL.createObjectURL(f2)));
    if (errors.images) setErrors(ex => ({ ...ex, images: "" }));
  };

  const removeNewImage = (idx) => {
    const imgs = form.newImages.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, newImages: imgs }));
    setNewPreviews(imgs.map(f2 => URL.createObjectURL(f2)));
  };

  /* ── build FormData ─────────────────────────────────────────── */
  const buildFD = () => {
    const fd = new FormData();
    fd.append("name",           form.name.trim());
    fd.append("location",       form.location.trim());
    fd.append("description",    form.description.trim());
    fd.append("facilities",     form.facilities.trim());
    fd.append("opening_time",   toBackendTime(form.opening_time));
    fd.append("closing_time",   toBackendTime(form.closing_time));
    fd.append("price_per_hour", String(form.price_per_hour));
    fd.append("ground_size",    form.ground_size);
    fd.append("ground_type",    form.ground_type);
    if (form.lat  != null) fd.append("latitude",  String(form.lat));
    if (form.lng  != null) fd.append("longitude", String(form.lng));
    if (form.newImages[0]) fd.append("image", form.newImages[0]);
    return fd;
  };

  /* ── create ─────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, false);
    if (Object.keys(errs).length) { setErrors(errs); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSubmitting(true); setSuccess("");
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/create/`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Ground listed successfully! Awaiting admin approval.");
        setMyGround(data.ground || data);
        setForm(INIT); setNewPreviews([]); setErrors({});
      } else {
        const mapped = {};
        let generalError = "";
        Object.entries(data).forEach(([k, v]) => {
          const msg = Array.isArray(v) ? v[0] : (typeof v === "string" ? v : JSON.stringify(v));
          if (k === "non_field_errors" || k === "detail" || k === "message") generalError = msg;
          else mapped[k] = msg;
        });
        setErrors(mapped);
        setApiError(generalError || `Server error (${res.status}).`);
      }
    } catch { setApiError("Network error — make sure the Django server is running on port 8000."); }
    finally { setSubmitting(false); }
  };

  /* ── update ─────────────────────────────────────────────────── */
  const handleUpdate = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, true);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${myGround.id}/update/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Ground updated successfully!");
        setMyGround(data.ground || data);
        setEditMode(false); setNewPreviews([]);
      } else {
        const mapped = {};
        let generalError = "";
        Object.entries(data).forEach(([k, v]) => {
          const msg = Array.isArray(v) ? v[0] : (typeof v === "string" ? v : JSON.stringify(v));
          if (k === "non_field_errors" || k === "detail" || k === "message") generalError = msg;
          else mapped[k] = msg;
        });
        setErrors(mapped);
        setApiError(generalError || `Update failed (${res.status}).`);
      }
    } catch { setApiError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  };

  /* ── loading ─────────────────────────────────────────────────── */
  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── VIEW MODE ──────────────────────────────────────────────── */
  if (myGround && !editMode) {
    const imgSrc = myGround.image
      ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
      : null;
    const hasLocation = myGround.latitude != null && myGround.longitude != null;

    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">← Dashboard</button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">My Ground</span>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6 text-sm font-medium flex items-center gap-2">
              ✅ {success}
            </div>
          )}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                {imgSrc
                  ? <img src={imgSrc} alt={myGround.name} className="w-full h-72 object-cover" />
                  : <div className="w-full h-72 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-7xl">⚽</div>}
              </div>

              {/* Map in view mode */}
              {hasLocation && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    📌 Pinned Location
                  </p>
                  <GroundMapMini
                    lat={myGround.latitude}
                    lng={myGround.longitude}
                    name={myGround.name}
                  />
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{myGround.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">📍 {myGround.location}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {myGround.ground_size && (
                        <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded">
                          ⚽ {myGround.ground_size}v{myGround.ground_size}
                        </span>
                      )}
                      {myGround.ground_type && (
                        <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded capitalize">
                          {myGround.ground_type === "indoor" ? "🏠" : "☀️"} {myGround.ground_type}
                        </span>
                      )}
                      {hasLocation && (
                        <span className="px-2.5 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded">
                          📌 Mapped
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded text-xs font-bold border flex-shrink-0
                    ${myGround.is_approved ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    {myGround.is_approved ? "✓ Approved" : "⏳ Pending"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    ["Price",      `Rs ${myGround.price_per_hour} / hr`],
                    ["Opens",      toLabel(fromBackendTime(myGround.opening_time?.slice(0,5)))],
                    ["Closes",     toLabel(fromBackendTime(myGround.closing_time?.slice(0,5)))],
                    ["Facilities", myGround.facilities || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{k}</p>
                      <p className="text-gray-800 font-semibold text-sm">{v}</p>
                    </div>
                  ))}
                </div>
                {myGround.description && (
                  <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-4 mb-5">{myGround.description}</p>
                )}
                <div className="flex gap-3">
                  <button onClick={enableEdit}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm flex items-center justify-center gap-2 shadow-sm">
                    ✏️ Edit Ground
                  </button>
                  <button onClick={() => navigate("/owner-dashboard")}
                    className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition text-sm">
                    ← Dashboard
                  </button>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 text-center">
                  ⚠ One ground per owner account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM MODE ──────────────────────────────────────────────── */
  const isEdit = editMode && !!myGround;
  const existingImgSrc = isEdit && myGround?.image
    ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
    : null;

  const done1 = !!(form.name && form.location && form.description && form.facilities);
  const done2 = !!(form.opening_time.hour && form.closing_time.hour);
  const done3 = !!form.price_per_hour;
  const done4 = !!(form.ground_size && form.ground_type);
  const done5 = newPreviews.length > 0 || (isEdit && !!existingImgSrc);
  const done6 = form.lat != null && form.lng != null;
  const progressPct = [done1, done2, done3, done4, done5, done6].filter(Boolean).length * Math.floor(100/6);

  const errorCount = Object.keys(errors).filter(k => errors[k]).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
            className="text-gray-400 hover:text-gray-700 text-sm font-medium transition">
            ← {isEdit ? "Cancel" : "Dashboard"}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">{isEdit ? "Edit Ground" : "Add New Ground"}</span>
        </div>
        {!isEdit && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded font-semibold">
            ⚠ One ground per account
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── SIDEBAR ─────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sticky top-24">
              <h2 className="text-base font-black text-gray-900 mb-1">{isEdit ? "Edit Ground" : "List Your Ground"}</h2>
              <p className="text-gray-400 text-xs mb-4">Complete all sections</p>
              <div className="divide-y divide-gray-100">
                <SidebarStep step="1" title="Basic Info"     subtitle="Name, location, facilities" done={done1} />
                <SidebarStep step="2" title="Hours"          subtitle="Opening & closing time"     done={done2} />
                <SidebarStep step="3" title="Price"          subtitle="Hourly rate"                done={done3} />
                <SidebarStep step="4" title="Specifications" subtitle="Size & type"               done={done4} />
                <SidebarStep step="5" title="Photos"         subtitle="Ground images"             done={done5} />
                <SidebarStep step="6" title="Map Location"   subtitle="Pin on map (optional)"     done={done6} />
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1.5">
                  <span>Completion</span>
                  <span className="text-green-600">{progressPct}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              {errorCount > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-xs font-bold mb-1">⚠ {errorCount} field{errorCount > 1 ? "s" : ""} need attention:</p>
                  <ul className="text-red-500 text-xs space-y-0.5">
                    {Object.entries(errors).filter(([,v]) => v).map(([k, v]) => (
                      <li key={k}>• {v}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-xs font-semibold mb-1">📋 Next steps</p>
                <p className="text-blue-600 text-xs leading-relaxed">After submitting, an admin will review your ground before it goes live.</p>
              </div>
            </div>
          </div>

          {/* ── FORM ─────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-9">

            {apiError && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 mb-5 text-sm flex items-start gap-2">
                <span className="text-lg flex-shrink-0">⚠</span>
                <div>
                  <p className="font-bold">Submission Failed</p>
                  <p className="mt-0.5">{apiError}</p>
                </div>
                <button onClick={() => setApiError("")} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4 mb-5 text-sm font-semibold flex items-center gap-2">
                ✅ {success}
              </div>
            )}

            <form onSubmit={isEdit ? handleUpdate : handleSubmit} noValidate className="space-y-5">

              {/* ── 1: Basic Info ──────────────────────────── */}
              <Section num={1} title="Basic Information" subtitle="Name, location and description" done={done1}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Ground Name" required />
                    <input name="name" value={form.name} onChange={handleChange}
                      placeholder="e.g. Kathmandu Futsal Arena" className={iCls(errors.name)} />
                    {errors.name && <Err>{errors.name}</Err>}
                  </div>
                  <div>
                    <FieldLabel label="Location" required />
                    <input name="location" value={form.location} onChange={handleChange}
                      placeholder="e.g. Thamel, Kathmandu" className={iCls(errors.location)} />
                    {errors.location && <Err>{errors.location}</Err>}
                  </div>
                </div>
                <div>
                  <FieldLabel label="Description" required />
                  <textarea name="description" value={form.description} onChange={handleChange}
                    rows={3} placeholder="Surface type, size, nearby landmarks..."
                    className={`${iCls(errors.description)} resize-none`} />
                  {errors.description && <Err>{errors.description}</Err>}
                </div>
                <div>
                  <FieldLabel label="Facilities" required hint="Separate with commas" />
                  <input name="facilities" value={form.facilities} onChange={handleChange}
                    placeholder="Parking, Shower, WiFi, Changing Room" className={iCls(errors.facilities)} />
                  {errors.facilities && <Err>{errors.facilities}</Err>}
                </div>
              </Section>

              {/* ── 2: Hours ───────────────────────────────── */}
              <Section num={2} title="Operating Hours" subtitle="Opening and closing times" done={done2}>
                <div className="grid grid-cols-2 gap-5">
                  <TimePicker label="Opening Time" value={form.opening_time}
                    onChange={v => setTime("opening_time", v)} error={errors.opening_time} />
                  <TimePicker label="Closing Time" value={form.closing_time}
                    onChange={v => setTime("closing_time", v)} error={errors.closing_time} />
                </div>
                {form.opening_time.hour && form.closing_time.hour && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm">
                    <span>🕐</span>
                    <p className="text-green-700 font-bold">{toLabel(form.opening_time)} — {toLabel(form.closing_time)}</p>
                    <span className="ml-auto text-green-500 font-black">✓</span>
                  </div>
                )}
              </Section>

              {/* ── 3: Price ───────────────────────────────── */}
              <Section num={3} title="Pricing" subtitle="Hourly booking rate" done={done3}>
                <div className="max-w-sm">
                  <FieldLabel label="Price per Hour" required />
                  <div className={`flex items-center border rounded-lg overflow-hidden transition-all
                    ${errors.price_per_hour ? "border-red-400 ring-1 ring-red-200"
                      : "border-gray-300 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-200 hover:border-gray-400"}`}>
                    <span className="px-4 py-3 text-gray-500 font-bold text-sm bg-gray-50 border-r border-gray-200 select-none">Rs</span>
                    <input type="number" name="price_per_hour" value={form.price_per_hour}
                      onChange={handleChange} min="1" placeholder="e.g. 1200"
                      className="flex-1 bg-white py-3 px-4 text-gray-800 font-bold placeholder-gray-400 focus:outline-none text-base" />
                    <span className="px-4 text-gray-400 text-sm bg-gray-50 border-l border-gray-200 py-3 select-none">/ hr</span>
                  </div>
                  {errors.price_per_hour && <Err>{errors.price_per_hour}</Err>}
                </div>
              </Section>

              {/* ── 4: Specifications ──────────────────────── */}
              <Section num={4} title="Specifications" subtitle="Ground size and type" done={done4}>
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <FieldLabel label="Ground Size (players per side)" required />
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[
                        { val: "5", label: "5v5", desc: "5-a-side" },
                        { val: "6", label: "6v6", desc: "6-a-side" },
                        { val: "7", label: "7v7", desc: "7-a-side" },
                      ].map(opt => (
                        <button key={opt.val} type="button"
                          onClick={() => setChoice("ground_size", opt.val)}
                          className={`py-3 rounded-lg border-2 text-center transition-all cursor-pointer
                            ${form.ground_size === opt.val
                              ? "bg-green-500 border-green-500 text-white shadow-md"
                              : "bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"}`}>
                          <p className="font-black text-base">{opt.label}</p>
                          <p className={`text-xs mt-0.5 ${form.ground_size === opt.val ? "text-green-100" : "text-gray-400"}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    {errors.ground_size && <Err>{errors.ground_size}</Err>}
                  </div>
                  <div>
                    <FieldLabel label="Ground Type" required />
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {[
                        { val: "indoor",  label: "Indoor",  icon: "🏠", desc: "Covered facility" },
                        { val: "outdoor", label: "Outdoor", icon: "☀️", desc: "Open air ground"  },
                      ].map(opt => (
                        <button key={opt.val} type="button"
                          onClick={() => setChoice("ground_type", opt.val)}
                          className={`py-4 rounded-lg border-2 text-center transition-all cursor-pointer
                            ${form.ground_type === opt.val
                              ? "bg-green-500 border-green-500 text-white shadow-md"
                              : "bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50"}`}>
                          <p className="text-2xl mb-1">{opt.icon}</p>
                          <p className="font-black text-sm">{opt.label}</p>
                          <p className={`text-xs mt-0.5 ${form.ground_type === opt.val ? "text-green-100" : "text-gray-400"}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                    {errors.ground_type && <Err>{errors.ground_type}</Err>}
                  </div>
                </div>
              </Section>

              {/* ── 5: Photos ──────────────────────────────── */}
              <Section
                num={5}
                title="Ground Photos"
                subtitle={isEdit ? "Upload new or keep current" : "Up to 3 photos"}
                done={done5}
                badge={`${newPreviews.length}/3`}
              >
                {isEdit && existingImgSrc && newPreviews.length === 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Photo</p>
                    <div className="relative rounded-lg overflow-hidden border border-gray-200 h-44">
                      <img src={existingImgSrc} alt="current" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 flex items-end p-3">
                        <span className="bg-white/90 text-gray-700 text-xs px-3 py-1.5 rounded font-semibold">
                          📷 Kept unless you upload a new one
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {newPreviews.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">NEW PHOTOS ✓</p>
                    <div className="grid grid-cols-3 gap-3">
                      {newPreviews.map((src, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-green-400">
                          <img src={src} alt="" className="w-full h-36 object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <button type="button" onClick={() => removeNewImage(idx)}
                              className="w-9 h-9 bg-red-500 text-white rounded-full text-sm font-black flex items-center justify-center">✕</button>
                          </div>
                          {idx === 0 && <span className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">Cover</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {newPreviews.length < 3 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className={`w-full rounded-lg border-2 border-dashed py-8 flex flex-col items-center gap-2 transition-all
                      ${errors.images ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50"}`}>
                    <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-2xl shadow-sm">📷</div>
                    <p className="text-gray-600 font-bold text-sm">
                      {isEdit ? "Upload new photo (optional)" : "Click to upload photos"}
                    </p>
                    <p className="text-gray-400 text-xs">JPG, PNG — up to 3 photos</p>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                {errors.images && <Err>{errors.images}</Err>}
              </Section>

              {/* ── 6: Map Location ────────────────────────── */}
              <Section
                num={6}
                title="Map Location"
                subtitle="Drop a pin so players can find you (optional)"
                done={done6}
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
                  <span className="text-blue-500 flex-shrink-0 mt-0.5">ℹ️</span>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Click on the map or search for a location to drop a pin. Players will be able to see
                    your ground on a map and get directions. This step is <strong>optional</strong> but
                    highly recommended.
                  </p>
                </div>
                <LocationPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={({ lat, lng }) => setForm(f => ({ ...f, lat, lng }))}
                  height="340px"
                />
              </Section>

              {/* ── Submit ─────────────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                {errorCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-600 text-xs font-bold mb-1">Please fix these errors before submitting:</p>
                    <ul className="text-red-500 text-xs space-y-0.5">
                      {Object.entries(errors).filter(([,v]) => v).map(([k, v]) => (
                        <li key={k}>• {v}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-4">
                  {isEdit && (
                    <button type="button" onClick={() => setEditMode(false)}
                      className="flex-1 py-3.5 bg-white border-2 border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition text-sm">
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-3.5 bg-green-500 text-white font-black rounded-lg hover:bg-green-600 active:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-sm">
                    {submitting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Saving..." : "Publishing..."}</>
                      : isEdit ? "✅ Save Changes" : "🏟️ Publish Ground"}
                  </button>
                </div>
                <p className="text-center text-gray-400 text-xs mt-3">
                  {isEdit ? "Only changed fields will be updated." : "Reviewed by admin before going live."}
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── tiny helpers ─────────────────────────────────────────────── */
function Err({ children }) {
  return <p className="text-red-500 text-xs mt-1">⚠ {children}</p>;
}

function Section({ num, title, subtitle, done, badge, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className={`w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center ${done ? "bg-green-500" : "bg-gray-300"}`}>
          {done ? "✓" : num}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-gray-800">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        {badge && <span className="text-xs text-gray-400">{badge}</span>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

/* ── mini map for view mode (no search bar, compact) ─────────── */
function GroundMapMini({ lat, lng, name }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load Leaflet if needed
    const load = (cb) => {
      if (window.L) { cb(window.L); return; }
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = () => cb(window.L);
      document.head.appendChild(script);
    };

    load((L) => {
      if (!containerRef.current || mapRef.current) return;
      const pos = [parseFloat(lat), parseFloat(lng)];
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false }).setView(pos, 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({
        html: `<div style="width:24px;height:24px;background:#16a34a;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24], className: "",
      });
      L.marker(pos, { icon }).addTo(map).bindPopup(name).openPopup();
      mapRef.current = map;
      setLoaded(true);
    });
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height: "180px" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {!loaded && <div className="absolute inset-0 bg-gray-100 flex items-center justify-center"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>}
      </div>
      <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-lg text-xs hover:bg-blue-100 transition">
        🗺️ Get Directions
      </a>
    </div>
  );
}
