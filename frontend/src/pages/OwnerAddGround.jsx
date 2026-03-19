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
    if (o >= c) e.closing_time = "Closing time must be after opening time.";
  }
  const price = parseFloat(form.price_per_hour);
  if (!form.price_per_hour || isNaN(price) || price <= 0)
    e.price_per_hour = "Enter a valid price greater than 0.";
  if (!isEdit && form.newImages.length === 0)
    e.images = "Upload at least one image.";
  return e;
};

const INIT = {
  name: "", location: "", description: "", facilities: "",
  opening_time: { hour: "", ampm: "AM" },
  closing_time: { hour: "", ampm: "PM" },
  price_per_hour: "", newImages: [],
};

/* ─── TimePicker ─────────────────────────────────────────────── */
function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className={`bg-white border rounded-lg transition-all
        ${error ? "border-red-400 ring-1 ring-red-300" : value.hour ? "border-green-500 ring-1 ring-green-200" : "border-gray-300 hover:border-gray-400"}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Hour</span>
          {value.hour
            ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded border border-green-200">✓ {toLabel(value)}</span>
            : <span className="text-xs text-gray-400 italic">Not selected</span>}
        </div>

        {/* Hour buttons */}
        <div className="grid grid-cols-6 gap-2 p-4 border-b border-gray-100">
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

        {/* AM/PM */}
        <div className="grid grid-cols-2 gap-3 p-3">
          {["AM", "PM"].map(a => (
            <button key={a} type="button" onClick={() => onChange({ ...value, ampm: a })}
              className={`py-2.5 rounded text-sm font-black tracking-widest transition-all border
                ${value.ampm === a
                  ? a === "AM" ? "bg-sky-500 text-white border-sky-500"
                               : "bg-orange-500 text-white border-orange-500"
                  : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:border-gray-300"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

/* ─── reusable field label ───────────────────────────────── */
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
  `w-full rounded-lg px-4 py-3 text-sm font-medium text-gray-800 bg-white
   border placeholder-gray-400 focus:outline-none transition-all duration-150
   ${err
     ? "border-red-400 ring-1 ring-red-200 focus:border-red-500"
     : "border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-1 focus:ring-green-200"}`;

/* ─── Section label (sidebar) ────────────────────────────── */
function SidebarStep({ step, title, subtitle, active, done }) {
  return (
    <div className={`flex items-start gap-3 py-4 px-3 rounded-lg transition-all
      ${active ? "bg-green-50 border border-green-200" : "border border-transparent"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5
        ${done ? "bg-green-500 text-white" : active ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
        {done ? "✓" : step}
      </div>
      <div>
        <p className={`text-sm font-bold ${active ? "text-green-700" : done ? "text-gray-700" : "text-gray-400"}`}>{title}</p>
        <p className={`text-xs mt-0.5 ${active ? "text-green-500" : "text-gray-400"}`}>{subtitle}</p>
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
  const [myGround,      setMyGround]      = useState(null);
  const [editMode,      setEditMode]      = useState(false);
  const [loadingGround, setLoadingGround] = useState(true);
  const fileRef = useRef(null);

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
      newImages:      [],
    });
    setNewPreviews([]); setErrors({}); setSuccess(""); setEditMode(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(ex => ({ ...ex, [name]: "" }));
  };

  const setTime = (field, val) => {
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

  const buildFD = () => {
    const fd = new FormData();
    fd.append("name",           form.name);
    fd.append("location",       form.location);
    fd.append("description",    form.description);
    fd.append("facilities",     form.facilities);
    fd.append("opening_time",   toBackendTime(form.opening_time));
    fd.append("closing_time",   toBackendTime(form.closing_time));
    fd.append("price_per_hour", form.price_per_hour);
    if (form.newImages[0]) fd.append("image", form.newImages[0]);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form, false);
    if (Object.keys(errs).length) { setErrors(errs); return; }
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
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error. Please try again." }); }
    finally  { setSubmitting(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
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
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error." }); }
    finally  { setSubmitting(false); }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     VIEW MODE — already has a ground
  ══════════════════════════════════════════════════════════════ */
  if (myGround && !editMode) {
    const imgSrc = myGround.image
      ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
      : null;
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-3">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1.5 transition">
            Back to Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">My Ground</span>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 mb-6 text-sm font-medium flex items-center gap-2">
              Confirmed: {success}
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* image */}
            <div className="col-span-12 lg:col-span-5">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                {imgSrc
                  ? <img src={imgSrc} alt={myGround.name} className="w-full h-72 object-cover" />
                  : <div className="w-full h-72 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center text-7xl">FUTSAL</div>}
              </div>
            </div>

            {/* details */}
            <div className="col-span-12 lg:col-span-7">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900">{myGround.name}</h2>
                    <p className="text-gray-500 text-sm mt-1">Location: {myGround.location}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded text-xs font-bold border flex-shrink-0
                    ${myGround.is_approved
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                    {myGround.is_approved ? "Approved" : "Pending"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    ["Price",     `Rs ${myGround.price_per_hour} / hr`],
                    ["Opens",     toLabel(fromBackendTime(myGround.opening_time?.slice(0,5)))],
                    ["Closes",    toLabel(fromBackendTime(myGround.closing_time?.slice(0,5)))],
                    ["Facilities",myGround.facilities || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">{k}</p>
                      <p className="text-gray-800 font-semibold text-sm">{v}</p>
                    </div>
                  ))}
                </div>

                {myGround.description && (
                  <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-4 mb-6">
                    {myGround.description}
                  </p>
                )}

                <div className="flex gap-3">
                  <button onClick={enableEdit}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm flex items-center justify-center gap-2 shadow-sm">
                    Edit Ground
                  </button>
                  <button onClick={() => navigate("/owner-dashboard")}
                    className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition text-sm">
                    Back to Dashboard
                  </button>
                </div>

                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4 text-center">
                  Note: You can only register one ground per account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     FORM MODE — create or edit
  ══════════════════════════════════════════════════════════════ */
  const isEdit = editMode && !!myGround;
  const existingImgSrc = isEdit && myGround?.image
    ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
    : null;

  const allFilled = form.name && form.location && form.description &&
    form.facilities && form.opening_time.hour && form.closing_time.hour &&
    form.price_per_hour && (isEdit || form.newImages.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">

      {/* ── top breadcrumb bar ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-3">
        <button onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
          className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1.5 transition">
          Back to {isEdit ? "Ground" : "Dashboard"}
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">
          {isEdit ? "Edit Ground" : "Add New Ground"}
        </span>
        {!isEdit && (
          <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded font-semibold">
            Note: One ground per account only
          </span>
        )}
      </div>

      {/* ── main layout ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── LEFT SIDEBAR ─────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sticky top-24">
              <h2 className="text-base font-black text-gray-900 mb-1">
                {isEdit ? "Edit Ground" : "List Your Ground"}
              </h2>
              <p className="text-gray-400 text-xs mb-5">
                {isEdit ? "Update your ground details" : "Complete all 4 sections"}
              </p>

              <div className="space-y-1">
                <SidebarStep step="1" title="Basic Info"     subtitle="Name, location, description" active={true}  done={!!(form.name && form.location && form.description && form.facilities)} />
                <SidebarStep step="2" title="Hours"          subtitle="Opening & closing time"       active={false} done={!!(form.opening_time.hour && form.closing_time.hour)} />
                <SidebarStep step="3" title="Price"          subtitle="Hourly rate"                  active={false} done={!!form.price_per_hour} />
                <SidebarStep step="4" title="Photos"         subtitle="Upload ground images"         active={false} done={newPreviews.length > 0 || (isEdit && !!existingImgSrc)} />
              </div>

              {/* progress */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                  <span>Completion</span>
                  <span className="text-green-600">
                    {[
                      !!(form.name && form.location && form.description && form.facilities),
                      !!(form.opening_time.hour && form.closing_time.hour),
                      !!form.price_per_hour,
                      newPreviews.length > 0 || (isEdit && !!existingImgSrc),
                    ].filter(Boolean).length * 25}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${[
                      !!(form.name && form.location && form.description && form.facilities),
                      !!(form.opening_time.hour && form.closing_time.hour),
                      !!form.price_per_hour,
                      newPreviews.length > 0 || (isEdit && !!existingImgSrc),
                    ].filter(Boolean).length * 25}%` }} />
                </div>
              </div>

              {/* info card */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-xs font-semibold mb-1">Information:</p>
                <p className="text-blue-600 text-xs leading-relaxed">
                  Your ground will be reviewed by an admin. Once approved, it will appear publicly on FutsalHub.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM ───────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-9">

            {/* banners */}
            {errors.api && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 mb-5 text-sm flex items-center gap-2">
                Error: {errors.api}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-4 mb-5 text-sm font-semibold flex items-center gap-2">
                Success: {success}
              </div>
            )}

            <form onSubmit={isEdit ? handleUpdate : handleSubmit} noValidate className="space-y-6">

              {/* ── CARD 1: Basic Info ───────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-black flex items-center justify-center">1</div>
                  <div>
                    <h3 className="text-sm font-black text-gray-800">Basic Information</h3>
                    <p className="text-xs text-gray-400">Name, location and ground description</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">

                  {/* name + location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <FieldLabel label="Ground Name" required />
                      <input name="name" value={form.name} onChange={handleChange}
                        placeholder={isEdit ? myGround?.name : "e.g. Kathmandu Futsal Arena"}
                        className={iCls(errors.name)} />
                      {errors.name && <p className="text-red-500 text-xs mt-1">Error: {errors.name}</p>}
                    </div>
                    <div>
                      <FieldLabel label="Location" required />
                      <input name="location" value={form.location} onChange={handleChange}
                        placeholder={isEdit ? myGround?.location : "e.g. Thamel, Kathmandu"}
                        className={iCls(errors.location)} />
                      {errors.location && <p className="text-red-500 text-xs mt-1">Error: {errors.location}</p>}
                    </div>
                  </div>

                  {/* description */}
                  <div>
                    <FieldLabel label="Description" required />
                    <textarea name="description" value={form.description} onChange={handleChange}
                      rows={4}
                      placeholder={isEdit ? myGround?.description : "Describe your ground — surface type, size, nearby landmarks, special rules..."}
                      className={`${iCls(errors.description)} resize-none`} />
                    {errors.description && <p className="text-red-500 text-xs mt-1">Error: {errors.description}</p>}
                  </div>

                  {/* facilities */}
                  <div>
                    <FieldLabel label="Facilities" required hint="Separate with commas" />
                    <input name="facilities" value={form.facilities} onChange={handleChange}
                      placeholder={isEdit ? myGround?.facilities : "e.g. Parking, Shower, WiFi, Changing Room, Floodlights"}
                      className={iCls(errors.facilities)} />
                    {errors.facilities && <p className="text-red-500 text-xs mt-1">Error: {errors.facilities}</p>}
                  </div>

                </div>
              </div>

              {/* ── CARD 2: Operating Hours ──────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-black flex items-center justify-center">2</div>
                  <div>
                    <h3 className="text-sm font-black text-gray-800">Operating Hours</h3>
                    <p className="text-xs text-gray-400">Set your ground opening and closing times</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TimePicker label="Opening Time"
                      value={form.opening_time}
                      onChange={v => setTime("opening_time", v)}
                      error={errors.opening_time} />
                    <TimePicker label="Closing Time"
                      value={form.closing_time}
                      onChange={v => setTime("closing_time", v)}
                      error={errors.closing_time} />
                  </div>

                  {form.opening_time.hour && form.closing_time.hour && (
                    <div className="mt-5 bg-green-50 border border-green-200 rounded-lg px-5 py-3.5 flex items-center gap-3">
                      <span className="text-xl">CLOCK</span>
                      <div>
                        <p className="text-green-700 font-bold text-sm">
                          {toLabel(form.opening_time)} — {toLabel(form.closing_time)}
                        </p>
                        <p className="text-green-600/70 text-xs">Ground available during these hours</p>
                      </div>
                      <span className="ml-auto text-green-500 font-black">OK</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── CARD 3: Price ────────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-black flex items-center justify-center">3</div>
                  <div>
                    <h3 className="text-sm font-black text-gray-800">Pricing</h3>
                    <p className="text-xs text-gray-400">Set your hourly booking rate</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="max-w-sm">
                    <FieldLabel label="Price per Hour" required />
                    <div className={`flex items-center border rounded-lg overflow-hidden transition-all
                      ${errors.price_per_hour
                        ? "border-red-400 ring-1 ring-red-200"
                        : "border-gray-300 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-200 hover:border-gray-400"}`}>
                      <span className="px-4 py-3 text-gray-500 font-bold text-sm bg-gray-50 border-r border-gray-200 select-none">
                        Rs
                      </span>
                      <input type="number" name="price_per_hour"
                        value={form.price_per_hour} onChange={handleChange} min="1"
                        placeholder={isEdit ? String(myGround?.price_per_hour ?? "1200") : "e.g. 1200"}
                        className="flex-1 bg-white py-3 px-4 text-gray-800 text-base font-bold placeholder-gray-400 focus:outline-none" />
                      <span className="px-4 text-gray-400 text-sm bg-gray-50 border-l border-gray-200 py-3 select-none">
                        / hr
                      </span>
                    </div>
                    {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">Error: {errors.price_per_hour}</p>}
                  </div>
                </div>
              </div>

              {/* ── CARD 4: Photos ───────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-black flex items-center justify-center">4</div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800">Ground Photos</h3>
                      <p className="text-xs text-gray-400">
                        {isEdit ? "Upload new or keep current" : "Upload up to 3 photos"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{newPreviews.length}/3 selected</span>
                </div>

                <div className="p-6">

                  {/* existing image while editing */}
                  {isEdit && existingImgSrc && newPreviews.length === 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Photo</p>
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 h-52">
                        <img src={existingImgSrc} alt="current" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-end p-3">
                          <span className="bg-white/90 text-gray-700 text-xs px-3 py-1.5 rounded font-semibold shadow-sm">
                            Current Photo — kept unless you upload a new one
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* new previews */}
                  {newPreviews.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">New Photos Selected</p>
                      <div className="grid grid-cols-3 gap-3">
                        {newPreviews.map((src, idx) => (
                          <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-green-400">
                            <img src={src} alt="" className="w-full h-36 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <button type="button" onClick={() => removeNewImage(idx)}
                                className="w-9 h-9 bg-red-500 text-white rounded-full text-sm font-black flex items-center justify-center shadow-lg">
                                X
                              </button>
                            </div>
                            {idx === 0 && (
                              <span className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded font-bold">
                                Cover
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* upload zone */}
                  {newPreviews.length < 3 && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className={`w-full rounded-lg border-2 border-dashed py-10 flex flex-col items-center gap-3 transition-all duration-200
                        ${errors.images
                          ? "border-red-400 bg-red-50"
                          : "border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50"}`}>
                      <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-2xl">
                        PHOTO
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 font-bold text-sm">
                          {newPreviews.length > 0 ? "Add more photos" : isEdit ? "Upload new photo (optional)" : "Click to upload photos"}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">JPG, PNG up to 3 photos</p>
                      </div>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                  {errors.images && <p className="text-red-500 text-xs mt-2 flex items-center gap-1">Error: {errors.images}</p>}
                </div>
              </div>

              {/* ── Submit row ────────────────────────────────── */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                <div className="flex gap-4">
                  {isEdit && (
                    <button type="button" onClick={() => setEditMode(false)}
                      className="flex-1 py-3.5 bg-white border-2 border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 hover:border-gray-400 transition text-sm">
                      Cancel
                    </button>
                  )}
                  <button type="submit" disabled={submitting}
                    className={`flex-1 py-3.5 rounded-lg font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2 shadow-sm
                      ${allFilled
                        ? "bg-green-500 text-white hover:bg-green-600 shadow-green-200"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                    {submitting
                      ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />{isEdit ? "Saving..." : "Submitting..."}</>
                      : isEdit ? "Save Changes" : "Publish Ground"}
                  </button>
                </div>
                <p className="text-center text-gray-400 text-xs mt-3">
                  {isEdit
                    ? "Only fields you change will be updated."
                    : "Reviewed by admin before going live · One ground per account"}
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
