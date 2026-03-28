import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  User, Phone, MapPin, Mail, Calendar, Shield, 
  Edit3, Save, LogOut, ArrowLeft 
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const ROLE_STYLE = {
  player: "bg-blue-100 text-blue-700 border-blue-200",
  owner:  "bg-amber-100 text-amber-700 border-amber-200",
  admin:  "bg-violet-100 text-violet-700 border-violet-200",
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-3.5 rounded-2xl shadow-xl text-sm font-medium border
      ${type === "error" 
        ? "bg-red-50 border-red-200 text-red-700" 
        : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
      {msg}
    </div>
  );
}

function Avatar({ src, name, size = "w-28 h-28" }) {
  const [err, setErr] = useState(false);
  
  if (src && !err) {
    return (
      <img 
        src={src} 
        alt={name} 
        onError={() => setErr(true)}
        className={`${size} rounded-2xl object-cover border-4 border-white shadow-md`} 
      />
    );
  }

  return (
    <div className={`${size} rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-5xl shadow-md border-4 border-white`}>
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const fileRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Profile");
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Profile Edit Form
  const [form, setForm] = useState({ full_name: "", phone: "", city: "" });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Password Change
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  // Activity
  const [activity, setActivity] = useState(null);
  const [actLoading, setActLoading] = useState(false);

  /* Fetch Profile */
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${BASE_URL}/api/accounts/profile/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProfile(d);
        setForm({
          full_name: d.full_name || "",
          phone: d.phone || "",
          city: d.city || ""
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, navigate]);

  /* Fetch Activity */
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
  }, [tab, token, activity]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  };

  const dashPath = profile?.role === "owner" 
    ? "/owner-dashboard" 
    : profile?.role === "admin" 
      ? "/admin-dashboard" 
      : "/player-dashboard";

  /* Save Profile */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData();
    fd.append("full_name", form.full_name);
    fd.append("phone", form.phone);
    fd.append("city", form.city);
    if (imageFile) fd.append("profile_image", imageFile);

    try {
      const res = await fetch(`${BASE_URL}/api/accounts/profile/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        setProfile(data.user || data);
        setImageFile(null);
        setImagePreview(null);
        showToast("Profile updated successfully!");
      } else {
        showToast(data?.detail || "Failed to update profile.", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /* Change Password */
  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwErrors({});

    if (!pwForm.old_password || !pwForm.new_password) {
      setPwErrors({ general: "Both fields are required." });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/accounts/change-password/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(pwForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Password changed successfully. Logging you out...");
        setTimeout(() => {
          localStorage.clear();
          navigate("/login");
        }, 1800);
      } else {
        setPwErrors({
          general: data.detail || data.non_field_errors?.[0] || "Failed to change password."
        });
      }
    } catch {
      setPwErrors({ general: "Network error occurred." });
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">

        {/* Back Button */}
        <button
          onClick={() => navigate(dashPath)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account information</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-semibold border capitalize ${ROLE_STYLE[profile?.role] || ROLE_STYLE.player}`}>
            {profile?.role}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="relative flex-shrink-0 mx-auto md:mx-0">
              <Avatar src={avatarSrc} name={profile?.full_name} />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-white shadow-md border border-gray-200 rounded-full p-2 hover:bg-yellow-50 transition"
              >
                <Edit3 size={18} className="text-yellow-600" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
              <h2 className="text-3xl font-semibold text-gray-900">
                {profile?.full_name || "User"}
              </h2>
              <div className="flex items-center gap-2 justify-center md:justify-start text-gray-500 mt-2">
                <Mail size={18} />
                <span>{profile?.email}</span>
              </div>
              {profile?.city && (
                <div className="flex items-center gap-2 justify-center md:justify-start text-gray-500 mt-1">
                  <MapPin size={18} />
                  <span>{profile.city}</span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                {profile?.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Verified
                  </span>
                ) : (
                  <span className="px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                    Verification Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {imageFile && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="font-medium text-yellow-700">New photo selected</p>
                <p className="text-yellow-600 text-sm">Click "Save Changes" to update</p>
              </div>
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          {["Profile", "Security", "Activity"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-4 font-semibold text-lg transition-all border-b-2 -mb-px
                ${tab === t 
                  ? "border-yellow-500 text-yellow-600" 
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "Profile" && (
          <form onSubmit={handleProfileSave} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
            <h3 className="text-2xl font-semibold mb-8 flex items-center gap-3">
              <User className="text-yellow-600" /> Personal Information
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400 transition"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Phone Number</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400 transition"
                  placeholder="+977 98XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400 transition"
                  placeholder="Kathmandu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Email Address</label>
                <input
                  value={profile?.email || ""}
                  readOnly
                  className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end mt-10">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-10 py-4 rounded-2xl transition disabled:opacity-70"
              >
                {saving ? (
                  <>Saving Changes...</>
                ) : (
                  <>
                    <Save size={20} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {tab === "Security" && (
          <div className="space-y-8">
            <form onSubmit={handlePwChange} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
              <h3 className="text-2xl font-semibold mb-8 flex items-center gap-3">
                <Shield className="text-yellow-600" /> Change Password
              </h3>

              {pwErrors.general && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                  {pwErrors.general}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={pwForm.old_password}
                    onChange={(e) => setPwForm(f => ({ ...f, old_password: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">New Password</label>
                  <input
                    type="password"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                    className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:border-yellow-400"
                    placeholder="New password (min 8 characters)"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-10">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-10 py-4 rounded-2xl transition disabled:opacity-70"
                >
                  {pwSaving ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Activity Tab */}
        {tab === "Activity" && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10">
            {actLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !activity ? (
              <p className="text-center text-gray-500 py-20">No activity data available.</p>
            ) : (
              <div>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  {[
                    { label: "Total Bookings", value: activity.total_bookings || 0 },
                    { label: "Total Spent", value: `Rs ${parseFloat(activity.total_spent || 0).toFixed(0)}` },
                    { label: "Last Booking", value: activity.last_booking ? "Recent" : "None" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center">
                      <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-gray-500 mt-2 text-sm">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {activity.last_booking && (
                  <div>
                    <h3 className="text-xl font-semibold mb-6">Most Recent Booking</h3>
                    <div className="space-y-4">
                      {Object.entries({
                        Ground: activity.last_booking.ground_name,
                        Date: activity.last_booking.date,
                        Time: `${activity.last_booking.start_time} - ${activity.last_booking.end_time}`,
                        Amount: `Rs ${activity.last_booking.total_price}`,
                        Status: activity.last_booking.status,
                      }).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-4 border-b border-gray-100 last:border-0">
                          <span className="text-gray-500">{key}</span>
                          <span className="font-medium text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}