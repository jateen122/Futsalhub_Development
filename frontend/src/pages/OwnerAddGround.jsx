import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── convert { hour, ampm } → "HH:00" for backend ─────────── */
const toBackendTime = ({ hour, ampm }) => {
  if (!hour) return "";
  let h = parseInt(hour, 10);
  if (ampm === "AM" && h === 12) h = 0;
  if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:00`;
};

/* ─── convert "HH:MM" → { hour, ampm } ──────────────────────── */
const fromBackendTime = (val) => {
  if (!val) return { hour: "", ampm: "AM" };
  const h    = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? "12" : String(h % 12);
  return { hour, ampm };
};

const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "");

/* ─── validation ─────────────────────────────────────────────── */
const validate = (form) => {
  const e = {};
  if (!form.name.trim())         e.name          = "Ground name is required.";
  if (!form.location.trim())     e.location       = "Location is required.";
  if (!form.phone.trim())        e.phone          = "Owner phone is required.";
  else if (!/^\d{10}$/.test(form.phone.replace(/\s/g, "")))
                                 e.phone          = "Enter a valid 10-digit number.";
  if (!form.description.trim())  e.description    = "Description is required.";
  if (!form.facilities.trim())   e.facilities     = "List at least one facility.";
  if (!form.opening_time.hour)   e.opening_time   = "Select opening time.";
  if (!form.closing_time.hour)   e.closing_time   = "Select closing time.";
  if (form.opening_time.hour && form.closing_time.hour) {
    const open  = toBackendTime(form.opening_time);
    const close = toBackendTime(form.closing_time);
    if (open >= close) e.closing_time = "Closing must be after opening time.";
  }
  const price = parseFloat(form.price_per_hour);
  if (!form.price_per_hour || isNaN(price) || price <= 0)
                                 e.price_per_hour = "Enter a valid price greater than 0.";
  if (form.images.length === 0)  e.images         = "Upload at least one image.";
  return e;
};

const INIT = {
  name: "", location: "", phone: "", description: "", facilities: "",
  opening_time: { hour: "", ampm: "AM" },
  closing_time:  { hour: "", ampm: "PM" },
  price_per_hour: "",
  images: [],
};

/* ═══════════════════════════════════════════════════════════════
   TimePicker — big card style
═══════════════════════════════════════════════════════════════ */
function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  return (
    <div className={`bg-[#0f1825] border-2 rounded-2xl p-5 transition-all duration-200
      ${error
        ? "border-red-500/50"
        : value.hour
        ? "border-emerald-500/40"
        : "border-white/8 hover:border-white/15"}`}>

      {/* label row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-xs uppercase tracking-[0.2em] font-semibold">{label}</p>
        {value.hour
          ? <span className="text-emerald-400 text-sm font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              {toLabel(value)}
            </span>
          : <span className="text-white/20 text-xs">Not set</span>
        }
      </div>

      {/* hour grid — 4 columns */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {hours.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onChange({ ...value, hour: h })}
            className={`h-11 rounded-xl text-base font-bold transition-all duration-150
              ${value.hour === h
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white/5 text-white/40 hover:bg-white/12 hover:text-white hover:scale-105"}`}
          >
            {h}
          </button>
        ))}
      </div>

      {/* AM / PM — full width toggle */}
      <div className="grid grid-cols-2 gap-2">
        {["AM", "PM"].map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange({ ...value, ampm: a })}
            className={`py-3 rounded-xl text-sm font-black tracking-widest transition-all duration-150
              ${value.ampm === a
                ? a === "AM"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                  : "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white"}`}
          >
            {a}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-3 flex items-center gap-1.5">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════ */
export default function OwnerAddGround() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [form,          setForm]          = useState(INIT);
  const [errors,        setErrors]        = useState({});
  const [previews,      setPreviews]      = useState([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [success,       setSuccess]       = useState("");
  const [myGround,      setMyGround]      = useState(null);
  const [editMode,      setEditMode]      = useState(false);
  const [loadingGround, setLoadingGround] = useState(true);

  const fileRef = useRef(null);

  /* ── fetch existing ground ─── */
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const list = d.results || d || [];
        if (list.length > 0) setMyGround(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, []);

  /* ── handlers ─── */
  const set = (name, val) => {
    setForm(f => ({ ...f, [name]: val }));
    if (errors[name]) setErrors(e => ({ ...e, [name]: "" }));
  };

  const handleChange = (e) => set(e.target.name, e.target.value);

  const setTime = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const handleImages = (e) => {
    const files  = Array.from(e.target.files);
    const merged = [...form.images, ...files].slice(0, 3);
    setForm(f => ({ ...f, images: merged }));
    setPreviews(merged.map(f2 => URL.createObjectURL(f2)));
    if (errors.images) setErrors(e => ({ ...e, images: "" }));
  };

  const removeImage = (idx) => {
    const imgs = form.images.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, images: imgs }));
    setPreviews(imgs.map(f2 => URL.createObjectURL(f2)));
  };

  /* ── build FormData ─── */
  const buildFD = () => {
    const fd = new FormData();
    fd.append("name",           form.name);
    fd.append("location",       form.location);
    fd.append("description",    form.description);
    fd.append("facilities",     form.facilities);
    fd.append("opening_time",   toBackendTime(form.opening_time));
    fd.append("closing_time",   toBackendTime(form.closing_time));
    fd.append("price_per_hour", form.price_per_hour);
    if (form.images[0]) fd.append("image", form.images[0]);
    return fd;
  };

  /* ── submit create ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true); setSuccess("");
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/create/`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Ground listed! Awaiting admin approval. ✅");
        setMyGround(data.ground || data);
        setForm(INIT); setPreviews([]); setErrors({});
      } else {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error. Please try again." }); }
    finally  { setSubmitting(false); }
  };

  /* ── submit update ─── */
  const handleUpdate = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${myGround.id}/update/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Ground updated! ✅");
        setMyGround(data.ground || data);
        setEditMode(false);
      } else {
        const mapped = {};
        Object.entries(data).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      }
    } catch { setErrors({ api: "Network error. Please try again." }); }
    finally  { setSubmitting(false); }
  };

  /* ── enable edit ─── */
  const enableEdit = () => {
    setForm({
      name:           myGround.name          || "",
      location:       myGround.location      || "",
      phone:          myGround.phone         || "",
      description:    myGround.description   || "",
      facilities:     myGround.facilities    || "",
      opening_time:   fromBackendTime(myGround.opening_time?.slice(0, 5)),
      closing_time:   fromBackendTime(myGround.closing_time?.slice(0, 5)),
      price_per_hour: myGround.price_per_hour || "",
      images:         [],
    });
    setPreviews([]); setErrors({}); setSuccess(""); setEditMode(true);
  };

  /* ── loading ─── */
  if (loadingGround) {
    return (
      <div className="min-h-screen bg-[#080d18] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── ground card (view mode) ─── */
  if (myGround && !editMode) {
    const imgSrc = myGround.image
      ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
      : null;
    return (
      <div className="min-h-screen bg-[#080d18] pt-24 px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-white/30 hover:text-white text-sm mb-6 flex items-center gap-1.5 transition">
            ← Dashboard
          </button>
          <h1 className="text-3xl font-black text-white mb-1">My Ground</h1>
          <p className="text-white/35 text-sm mb-8">Your active listing on FutsalHub.</p>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl p-4 mb-6 text-sm font-medium">
              {success}
            </div>
          )}

          <div className="bg-[#0f1825] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {imgSrc
              ? <img src={imgSrc} alt={myGround.name} className="w-full h-60 object-cover" />
              : <div className="w-full h-40 bg-white/3 flex items-center justify-center text-5xl">⚽</div>
            }
            <div className="p-7 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">{myGround.name}</h2>
                  <p className="text-white/45 mt-1 text-sm">📍 {myGround.location}</p>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-black border flex-shrink-0
                  ${myGround.is_approved
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-amber-400/10 border-amber-400/25 text-amber-400"}`}>
                  {myGround.is_approved ? "✓ Approved" : "⏳ Pending Approval"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ["💰 Price",     `Rs ${myGround.price_per_hour} / hr`],
                  ["🕐 Opens",     toLabel(fromBackendTime(myGround.opening_time?.slice(0,5)))],
                  ["🕕 Closes",    toLabel(fromBackendTime(myGround.closing_time?.slice(0,5)))],
                  ["🛠 Facilities", myGround.facilities || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <p className="text-white/30 text-xs mb-1.5">{k}</p>
                    <p className="text-white font-bold text-sm">{v}</p>
                  </div>
                ))}
              </div>

              <p className="text-white/40 text-sm leading-relaxed border-t border-white/8 pt-4">
                {myGround.description}
              </p>

              <div className="flex gap-3 pt-1">
                <button onClick={enableEdit}
                  className="flex-1 py-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/25 transition">
                  ✏️ Edit Ground
                </button>
                <button onClick={() => navigate("/owner-dashboard")}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/55 rounded-xl font-bold hover:bg-white/10 transition">
                  ← Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     FORM
  ═══════════════════════════════════════════════════════════ */
  const isEdit = editMode && !!myGround;

  return (
    <div className="min-h-screen bg-[#080d18] pt-24 px-4 pb-24">

      {/* background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-[500px] h-[400px] bg-teal-500/4 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.013]"
          style={{
            backgroundImage:"linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize:"48px 48px",
          }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto">

        {/* ── PAGE HEADER ───────────────────────────────────── */}
        <div className="mb-10">
          <button
            onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
            className="text-white/30 hover:text-white text-sm mb-5 flex items-center gap-1.5 transition"
          >
            ← {isEdit ? "Cancel" : "Dashboard"}
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/25 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/10">
              🏟️
            </div>
            <div>
              <h1 className="text-4xl font-black text-white leading-none">
                {isEdit ? "Edit Ground" : "List Your Ground"}
              </h1>
              <p className="text-white/30 text-sm mt-1.5">
                {isEdit
                  ? "Update your ground information below."
                  : "Complete all sections to list your futsal ground."}
              </p>
            </div>
          </div>
        </div>

        {/* banners */}
        {errors.api && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 mb-6 text-sm flex items-center gap-2">
            ⚠ {errors.api}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl p-4 mb-6 text-sm font-semibold flex items-center gap-2">
            {success}
          </div>
        )}

        <form onSubmit={isEdit ? handleUpdate : handleSubmit} noValidate className="space-y-5">

          {/* ══════════════════════════════════════════════════
              SECTION 1 — Basic Info
          ══════════════════════════════════════════════════ */}
          <div className="bg-[#0f1825] border border-white/8 rounded-3xl p-7">
            <SectionLabel icon="📋" text="Basic Information" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">

              <Field label="Ground Name" error={errors.name}>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Kathmandu Futsal Arena"
                  className={input(errors.name)} />
              </Field>

              <Field label="Location" error={errors.location}>
                <input name="location" value={form.location} onChange={handleChange}
                  placeholder="e.g. Thamel, Kathmandu"
                  className={input(errors.location)} />
              </Field>

              <Field label="Owner Phone" error={errors.phone}>
                <input name="phone" value={form.phone} onChange={handleChange}
                  placeholder="98XXXXXXXX" maxLength={10}
                  className={input(errors.phone)} />
              </Field>

              <Field label="Facilities" error={errors.facilities}>
                <input name="facilities" value={form.facilities} onChange={handleChange}
                  placeholder="Parking, Shower, WiFi, Changing room"
                  className={input(errors.facilities)} />
              </Field>

            </div>

            <div className="mt-4">
              <Field label="Description" error={errors.description}>
                <textarea name="description" value={form.description} onChange={handleChange}
                  rows={3} placeholder="Describe your ground — surface type, size, nearby landmarks, rules..."
                  className={`${input(errors.description)} resize-none`} />
              </Field>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 2 — Operating Hours (big pickers)
          ══════════════════════════════════════════════════ */}
          <div className="bg-[#0f1825] border border-white/8 rounded-3xl p-7">
            <SectionLabel icon="🕐" text="Operating Hours" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <TimePicker
                label="Opening Time"
                value={form.opening_time}
                onChange={(v) => setTime("opening_time", v)}
                error={errors.opening_time}
              />
              <TimePicker
                label="Closing Time"
                value={form.closing_time}
                onChange={(v) => setTime("closing_time", v)}
                error={errors.closing_time}
              />
            </div>

            {/* live preview banner */}
            {form.opening_time.hour && form.closing_time.hour && (
              <div className="mt-5 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="text-emerald-400 text-xl">🕐</span>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Ground Hours</p>
                  <p className="text-emerald-300 font-bold text-base">
                    {toLabel(form.opening_time)} &nbsp;—&nbsp; {toLabel(form.closing_time)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 3 — Price (text input only, no buttons)
          ══════════════════════════════════════════════════ */}
          <div className="bg-[#0f1825] border border-white/8 rounded-3xl p-7">
            <SectionLabel icon="💰" text="Pricing" />

            <div className="mt-5">
              <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">
                Price per Hour (Rs) *
              </label>

              <div className={`flex items-center bg-white/5 border rounded-2xl overflow-hidden transition
                ${errors.price_per_hour ? "border-red-500/50" : "border-white/10 focus-within:border-emerald-500/40"}`}>

                {/* Rs prefix */}
                <span className="pl-5 pr-3 text-white/30 font-bold text-lg select-none flex-shrink-0">Rs</span>

                {/* input */}
                <input
                  type="number"
                  name="price_per_hour"
                  value={form.price_per_hour}
                  onChange={handleChange}
                  min="1"
                  placeholder="e.g. 1200"
                  className="flex-1 bg-transparent py-4 pr-4 text-white text-2xl font-black placeholder-white/15 focus:outline-none"
                />

                {/* /hr suffix */}
                <span className="pr-5 pl-2 text-white/20 text-sm select-none flex-shrink-0">/ hr</span>
              </div>

              {form.price_per_hour && !errors.price_per_hour && (
                <p className="text-emerald-400 text-xs mt-2 font-semibold">
                  ✓ Rs {parseFloat(form.price_per_hour).toLocaleString()} per hour
                </p>
              )}
              {errors.price_per_hour && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  ⚠ {errors.price_per_hour}
                </p>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 4 — Images
          ══════════════════════════════════════════════════ */}
          <div className="bg-[#0f1825] border border-white/8 rounded-3xl p-7">
            <div className="flex items-center justify-between mb-5">
              <SectionLabel icon="📷" text="Ground Images" inline />
              <span className="text-white/20 text-xs">{form.images.length} / 3 uploaded</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((idx) => (
                <div key={idx}>
                  {previews[idx] ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                      <img src={previews[idx]} alt=""
                        className="w-full h-36 object-cover" />
                      {/* hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <button type="button" onClick={() => removeImage(idx)}
                          className="w-9 h-9 bg-red-500 rounded-full text-white text-sm font-black flex items-center justify-center hover:bg-red-400 transition">
                          ✕
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          Cover
                        </span>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className={`w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200
                        ${errors.images
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-white/12 bg-white/2 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:scale-[1.02]"}`}>
                      <span className="text-3xl text-white/15">📷</span>
                      <span className="text-white/25 text-xs font-semibold">
                        {idx === 0 ? "Cover Photo" : `Image ${idx + 1}`}
                      </span>
                      <span className="text-white/15 text-xs">Browse</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />

            {errors.images && (
              <p className="text-red-400 text-xs mt-3 flex items-center gap-1">⚠ {errors.images}</p>
            )}
            <p className="text-white/15 text-xs mt-3">First image will be used as the cover photo.</p>
          </div>

          {/* ══════════════════════════════════════════════════
              SUBMIT
          ══════════════════════════════════════════════════ */}
          <div className="flex gap-4 pt-2">
            {isEdit && (
              <button type="button" onClick={() => setEditMode(false)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-white/55 rounded-2xl font-bold hover:bg-white/10 transition text-base">
                Cancel
              </button>
            )}
            <button type="submit" disabled={submitting}
              className="flex-1 py-4 bg-emerald-500 text-white font-black text-lg rounded-2xl hover:bg-emerald-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEdit ? "Updating..." : "Submitting..."}
                </>
              ) : (
                isEdit ? "✅ Save Changes" : "🏟️ Add Ground"
              )}
            </button>
          </div>

          <p className="text-center text-white/15 text-xs pb-4">
            Your ground will be reviewed by an admin before going live on the platform.
          </p>

        </form>
      </div>
    </div>
  );
}

/* ─── tiny reusable helpers ──────────────────────────────────── */
const input = (err) =>
  `w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none transition
   ${err ? "border-red-500/50" : "border-white/8 focus:border-emerald-500/40"}`;

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">{label} *</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">⚠ {error}</p>}
    </div>
  );
}

function SectionLabel({ icon, text, inline }) {
  if (inline) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <p className="text-white font-bold text-base">{text}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base">
        {icon}
      </div>
      <p className="text-white font-bold text-base">{text}</p>
    </div>
  );
}
