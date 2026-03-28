import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import login1 from "../assets/login1.jpg";
import login2 from "../assets/login2.jpg";

const BASE_URL = "http://127.0.0.1:8000";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "player",
    password: "",
    password2: "",
  });

  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError,setApiError]= useState("");

  // Image slider
  const images  = [login1, login2];
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCurrent(p => (p + 1) % images.length), 3500);
    return () => clearInterval(id);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: "" }));
    if (apiError)     setApiError("");
  };

  const validate = () => {
    const e = {};
    if (!formData.email.trim())       e.email     = "Email is required.";
    if (!formData.full_name.trim())   e.full_name  = "Full name is required.";
    if (!formData.password)           e.password   = "Password is required.";
    if (formData.password.length < 8) e.password   = "Password must be at least 8 characters.";
    if (formData.password !== formData.password2)
                                      e.password2  = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const res = await axios.post(`${BASE_URL}/api/accounts/register/`, formData);

      // ✅ Registration succeeded — redirect to OTP page
      navigate("/verify-otp", {
        state: {
          email:    formData.email.toLowerCase().trim(),
          message:  res.data.message,
        },
      });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === "object") {
        // Map field-level errors
        const fieldErrors = {};
        let general = "";
        Object.entries(data).forEach(([key, val]) => {
          const msg = Array.isArray(val) ? val[0] : val;
          if (["email","full_name","phone","password","password2","role"].includes(key)) {
            fieldErrors[key] = msg;
          } else {
            general = msg;
          }
        });
        setErrors(fieldErrors);
        if (general) setApiError(general);
      } else {
        setApiError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls = (field) =>
    `w-full bg-black/40 border p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-white transition
     ${errors[field] ? "border-red-500" : "border-white/10"}`;

  return (
    <div className="min-h-screen flex bg-black text-white pt-16">

      {/* Left image slider */}
      <div className="hidden lg:flex w-1/2 h-[calc(100vh-64px)] relative overflow-hidden">
        {images.map((img, i) => (
          <img key={i} src={img} alt="register"
            className={`absolute w-full h-full object-cover transition-opacity duration-1000
              ${i === current ? "opacity-100" : "opacity-0"}`} />
        ))}
        <div className="absolute inset-0 bg-black/40" />

        {/* Overlay text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12">
          <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-sm">
            <p className="text-5xl mb-4">⚽</p>
            <h2 className="text-2xl font-black text-white mb-3">Join FutsalHub</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Book futsal grounds instantly. Real-time availability.
              Pay with Khalti or Cash.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-semibold">OTP email verification required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 h-[calc(100vh-64px)] flex items-center justify-center px-8 lg:px-16 overflow-y-auto">
        <div className="w-full max-w-lg py-8">

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl">

            <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
            <p className="text-white/40 text-sm text-center mb-8">
              We'll send a 6-digit OTP to verify your email
            </p>

            {/* General API error */}
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-5 text-sm flex items-center gap-2">
                <span>⚠</span> {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Email */}
              <div>
                <input type="email" name="email" placeholder="Email address"
                  value={formData.email} onChange={handleChange}
                  className={inputCls("email")} />
                {errors.email && <p className="text-red-400 text-xs mt-1 ml-1">⚠ {errors.email}</p>}
              </div>

              {/* Full name */}
              <div>
                <input type="text" name="full_name" placeholder="Full name"
                  value={formData.full_name} onChange={handleChange}
                  className={inputCls("full_name")} />
                {errors.full_name && <p className="text-red-400 text-xs mt-1 ml-1">⚠ {errors.full_name}</p>}
              </div>

              {/* Phone */}
              <div>
                <input type="text" name="phone" placeholder="Phone (optional)"
                  value={formData.phone} onChange={handleChange}
                  className={inputCls("phone")} />
              </div>

              {/* Role */}
              <div>
                <select name="role" value={formData.role} onChange={handleChange}
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-amber-400 text-white">
                  <option value="player">Player</option>
                  <option value="owner">Ground Owner</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <input type="password" name="password" placeholder="Password (min 8 chars)"
                  value={formData.password} onChange={handleChange}
                  className={inputCls("password")} />
                {errors.password && <p className="text-red-400 text-xs mt-1 ml-1">⚠ {errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <input type="password" name="password2" placeholder="Confirm password"
                  value={formData.password2} onChange={handleChange}
                  className={inputCls("password2")} />
                {errors.password2 && <p className="text-red-400 text-xs mt-1 ml-1">⚠ {errors.password2}</p>}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full bg-amber-400 text-black font-bold py-4 rounded-lg
                           hover:bg-amber-300 transition text-lg disabled:opacity-50
                           disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account →"
                )}
              </button>

            </form>

            <p className="text-center mt-6 text-white/40 text-sm">
              Already have an account?{" "}
              <span onClick={() => navigate("/login")}
                className="text-amber-400 cursor-pointer hover:underline font-semibold">
                Sign in
              </span>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}
