import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, MapPin, Clock, DollarSign, Image as ImageIcon } from "lucide-react";
import LocationPicker from "../components/LocationPicker";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── Time Helpers ───────────────────────────────────────────── */
const toBackendTime = ({ hour, ampm }) => {
  if (!hour) return "";
  let h = parseInt(hour, 10);
  if (ampm === "AM" && h === 12) h = 0;
  if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:00`;
};

const fromBackendTime = (val) => {
  if (!val) return { hour: "", ampm: "AM" };
  const h = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? "12" : String(h % 12);
  return { hour, ampm };
};

const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "");

/* ─── Validation ─────────────────────────────────────────────── */
const validate = (form, isEdit) => {
  const e = {};
  if (!form.name.trim()) e.name = "Ground name is required.";
  if (!form.location.trim()) e.location = "Location is required.";
  if (!form.description.trim()) e.description = "Description is required.";
  if (!form.facilities.trim()) e.facilities = "List at least one facility.";
  if (!form.opening_time.hour) e.opening_time = "Select opening time.";
  if (!form.closing_time.hour) e.closing_time = "Select closing time.";
  
  if (form.opening_time.hour && form.closing_time.hour) {
    const o = toBackendTime(form.opening_time);
    const c = toBackendTime(form.closing_time);
    if (o >= c) e.closing_time = "Closing time must be after opening time.";
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

const INIT_FORM = {
  name: "", location: "", description: "", facilities: "",
  opening_time: { hour: "", ampm: "AM" },
  closing_time: { hour: "", ampm: "PM" },
  price_per_hour: "",
  ground_size: "",
  ground_type: "",
  lat: null,
  lng: null,
  newImages: [],
};

/* ─── Reusable Components ────────────────────────────────────── */
function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${error ? "border-red-400" : "border-gray-200"}`}>
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between text-xs font-medium text-gray-500">
          <span>HOUR</span>
          {value.hour && <span className="text-green-600 font-bold">✓ {toLabel(value)}</span>}
        </div>
        
        <div className="grid grid-cols-6 gap-1.5 p-4 border-b border-gray-100">
          {hours.map(h => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ ...value, hour: h })}
              className={`h-11 rounded-xl text-sm font-semibold transition-all
                ${value.hour === h 
                  ? "bg-green-600 text-white shadow" 
                  : "bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-700 border border-transparent hover:border-green-200"}`}
            >
              {h}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 p-4">
          {["AM", "PM"].map(a => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...value, ampm: a })}
              className={`py-3 rounded-xl font-semibold text-sm transition-all
                ${value.ampm === a 
                  ? a === "AM" ? "bg-sky-500 text-white" : "bg-orange-500 text-white"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">⚠ {error}</p>}
    </div>
  );
}

function Err({ children }) {
  return <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">⚠ {children}</p>;
}

function Section({ num, title, subtitle, done, badge, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center gap-4">
        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0
          ${done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
          {done ? "✓" : num}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        {badge && <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-500">{badge}</span>}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function OwnerAddGround() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const fileRef = useRef(null);

  const [form, setForm] = useState(INIT_FORM);
  const [errors, setErrors] = useState({});
  const [newPreviews, setNewPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [apiError, setApiError] = useState("");
  const [myGround, setMyGround] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingGround, setLoadingGround] = useState(true);

  /* Fetch existing ground */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/grounds/my/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        const list = d.results || d || [];
        if (list.length > 0) setMyGround(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, [token, navigate]);

  const enableEdit = () => {
    if (!myGround) return;
    setForm({
      name: myGround.name || "",
      location: myGround.location || "",
      description: myGround.description || "",
      facilities: myGround.facilities || "",
      opening_time: fromBackendTime(myGround.opening_time?.slice(0, 5)),
      closing_time: fromBackendTime(myGround.closing_time?.slice(0, 5)),
      price_per_hour: myGround.price_per_hour || "",
      ground_size: myGround.ground_size || "",
      ground_type: myGround.ground_type || "",
      lat: myGround.latitude != null ? parseFloat(myGround.latitude) : null,
      lng: myGround.longitude != null ? parseFloat(myGround.longitude) : null,
      newImages: [],
    });
    setNewPreviews([]);
    setErrors({});
    setSuccess("");
    setApiError("");
    setEditMode(true);
  };

  /* Form Handlers */
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
    const files = Array.from(e.target.files);
    const merged = [...form.newImages, ...files].slice(0, 3);
    setForm(f => ({ ...f, newImages: merged }));
    setNewPreviews(merged.map(file => URL.createObjectURL(file)));
    if (errors.images) setErrors(ex => ({ ...ex, images: "" }));
  };

  const removeNewImage = (idx) => {
    const updatedImages = form.newImages.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, newImages: updatedImages }));
    setNewPreviews(updatedImages.map(file => URL.createObjectURL(file)));
  };

  const buildFD = () => {
    const fd = new FormData();
    fd.append("name", form.name.trim());
    fd.append("location", form.location.trim());
    fd.append("description", form.description.trim());
    fd.append("facilities", form.facilities.trim());
    fd.append("opening_time", toBackendTime(form.opening_time));
    fd.append("closing_time", toBackendTime(form.closing_time));
    fd.append("price_per_hour", String(form.price_per_hour));
    fd.append("ground_size", form.ground_size);
    fd.append("ground_type", form.ground_type);
    if (form.lat != null) fd.append("latitude", String(form.lat));
    if (form.lng != null) fd.append("longitude", String(form.lng));
    if (form.newImages[0]) fd.append("image", form.newImages[0]);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, false);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/create/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: buildFD(),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Ground listed successfully! Awaiting admin approval.");
        setMyGround(data.ground || data);
        setForm(INIT_FORM);
        setNewPreviews([]);
        setErrors({});
      } else {
        setApiError(data.detail || "Failed to create ground.");
      }
    } catch {
      setApiError("Network error. Please check if server is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, true);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/grounds/${myGround.id}/update/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: buildFD(),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess("Ground updated successfully!");
        setMyGround(data.ground || data);
        setEditMode(false);
        setNewPreviews([]);
      } else {
        setApiError(data.detail || "Failed to update ground.");
      }
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* View Mode */
/* ── VIEW MODE ──────────────────────────────────────────────── */
if (myGround && !editMode) {
  const imgSrc = myGround.image
    ? myGround.image.startsWith("http") 
      ? myGround.image 
      : `${BASE_URL}${myGround.image}`
    : null;

  const hasLocation = myGround.latitude != null && myGround.longitude != null;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate("/owner-dashboard")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Header */}
          <div className="px-10 pt-10 pb-6 border-b border-gray-100 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                {myGround.name}
              </h1>
              <div className="flex items-center gap-2 mt-3 text-gray-500">
                <MapPin size={20} className="text-gray-400" />
                <span className="text-lg">{myGround.location}</span>
              </div>
            </div>

            <div className={`px-6 py-2 rounded-full text-sm font-semibold border 
              ${myGround.is_approved 
                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                : "bg-amber-100 text-amber-700 border-amber-200"}`}>
              {myGround.is_approved ? "Approved" : "Pending Approval"}
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 p-10">
            
            {/* Image Section - Better Proportion */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl overflow-hidden shadow-md border border-gray-100 aspect-video bg-gray-100">
                {imgSrc ? (
                  <img 
                    src={imgSrc} 
                    alt={myGround.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl text-gray-300">
                    ⚽
                  </div>
                )}
              </div>
            </div>

            {/* Details Sidebar */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Details Card */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8">
                <h3 className="uppercase text-xs tracking-widest font-semibold text-gray-500 mb-6">Ground Details</h3>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-600">
                      <DollarSign size={22} />
                      <span className="font-medium">Price per hour</span>
                    </div>
                    <span className="font-semibold text-xl text-gray-900">
                      Rs {parseFloat(myGround.price_per_hour).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock size={22} />
                      <span className="font-medium">Opens</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {toLabel(fromBackendTime(myGround.opening_time?.slice(0, 5)))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock size={22} />
                      <span className="font-medium">Closes</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {toLabel(fromBackendTime(myGround.closing_time?.slice(0, 5)))}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin size={22} />
                      <span className="font-medium">Type</span>
                    </div>
                    <span className="font-semibold capitalize text-gray-900">
                      {myGround.ground_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={enableEdit}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-lg shadow-sm"
              >
                Edit Ground Information
              </button>

              {/* Note */}
              <div className="text-center">
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-5 py-3 rounded-2xl">
                  Only one ground is allowed per owner account
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  /* Form Mode */
  const isEdit = editMode && !!myGround;
  const existingImgSrc = isEdit && myGround?.image 
    ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}` 
    : null;

  const doneSteps = [
    !!(form.name && form.location && form.description && form.facilities),
    !!(form.opening_time.hour && form.closing_time.hour),
    !!form.price_per_hour,
    !!(form.ground_size && form.ground_type),
    newPreviews.length > 0 || (isEdit && !!existingImgSrc),
    form.lat != null && form.lng != null,
  ];

  const progress = Math.round((doneSteps.filter(Boolean).length / 6) * 100);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
            <span>{isEdit ? "Cancel Edit" : "Back to Dashboard"}</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 ml-4">
            {isEdit ? "Edit Your Ground" : "List New Futsal Ground"}
          </h1>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Progress Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 sticky top-24">
              <h3 className="font-semibold text-lg mb-6">Progress</h3>
              <div className="space-y-6">
                {[
                  "Basic Information",
                  "Operating Hours",
                  "Pricing",
                  "Specifications",
                  "Photos",
                  "Location"
                ].map((label, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${doneSteps[i] ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}>
                      {doneSteps[i] ? "✓" : i + 1}
                    </div>
                    <span className={doneSteps[i] ? "text-gray-900" : "text-gray-400"}>{label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <div className="flex justify-between text-xs mb-2 font-medium">
                  <span>Completion</span>
                  <span className="text-green-600">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="col-span-12 lg:col-span-9 space-y-8">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl">
                {apiError}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-5 rounded-2xl">
                {success}
              </div>
            )}

            <form onSubmit={isEdit ? handleUpdate : handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <Section num={1} title="Basic Information" subtitle="Name, location & description" done={doneSteps[0]}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ground Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Thamel Futsal Arena" className="w-full px-5 py-3.5 border border-gray-300 rounded-2xl focus:border-green-500 focus:ring-1 focus:ring-green-200" />
                    {errors.name && <Err>{errors.name}</Err>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                    <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Thamel, Kathmandu" className="w-full px-5 py-3.5 border border-gray-300 rounded-2xl focus:border-green-500 focus:ring-1 focus:ring-green-200" />
                    {errors.location && <Err>{errors.location}</Err>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={4} placeholder="Describe your ground..." className="w-full px-5 py-3.5 border border-gray-300 rounded-2xl focus:border-green-500 focus:ring-1 focus:ring-green-200 resize-y" />
                  {errors.description && <Err>{errors.description}</Err>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facilities * <span className="text-xs text-gray-400">(comma separated)</span></label>
                  <input name="facilities" value={form.facilities} onChange={handleChange} placeholder="Parking, Changing Room, Restroom, Water" className="w-full px-5 py-3.5 border border-gray-300 rounded-2xl focus:border-green-500 focus:ring-1 focus:ring-green-200" />
                  {errors.facilities && <Err>{errors.facilities}</Err>}
                </div>
              </Section>

              {/* Operating Hours */}
              <Section num={2} title="Operating Hours" subtitle="When is your ground open?" done={doneSteps[1]}>
                <div className="grid md:grid-cols-2 gap-8">
                  <TimePicker label="Opening Time" value={form.opening_time} onChange={(v) => setTime("opening_time", v)} error={errors.opening_time} />
                  <TimePicker label="Closing Time" value={form.closing_time} onChange={(v) => setTime("closing_time", v)} error={errors.closing_time} />
                </div>
              </Section>

              {/* Pricing */}
              <Section num={3} title="Pricing" subtitle="Set hourly rate" done={doneSteps[2]}>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price per Hour (Rs) *</label>
                  <div className="flex border border-gray-300 rounded-2xl overflow-hidden focus-within:border-green-500">
                    <span className="px-6 py-4 bg-gray-50 text-gray-500 font-medium">Rs</span>
                    <input type="number" name="price_per_hour" value={form.price_per_hour} onChange={handleChange} placeholder="1500" className="flex-1 px-5 py-4 focus:outline-none text-lg font-semibold" />
                  </div>
                  {errors.price_per_hour && <Err>{errors.price_per_hour}</Err>}
                </div>
              </Section>

              {/* Specifications */}
              <Section num={4} title="Ground Specifications" subtitle="Size and type" done={doneSteps[3]}>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Ground Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Ground Size *</label>
                    <div className="grid grid-cols-3 gap-4">
                      {["5", "6", "7"].map(size => (
                        <button key={size} type="button" onClick={() => setChoice("ground_size", size)}
                          className={`py-6 rounded-2xl border-2 transition-all ${form.ground_size === size ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <div className="text-2xl font-bold">{size}v{size}</div>
                          <div className="text-xs text-gray-500 mt-1">a-side</div>
                        </button>
                      ))}
                    </div>
                    {errors.ground_size && <Err>{errors.ground_size}</Err>}
                  </div>

                  {/* Ground Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">Ground Type *</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: "indoor", label: "Indoor", icon: "🏠" },
                        { value: "outdoor", label: "Outdoor", icon: "☀️" }
                      ].map(t => (
                        <button key={t.value} type="button" onClick={() => setChoice("ground_type", t.value)}
                          className={`p-8 rounded-2xl border-2 text-center transition-all ${form.ground_type === t.value ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <div className="text-4xl mb-3">{t.icon}</div>
                          <div className="font-semibold">{t.label}</div>
                        </button>
                      ))}
                    </div>
                    {errors.ground_type && <Err>{errors.ground_type}</Err>}
                  </div>
                </div>
              </Section>

              {/* Photos */}
              <Section num={5} title="Ground Photos" subtitle="Upload clear images" done={doneSteps[4]} badge={`${newPreviews.length}/3`}>
                {isEdit && existingImgSrc && newPreviews.length === 0 && (
                  <div className="mb-6">
                    <p className="text-xs uppercase text-gray-500 mb-3">Current Image</p>
                    <img src={existingImgSrc} alt="current" className="rounded-2xl max-h-64 w-full object-cover" />
                  </div>
                )}

                {newPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {newPreviews.map((src, i) => (
                      <div key={i} className="relative rounded-2xl overflow-hidden border border-green-200">
                        <img src={src} alt="" className="w-full h-40 object-cover" />
                        <button type="button" onClick={() => removeNewImage(i)} className="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full text-xs">✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <button type="button" onClick={() => fileRef.current.click()} className="w-full border-2 border-dashed border-gray-300 hover:border-green-400 rounded-3xl py-12 flex flex-col items-center gap-3 transition">
                  <Upload className="text-gray-400" size={40} />
                  <div>
                    <p className="font-semibold text-gray-700">Click to upload photos</p>
                    <p className="text-xs text-gray-400">JPG or PNG • Max 3 images</p>
                  </div>
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
                {errors.images && <Err>{errors.images}</Err>}
              </Section>

              {/* Map Location */}
              <Section num={6} title="Location on Map" subtitle="Help players find you easily (optional)" done={doneSteps[5]}>
                <LocationPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={({ lat, lng }) => setForm(f => ({ ...f, lat, lng }))}
                  height="380px"
                />
              </Section>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-lg rounded-3xl transition flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <>Processing...</>
                  ) : isEdit ? (
                    <>Save Changes</>
                  ) : (
                    <>Publish Ground</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}