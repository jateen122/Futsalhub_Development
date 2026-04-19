// frontend/src/pages/OwnerAddGround.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Upload, MapPin, Clock, DollarSign,
  CheckCircle, Edit3, Trash2, AlertTriangle, X,
} from "lucide-react";
import LocationPicker from "../components/LocationPicker";

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
  const h = parseInt(val.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? "12" : String(h % 12);
  return { hour, ampm };
};

const toLabel = (t) => (t?.hour ? `${t.hour}:00 ${t.ampm}` : "");

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
  closing_time:  { hour: "", ampm: "PM" },
  price_per_hour: "",
  ground_size: "",
  ground_type: "",
  lat: null,
  lng: null,
  newImages: [],
};

function FieldErr({ msg }) {
  if (!msg) return null;
  return (
    <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
      <AlertTriangle size={12} /> {msg}
    </p>
  );
}

function TimePicker({ label, value, onChange, error }) {
  const hours = ["1","2","3","4","5","6","7","8","9","10","11","12"];
  return (
    <div>
      <label className="block text-base font-semibold text-gray-700 mb-2">{label}</label>
      <div className={`bg-white border rounded-2xl overflow-hidden transition-all
        ${error ? "border-red-400" : "border-gray-200 focus-within:border-amber-500"}`}>
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between text-xs font-semibold text-gray-400">
          <span>HOUR</span>
          {value.hour && (
            <span className="text-amber-600 font-semibold">{toLabel(value)}</span>
          )}
        </div>
        <div className="grid grid-cols-6 gap-1.5 p-3 border-b border-gray-100">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => onChange({ ...value, hour: h })}
              className={`h-10 rounded-xl text-sm font-semibold transition-all
                ${value.hour === h
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-gray-50 hover:bg-amber-50 text-gray-600 hover:text-amber-700 border border-transparent hover:border-amber-200"}`}
            >
              {h}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          {["AM", "PM"].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...value, ampm: a })}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all
                ${value.ampm === a
                  ? a === "AM" ? "bg-sky-500 text-white" : "bg-amber-500 text-white"
                  : "bg-gray-50 hover:bg-gray-100 text-gray-500"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      {error && <FieldErr msg={error} />}
    </div>
  );
}

function SectionCard({ number, title, subtitle, done, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className={`w-7 h-7 rounded-2xl flex items-center justify-center text-xs font-semibold flex-shrink-0
          ${done ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500"}`}>
          {done ? <CheckCircle size={14} /> : number}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-base">{title}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function DeleteModal({ ground, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <Trash2 size={22} className="text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-1">Delete Ground?</h2>
        <p className="text-gray-500 text-sm text-center mb-1">Permanently removing:</p>
        <p className="text-gray-900 font-semibold text-center text-base mb-1">{ground.name}</p>
        <p className="text-gray-400 text-center text-xs mb-5">{ground.location}</p>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-5">
          <p className="text-red-600 text-xs text-center font-medium">This cannot be undone.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-700 rounded-2xl font-semibold hover:bg-gray-200 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-2xl hover:bg-red-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerAddGround() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const fileRef = useRef(null);

  const [form, setForm]               = useState(INIT_FORM);
  const [errors, setErrors]           = useState({});
  const [newPreviews, setNewPreviews] = useState([]);
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState("");
  const [apiError, setApiError]       = useState("");
  const [myGround, setMyGround]       = useState(null);
  const [editMode, setEditMode]       = useState(false);
  const [loadingGround, setLoadingGround] = useState(true);
  const [showDelete, setShowDelete]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const list = d.results || d || [];
        if (list.length > 0) setMyGround(list[0]);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, [token, navigate]);

  const enableEdit = () => {
    if (!myGround) return;
    setForm({
      name:           myGround.name || "",
      location:       myGround.location || "",
      description:    myGround.description || "",
      facilities:     myGround.facilities || "",
      opening_time:   fromBackendTime(myGround.opening_time?.slice(0, 5)),
      closing_time:   fromBackendTime(myGround.closing_time?.slice(0, 5)),
      price_per_hour: myGround.price_per_hour || "",
      ground_size:    myGround.ground_size || "",
      ground_type:    myGround.ground_type || "",
      lat:  myGround.latitude  != null ? parseFloat(myGround.latitude)  : null,
      lng:  myGround.longitude != null ? parseFloat(myGround.longitude) : null,
      newImages: [],
    });
    setNewPreviews([]);
    setErrors({});
    setSuccess("");
    setApiError("");
    setEditMode(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((ex) => ({ ...ex, [name]: "" }));
  };

  const setTime  = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((ex) => ({ ...ex, [field]: "" }));
  };

  const setChoice = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field]) setErrors((ex) => ({ ...ex, [field]: "" }));
  };

  const handleImages = (e) => {
    const files  = Array.from(e.target.files);
    const merged = [...form.newImages, ...files].slice(0, 3);
    setForm((f) => ({ ...f, newImages: merged }));
    setNewPreviews(merged.map((file) => URL.createObjectURL(file)));
    if (errors.images) setErrors((ex) => ({ ...ex, images: "" }));
  };

  // Remove single image (X button)
  const removeImage = (index) => {
    const updatedImages = form.newImages.filter((_, i) => i !== index);
    setForm((f) => ({ ...f, newImages: updatedImages }));
    setNewPreviews(updatedImages.map((file) => URL.createObjectURL(file)));
  };

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
    if (form.lat != null) fd.append("latitude",  String(form.lat));
    if (form.lng != null) fd.append("longitude", String(form.lng));
    if (form.newImages[0]) fd.append("image", form.newImages[0]);
    return fd;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, false);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/create/`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Ground listed. Awaiting admin approval.");
        setMyGround(data.ground || data);
        setForm(INIT_FORM);
        setNewPreviews([]);
        setErrors({});
      } else {
        setApiError(data.detail || "Failed to create ground.");
      }
    } catch {
      setApiError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate(form, true);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${myGround.id}/update/`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body:    buildFD(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Ground updated successfully!");
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`${BASE_URL}/api/grounds/${myGround.id}/delete/`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyGround(null);
      setShowDelete(false);
      setEditMode(false);
      showToast("Ground deleted.");
    } catch {
      showToast("Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEdit       = editMode && !!myGround;
  const imgSrc       = myGround?.image
    ? myGround.image.startsWith("http") ? myGround.image : `${BASE_URL}${myGround.image}`
    : null;
  const existingImgSrc = isEdit && imgSrc ? imgSrc : null;

  const doneSteps = [
    !!(form.name && form.location && form.description && form.facilities),
    !!(form.opening_time.hour && form.closing_time.hour),
    !!form.price_per_hour,
    !!(form.ground_size && form.ground_type),
    newPreviews.length > 0 || (isEdit && !!existingImgSrc),
    form.lat != null && form.lng != null,
  ];
  const progress = Math.round((doneSteps.filter(Boolean).length / 6) * 100);

  const inputCls = (field) =>
    `w-full border rounded-2xl px-4 py-3 text-base text-gray-800 bg-white placeholder-gray-400 focus:outline-none transition-all
     ${errors[field]
       ? "border-red-400 focus:border-red-400"
       : "border-gray-200 hover:border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-100"}`;

  /* ── VIEW MODE ── */
  if (myGround && !editMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 w-full pt-20">
        {toast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white border border-amber-200 text-amber-700 px-6 py-3 rounded-3xl shadow-xl text-sm font-semibold whitespace-nowrap">
            {toast}
          </div>
        )}
        {showDelete && (
          <DeleteModal
            ground={myGround}
            onConfirm={handleDelete}
            onCancel={() => setShowDelete(false)}
            deleting={deleting}
          />
        )}

        <div className="bg-white border-b border-gray-100 shadow-sm sticky top-20 z-40 w-full">
          <div className="max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/owner-dashboard")}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition text-sm"
              >
                <ArrowLeft size={18} /> Dashboard
              </button>
              <div className="h-5 w-px bg-gray-200" />
              <h1 className="text-2xl font-semibold text-gray-900">My Ground</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDelete(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-2xl text-sm font-semibold transition"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button
                onClick={enableEdit}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl text-sm transition shadow-sm"
              >
                <Edit3 size={16} /> Edit Ground
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 py-8">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="relative h-72 bg-gray-100">
              {imgSrc ? (
                <img src={imgSrc} alt={myGround.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
                  <MapPin size={48} className="text-amber-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-8">
                <h2 className="text-3xl font-semibold text-white">{myGround.name}</h2>
                <p className="text-white/70 flex items-center gap-1.5 mt-1">
                  <MapPin size={14} /> {myGround.location}
                </p>
              </div>
              <div className="absolute top-4 right-4">
                <span className={`px-4 py-1.5 rounded-2xl text-xs font-semibold border
                  ${myGround.is_approved
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "bg-amber-500 text-white border-amber-400"}`}>
                  {myGround.is_approved ? "Approved & Live" : "Pending Approval"}
                </span>
              </div>
            </div>

            <div className="p-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Price per Hour",  value: `Rs ${parseFloat(myGround.price_per_hour).toLocaleString()}` },
                { label: "Opens",           value: toLabel(fromBackendTime(myGround.opening_time?.slice(0, 5))) || "—" },
                { label: "Closes",          value: toLabel(fromBackendTime(myGround.closing_time?.slice(0, 5))) || "—" },
                { label: "Type",            value: myGround.ground_type ? myGround.ground_type.charAt(0).toUpperCase() + myGround.ground_type.slice(1) : "—" },
                { label: "Size",            value: myGround.ground_size ? `${myGround.ground_size}-a-side` : "—" },
                { label: "Facilities",      value: myGround.facilities || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-gray-900 font-semibold text-base">{value}</p>
                </div>
              ))}
            </div>

            {myGround.description && (
              <div className="px-8 pb-6">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">Description</p>
                <p className="text-gray-700 text-sm leading-relaxed">{myGround.description}</p>
              </div>
            )}

            <div className="px-8 pb-8 border-t border-gray-100 pt-6">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-2xl inline-block font-medium text-center">
                Only one ground is allowed per owner account
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM MODE (add or edit) ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 w-full pt-20">

      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-20 z-40 w-full">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition text-sm"
            >
              <ArrowLeft size={18} />
              {isEdit ? "Cancel Edit" : "Dashboard"}
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-2xl font-semibold text-gray-900">
              {isEdit ? "Edit Ground" : "List New Ground"}
            </h1>
          </div>
        </div>
      </div>

      <div className="w-full max-w-screen-2xl mx-auto px-6 md:px-10 lg:px-14 py-8">
        <div className="grid grid-cols-12 gap-8">

          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-3xl p-6 sticky top-28 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-5 text-base">Progress</h3>
              <div className="space-y-4">
                {[
                  "Basic Information",
                  "Operating Hours",
                  "Pricing",
                  "Specifications",
                  "Photos",
                  "Location",
                ].map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-2xl flex items-center justify-center text-xs flex-shrink-0
                      ${doneSteps[i] ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {doneSteps[i] ? <CheckCircle size={13} /> : i + 1}
                    </div>
                    <span className={`text-base ${doneSteps[i] ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <div className="flex justify-between text-xs mb-2 font-medium text-gray-400">
                  <span>Completion</span>
                  <span className="text-amber-600">{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {apiError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-3xl mb-6 flex items-center gap-2 text-sm">
                <AlertTriangle size={16} /> {apiError}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-3xl mb-6 flex items-center gap-2 text-sm">
                <CheckCircle size={16} /> {success}
              </div>
            )}

            <form onSubmit={isEdit ? handleUpdate : handleSubmit} className="space-y-5">

              {/* Basic Info */}
              <SectionCard number={1} title="Basic Information" subtitle="Name, location & description" done={doneSteps[0]}>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">Ground Name *</label>
                    <input name="name" value={form.name} onChange={handleChange}
                      placeholder="Ground name" className={inputCls("name")} />
                    <FieldErr msg={errors.name} />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-2">Location *</label>
                    <input name="location" value={form.location} onChange={handleChange}
                      placeholder="Location" className={inputCls("location")} />
                    <FieldErr msg={errors.location} />
                  </div>
                </div>
                <div className="mt-5">
                  <label className="block text-base font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange}
                    rows={4} placeholder="Describe your ground..." 
                    className={`${inputCls("description")} resize-none`} />
                  <FieldErr msg={errors.description} />
                </div>
                <div className="mt-5">
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Facilities * <span className="text-xs font-normal text-gray-400">(comma separated)</span>
                  </label>
                  <input name="facilities" value={form.facilities} onChange={handleChange}
                    placeholder="Parking, Shower, WiFi..." className={inputCls("facilities")} />
                  <FieldErr msg={errors.facilities} />
                </div>
              </SectionCard>

              {/* Operating Hours */}
              <SectionCard number={2} title="Operating Hours" subtitle="When is your ground open?" done={doneSteps[1]}>
                <div className="grid md:grid-cols-2 gap-6">
                  <TimePicker label="Opening Time" value={form.opening_time}
                    onChange={(v) => setTime("opening_time", v)} error={errors.opening_time} />
                  <TimePicker label="Closing Time" value={form.closing_time}
                    onChange={(v) => setTime("closing_time", v)} error={errors.closing_time} />
                </div>
                {form.opening_time.hour && form.closing_time.hour && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                    <Clock size={15} className="text-amber-600" />
                    <p className="text-amber-700 font-semibold text-sm">
                      {toLabel(form.opening_time)} – {toLabel(form.closing_time)}
                    </p>
                    <CheckCircle size={14} className="ml-auto text-amber-500" />
                  </div>
                )}
              </SectionCard>

              {/* Pricing */}
              <SectionCard number={3} title="Pricing" subtitle="Set your hourly rate" done={doneSteps[2]}>
                <div className="max-w-sm">
                  <label className="block text-base font-semibold text-gray-700 mb-2">Price per Hour (Rs) *</label>
                  <div className={`flex border rounded-2xl overflow-hidden transition-all
                    ${errors.price_per_hour
                      ? "border-red-400"
                      : "border-gray-200 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-100"}`}>
                    <span className="px-4 py-3.5 bg-gray-50 text-gray-500 font-semibold text-sm border-r border-gray-200">
                      Rs
                    </span>
                    <input type="number" name="price_per_hour" value={form.price_per_hour}
                      onChange={handleChange} placeholder="1500"
                      className="flex-1 px-4 py-3.5 text-gray-900 font-semibold text-xl focus:outline-none bg-white" />
                    <span className="px-4 py-3.5 bg-gray-50 text-gray-400 text-sm border-l border-gray-200">/hr</span>
                  </div>
                  <FieldErr msg={errors.price_per_hour} />
                </div>
              </SectionCard>

              {/* Specifications */}
              <SectionCard number={4} title="Ground Specifications" subtitle="Size and surface type" done={doneSteps[3]}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-3">Ground Size *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {["5", "6", "7"].map((size) => (
                        <button
                          key={size} type="button" onClick={() => setChoice("ground_size", size)}
                          className={`py-5 rounded-2xl border-2 transition-all text-center
                            ${form.ground_size === size
                              ? "border-amber-500 bg-amber-50"
                              : "border-gray-200 hover:border-amber-400 bg-white"}`}
                        >
                          <div className="text-xl font-semibold text-gray-900">{size}v{size}</div>
                          <div className="text-xs text-gray-400 mt-0.5">a-side</div>
                        </button>
                      ))}
                    </div>
                    <FieldErr msg={errors.ground_size} />
                  </div>
                  <div>
                    <label className="block text-base font-semibold text-gray-700 mb-3">Ground Type *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "indoor",  label: "Indoor"  },
                        { value: "outdoor", label: "Outdoor" },
                      ].map((t) => (
                        <button
                          key={t.value} type="button" onClick={() => setChoice("ground_type", t.value)}
                          className={`py-5 rounded-2xl border-2 text-center transition-all font-semibold text-sm
                            ${form.ground_type === t.value
                              ? "border-amber-500 bg-amber-50 text-amber-800"
                              : "border-gray-200 hover:border-amber-400 bg-white text-gray-700"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <FieldErr msg={errors.ground_type} />
                  </div>
                </div>
              </SectionCard>

              {/* Photos with X delete button */}
              <SectionCard number={5} title="Ground Photos" subtitle="Upload clear images of your ground" done={doneSteps[4]}>
                {isEdit && existingImgSrc && newPreviews.length === 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Current Photo</p>
                    <div className="rounded-2xl overflow-hidden border border-gray-200 h-48">
                      <img src={existingImgSrc} alt="current" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                {newPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {newPreviews.map((src, i) => (
                      <div key={i} className="relative rounded-2xl overflow-hidden border-2 border-amber-400 h-36 group">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {/* X button to delete image */}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-2xl flex items-center justify-center shadow transition-all opacity-80 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50 rounded-3xl py-12 flex flex-col items-center gap-3 transition-all"
                >
                  <Upload size={32} className="text-amber-300" />
                  <div>
                    <p className="font-semibold text-gray-700 text-base">Click to upload photos</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG or PNG · Max 3 images</p>
                  </div>
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
                <FieldErr msg={errors.images} />
              </SectionCard>

              {/* Location */}
              <SectionCard number={6} title="Location on Map" subtitle="Help players find your ground" done={doneSteps[5]}>
                <LocationPicker
                  lat={form.lat}
                  lng={form.lng}
                  onChange={({ lat, lng }) => setForm((f) => ({ ...f, lat, lng }))}
                  height="360px"
                />
              </SectionCard>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => isEdit ? setEditMode(false) : navigate("/owner-dashboard")}
                  className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-3xl hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white font-semibold text-base rounded-3xl transition flex items-center justify-center gap-3 shadow-sm"
                >
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <><Save size={18} /> {isEdit ? "Save Changes" : "Publish Ground"}</>
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