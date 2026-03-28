import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const BASE_URL        = "http://127.0.0.1:8000";
const RESEND_COOLDOWN = 60; // seconds — must match backend OTP_COOLDOWN_SECONDS
const OTP_LENGTH      = 6;

/* ── Tiny animated check icon ─────────────────────────────────────────── */
function CheckCircle() {
  return (
    <svg viewBox="0 0 52 52" className="w-20 h-20">
      <circle cx="26" cy="26" r="25" fill="none" stroke="#10b981"
        strokeWidth="2" strokeDasharray="157" strokeDashoffset="157"
        style={{ animation: "dash 0.6s ease forwards" }} />
      <path fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round"
        strokeLinejoin="round" d="M14 27 l8 8 l16-16"
        strokeDasharray="34" strokeDashoffset="34"
        style={{ animation: "dash 0.4s 0.5s ease forwards" }} />
      <style>{`
        @keyframes dash { to { stroke-dashoffset: 0; } }
      `}</style>
    </svg>
  );
}

export default function VerifyOTP() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Email comes from registration redirect
  const emailFromState = location.state?.email || "";
  const [email, setEmail]         = useState(emailFromState);
  const [emailInput, setEmailInput] = useState(emailFromState); // shown when no state

  // OTP input — array of 6 digits
  const [otp,    setOtp]    = useState(Array(OTP_LENGTH).fill(""));
  const inputRefs            = useRef([]);

  // UI state
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);
  const [status,   setStatus]   = useState("idle"); // idle | verifying | success | error

  // Resend state
  const [resending,   setResending]   = useState(false);
  const [resendMsg,   setResendMsg]   = useState(location.state?.message || "");
  const [cooldown,    setCooldown]    = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const timerRef = useRef(null);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer
  const startCooldown = useCallback((seconds = RESEND_COOLDOWN) => {
    setCooldown(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start cooldown on mount (user just registered)
  useEffect(() => {
    if (emailFromState) startCooldown();
    return () => clearInterval(timerRef.current);
  }, []);

  // ── OTP input handlers ──────────────────────────────────────────────────

  const handleDigitChange = (index, value) => {
    // Accept only digits
    const digit = value.replace(/\D/, "").slice(-1);
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");

    // Auto-advance to next box
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === OTP_LENGTH - 1 && next.every(d => d)) {
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
    const text   = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const digits = text.split("");
    const next   = Array(OTP_LENGTH).fill("");
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    // Focus the last filled box
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    if (text.length === OTP_LENGTH) submitOTP(text);
  };

  // ── Submit OTP ──────────────────────────────────────────────────────────

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
        otp:   otpString,
      });

      setStatus("success");
      setSuccess(true);

      // Redirect to login after 2.5 seconds
      setTimeout(() => navigate("/login", {
        state: { message: "✅ Email verified! You can now log in." }
      }), 2500);

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
        // Shake animation — clear and refocus
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

  // ── Resend OTP ──────────────────────────────────────────────────────────

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

  // ── Render: success screen ──────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle />
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Email Verified!</h2>
          <p className="text-white/50 mb-2">Your account is now active.</p>
          <p className="text-emerald-400 text-sm">Redirecting to login…</p>
          <div className="mt-4 w-32 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full"
              style={{ animation: "grow 2.5s linear forwards" }} />
          </div>
          <style>{`@keyframes grow { from{width:0%} to{width:100%} }`}</style>
        </div>
      </div>
    );
  }

  // ── Render: OTP form ────────────────────────────────────────────────────

  const filledCount = otp.filter(d => d).length;
  const allFilled   = filledCount === OTP_LENGTH;

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4 pt-16">

      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Card */}
        <div className="bg-white/4 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/20
                            flex items-center justify-center text-4xl">
              📧
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-black text-white text-center mb-2">
            Check your inbox
          </h1>
          <p className="text-white/40 text-sm text-center mb-6 leading-relaxed">
            We sent a 6-digit verification code to
            {email ? (
              <><br /><span className="text-amber-400 font-semibold">{email}</span></>
            ) : (
              " your email address"
            )}
          </p>

          {/* Email input — shown only when no email from state */}
          {!emailFromState && (
            <div className="mb-5">
              <input
                type="email"
                placeholder="Enter your email address"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                           text-white placeholder-white/30 text-sm focus:outline-none
                           focus:border-amber-400/50 transition"
              />
            </div>
          )}

          {/* Success resend message */}
          {resendMsg && !error && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl
                            px-4 py-3 mb-5 text-emerald-400 text-sm text-center">
              ✉️ {resendMsg}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl
                            px-4 py-3 mb-5 text-red-400 text-sm text-center
                            animate-[wiggle_0.3s_ease]">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* OTP digit inputs */}
            <div className="flex justify-center gap-3 mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading || success}
                  className={`
                    w-12 h-14 text-center text-2xl font-black rounded-xl border-2
                    bg-white/5 text-white caret-amber-400 outline-none
                    transition-all duration-200 select-none
                    ${digit
                      ? "border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                      : "border-white/15 hover:border-white/30 focus:border-amber-400/60"}
                    ${loading ? "opacity-50 cursor-not-allowed" : "cursor-text"}
                    ${status === "error" && !digit ? "border-red-500/40" : ""}
                  `}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${(filledCount / OTP_LENGTH) * 100}%` }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !allFilled || success}
              className="w-full py-4 bg-amber-400 text-black font-black rounded-xl
                         hover:bg-amber-300 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verifying…
                </>
              ) : (
                "Verify Email →"
              )}
            </button>

          </form>

          {/* Resend section */}
          <div className="mt-6 text-center">
            <p className="text-white/30 text-sm mb-3">Didn't receive the code?</p>
            {cooldown > 0 ? (
              <div className="inline-flex items-center gap-2 text-white/40 text-sm">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
                Resend in{" "}
                <span className="text-amber-400 font-bold tabular-nums">
                  {String(Math.floor(cooldown / 60)).padStart(2, "0")}:
                  {String(cooldown % 60).padStart(2, "0")}
                </span>
              </div>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-amber-400 font-bold text-sm hover:text-amber-300
                           transition disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-1.5 mx-auto"
              >
                {resending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : (
                  "↺ Resend OTP"
                )}
              </button>
            )}
          </div>

          {/* Back to register */}
          <div className="mt-6 pt-6 border-t border-white/8 text-center">
            <button
              onClick={() => navigate("/register")}
              className="text-white/30 hover:text-white text-sm transition"
            >
              ← Back to registration
            </button>
          </div>

        </div>

        {/* Helper tip */}
        <p className="text-center text-white/20 text-xs mt-6 px-4">
          The code expires in 5 minutes. Check your spam folder if you don't see it.
        </p>

      </div>
    </div>
  );
}
