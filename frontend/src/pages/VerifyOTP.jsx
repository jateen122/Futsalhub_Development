// frontend/src/pages/VerifyOTP.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";

const BASE_URL        = "http://127.0.0.1:8000";
const RESEND_COOLDOWN = 60;
const OTP_LENGTH      = 6;

export default function VerifyOTP() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const emailFromState = location.state?.email || "";
  const [email, setEmail]         = useState(emailFromState);
  const [emailInput, setEmailInput] = useState(emailFromState);

  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [status, setStatus]   = useState("idle");

  const [resending, setResending]   = useState(false);
  const [resendMsg, setResendMsg]   = useState(location.state?.message || "");
  const [cooldown, setCooldown]     = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const startCooldown = useCallback((seconds = RESEND_COOLDOWN) => {
    setCooldown(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (emailFromState) startCooldown();
    return () => clearInterval(timerRef.current);
  }, []);

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1 && next.every((d) => d)) {
      submitOTP(next.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        const next = [...otp];
        next[index] = "";
        setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...otp];
        next[index - 1] = "";
        setOtp(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const digits = text.split("");
    const next = Array(OTP_LENGTH).fill("");
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    if (text.length === OTP_LENGTH) submitOTP(text);
  };

  const submitOTP = async (otpString) => {
    const target = email || emailInput.trim().toLowerCase();
    if (!target) { setError("Please enter your email address."); return; }
    if (otpString.length < OTP_LENGTH) { setError("Please enter all 6 digits."); return; }

    setLoading(true);
    setStatus("verifying");
    setError("");

    try {
      await axios.post(`${BASE_URL}/api/accounts/verify-otp/`, {
        email: target,
        otp: otpString,
      });

      setStatus("success");
      setSuccess(true);

      setTimeout(() => {
        navigate("/login", {
          state: { message: "✅ Email verified! You can now log in." }
        });
      }, 2500);
    } catch (err) {
      setStatus("error");
      const data = err.response?.data;
      const code = data?.error_code;

      if (code === "EXPIRED") {
        setError("Your OTP has expired. Please request a new one below.");
        setOtp(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      } else if (code === "MAX_ATTEMPTS") {
        setError("Too many failed attempts. Please request a new OTP.");
        setOtp(Array(OTP_LENGTH).fill(""));
      } else if (code === "WRONG_OTP") {
        const left = data?.attempts_left ?? "—";
        setAttemptsLeft(left);
        setError(`Incorrect OTP. ${left} attempt(s) remaining.`);
        setOtp(Array(OTP_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(data?.detail || "Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitOTP(otp.join(""));
  };

  const handleResend = async () => {
    const target = email || emailInput.trim().toLowerCase();
    if (!target) { setError("Please enter your email address."); return; }
    if (cooldown > 0) return;

    setResending(true);
    setResendMsg("");
    setError("");

    try {
      const res = await axios.post(`${BASE_URL}/api/accounts/resend-otp/`, { email: target });
      setResendMsg(res.data.message || "New OTP sent!");
      setOtp(Array(OTP_LENGTH).fill(""));
      setAttemptsLeft(5);
      startCooldown();
      inputRefs.current[0]?.focus();
    } catch (err) {
      const data = err.response?.data;
      const code = data?.error_code;
      if (code === "COOLDOWN") {
        const secs = data?.cooldown_seconds || RESEND_COOLDOWN;
        setError(`Please wait ${secs}s before requesting a new OTP.`);
        startCooldown(secs);
      } else {
        setError(data?.detail || "Failed to resend OTP. Try again.");
      }
    } finally {
      setResending(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <CheckCircle size={80} className="text-amber-500" />
          </div>
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-600 text-base mb-8">Your account is now active.</p>
          <p className="text-amber-600 text-sm">Redirecting to login…</p>
          <div className="mt-6 w-40 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-[grow_2.5s_linear_forwards]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 w-full flex items-center justify-center px-6 py-12">

      <div className="max-w-screen-2xl mx-auto w-full">

        <div className="flex justify-center mb-8">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition text-sm"
          >
            <ArrowLeft size={18} /> Back to Login
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm max-w-md mx-auto overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Check your inbox</h1>
            <p className="text-amber-100 text-base mt-2">
              We sent a 6-digit code to
              {email ? (
                <><br /><span className="font-medium">{email}</span></>
              ) : (
                " your email address"
              )}
            </p>
          </div>

          <div className="px-8 py-8">

            {/* Email input when no state */}
            {!emailFromState && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-3xl px-5 py-4 text-base focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            )}

            {/* Resend message */}
            {resendMsg && !error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl px-4 py-3 mb-5 text-sm text-center">
                {resendMsg}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 mb-5 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* OTP inputs */}
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={loading}
                    className={`w-12 h-14 text-center text-3xl font-semibold rounded-2xl border-2 bg-white
                      ${digit
                        ? "border-amber-500 bg-amber-50 text-gray-900"
                        : "border-gray-200 focus:border-amber-400"}
                      focus:outline-none transition-all`}
                  />
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${(otp.filter(d => d).length / OTP_LENGTH) * 100}%` }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.filter(d => d).length < OTP_LENGTH}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-3xl text-base transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <Send size={18} /> Verify Email
                  </>
                )}
              </button>
            </form>

            {/* Resend */}
            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm mb-2">Didn't receive the code?</p>
              {cooldown > 0 ? (
                <div className="text-amber-600 text-sm font-medium">
                  Resend available in {Math.floor(cooldown / 60)}:{String(cooldown % 60).padStart(2, "0")}
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-amber-500 hover:text-amber-600 font-semibold text-sm transition flex items-center gap-1 mx-auto"
                >
                  {resending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "↺ Resend OTP"
                  )}
                </button>
              )}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => navigate("/register")}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium transition"
              >
                ← Back to registration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}