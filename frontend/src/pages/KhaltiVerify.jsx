// frontend/src/pages/KhaltiVerify.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 2500;

function fmtTime(t) {
  if (!t) return "";
  const parts = String(t).split(":");
  const hour = parseInt(parts[0], 10);
  const min  = parts[1] || "00";
  return `${hour % 12 || 12}:${min} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function KhaltiVerify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token    = localStorage.getItem("access");

  const [stage,   setStage]   = useState("verifying"); // verifying | success | failed | canceled | pending
  const [data,    setData]    = useState(null);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const pidx         = params.get("pidx");
  const khaltiStatus = params.get("status");   // from Khalti redirect URL params
  const hasAttempted = useRef(false);

  const doVerify = async (tryNum) => {
    setAttempt(tryNum);
    try {
      const res = await fetch(`${BASE_URL}/api/payments/verify/`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ pidx }),
      });

      // Handle non-200 HTTP codes gracefully
      if (!res.ok) {
        const txt = await res.text();
        console.error("Verify HTTP error:", res.status, txt);
        if (tryNum < MAX_RETRIES) {
          setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
        } else {
          setStage("failed");
          setMessage(`Server error (${res.status}). Please check your bookings page — the booking may have been created.`);
        }
        return;
      }

      const result = await res.json();
      console.log("Verify result:", result);

      if (result.status === "success") {
        setData(result);
        setStage("success");

      } else if (result.status === "pending") {
        // Retry a few times for pending
        if (tryNum < MAX_RETRIES) {
          setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
        } else {
          setStage("pending");
          setMessage(result.message || "Payment is being processed. Check your bookings page.");
        }

      } else if (result.status === "canceled") {
        setStage("canceled");

      } else {
        // failed
        setStage("failed");
        setMessage(result.message || result.detail || "Payment was not completed.");
      }

    } catch (err) {
      console.error("Verify fetch error:", err);
      if (tryNum < MAX_RETRIES) {
        setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
      } else {
        setStage("failed");
        setMessage(
          "Could not contact the server to verify payment. " +
          "Please check your bookings page — if the payment went through, your booking will appear there."
        );
      }
    }
  };

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (!token) { navigate("/login"); return; }

    // Khalti signals cancellation via the URL param
    if (khaltiStatus === "User canceled") {
      setStage("canceled");
      return;
    }

    if (!pidx) {
      setStage("failed");
      setMessage("No payment identifier found in the URL.");
      return;
    }

    doVerify(0);
  }, []);

  /* ─── VERIFYING ─────────────────────────────────────────────── */
  if (stage === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🟣</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment…</h2>
          <p className="text-gray-500 text-sm">
            Confirming your payment with Khalti. Please do not close this page.
          </p>
          {attempt > 0 && (
            <p className="text-purple-500 text-xs mt-3 font-medium">
              Attempt {attempt + 1} of {MAX_RETRIES + 1}…
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ─── SUCCESS ────────────────────────────────────────────────── */
  if (stage === "success" && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
              ✅
            </div>
            <h2 className="text-2xl font-black text-white">Booking Confirmed!</h2>
            <p className="text-green-100 text-sm mt-1">Payment verified via Khalti</p>
          </div>

          {/* Details */}
          <div className="px-8 py-6 space-y-3">
            {[
              ["Ground",   data.ground_name],
              ["Date",     data.date],
              ["Time",     `${fmtTime(data.start_time)} – ${fmtTime(data.end_time)}`],
              ["Method",   "🟣 Khalti"],
            ].map(([k, v]) => (
              <div key={k}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-800 font-semibold">{v}</span>
              </div>
            ))}

            <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 mt-2">
              <span className="text-green-700 font-semibold">Amount Paid</span>
              <span className="text-green-700 font-black text-xl">Rs {data.amount}</span>
            </div>

            {data.transaction_id && (
              <div className="text-center mt-1">
                <p className="text-gray-400 text-xs">Transaction ID</p>
                <p className="text-gray-600 font-mono text-xs font-semibold break-all">
                  {data.transaction_id}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-8 pb-6 flex gap-3">
            <button onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
              My Bookings
            </button>
            <button onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm">
              Browse Grounds
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── CANCELED ───────────────────────────────────────────────── */
  if (stage === "canceled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Payment Cancelled</h2>
          <p className="text-gray-500 text-sm mb-6">
            You cancelled the Khalti payment. No booking was made — the slot is still available.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
              Book Again
            </button>
            <button onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm">
              My Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── PENDING ────────────────────────────────────────────────── */
  if (stage === "pending") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow border border-amber-200 max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-black text-amber-700 mb-2">Payment Processing</h2>
          <p className="text-gray-500 text-sm mb-2">{message}</p>
          <p className="text-gray-400 text-xs mb-6">
            If Khalti completed the payment, your booking will appear in My Bookings shortly.
          </p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition text-sm">
              View My Bookings
            </button>
            <button onClick={() => { setStage("verifying"); setAttempt(0); hasAttempted.current = false; doVerify(0); }}
              className="flex-1 py-3 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition text-sm">
              Retry Verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── FAILED ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4 pt-20">
      <div className="bg-white rounded-2xl shadow border border-red-200 max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-black text-red-700 mb-2">Payment Failed</h2>
        <p className="text-gray-500 text-sm mb-2">
          {message || "Something went wrong with your payment."}
        </p>
        <p className="text-gray-400 text-xs mb-6">
          The slot remains available. You can try booking again.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate("/grounds")}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm">
            Try Again
          </button>
          <button onClick={() => navigate("/my-bookings")}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm">
            My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
