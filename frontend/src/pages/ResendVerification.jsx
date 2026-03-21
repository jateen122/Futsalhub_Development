import { useState } from "react";
import { Link } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

export default function ResendVerification() {
  const [email,      setEmail]      = useState("");
  const [status,     setStatus]     = useState("idle"); // idle | loading | done | error
  const [message,    setMessage]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading"); setMessage("");

    try {
      const res  = await fetch(`${BASE_URL}/api/accounts/resend-verification/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      setMessage(data.message || "Done.");
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-md w-full overflow-hidden">

        <div className="bg-green-500 px-8 py-7 text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">📧</div>
          <h1 className="text-xl font-black text-white">Resend Verification</h1>
          <p className="text-green-100 text-sm mt-1">We'll send a fresh verification link</p>
        </div>

        <div className="px-8 py-7">

          {status === "done" ? (
            <div className="text-center">
              <p className="text-4xl mb-4">✅</p>
              <p className="text-gray-700 font-semibold mb-2">Email sent!</p>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link to="/login"
                className="block py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter the email address you registered with. We'll send a new verification link.
              </p>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStatus("idle"); }}
                  placeholder="your@email.com"
                  required
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm font-medium focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition placeholder-gray-300"
                />
              </div>

              {status === "error" && (
                <p className="text-red-500 text-sm flex items-center gap-1.5">⚠ {message}</p>
              )}

              <button type="submit" disabled={status === "loading" || !email.trim()}
                className="w-full py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                {status === "loading"
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                  : "Send Verification Email"}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-gray-400 text-sm hover:text-gray-600 transition">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
