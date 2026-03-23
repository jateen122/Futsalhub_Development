import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

/**
 * KhaltiVerify
 * ─────────────
 * This page is the `return_url` that Khalti redirects to after payment.
 *
 * Khalti adds these query params to the URL:
 *   ?pidx=...&status=Completed&transaction_id=...&amount=...&mobile=...
 *    &purchase_order_id=...&purchase_order_name=...&total_amount=...
 *
 * Steps:
 *  1. Read pidx from URL
 *  2. POST to /api/payments/verify/ with the pidx
 *  3. Show success or failure
 */
export default function KhaltiVerify() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const token         = localStorage.getItem("access");

  const [status,   setStatus]   = useState("verifying"); // verifying | success | failed | canceled
  const [data,     setData]     = useState(null);
  const [error,    setError]    = useState("");

  const pidx            = params.get("pidx");
  const khaltiStatus    = params.get("status");         // from Khalti URL param
  const transactionId   = params.get("transaction_id");
  const amount          = params.get("amount");         // in paisa
  const purchaseOrderId = params.get("purchase_order_id");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }

    // If Khalti said it was canceled, don't even call verify
    if (khaltiStatus === "User canceled") {
      setStatus("canceled");
      return;
    }

    if (!pidx) {
      setStatus("failed");
      setError("No payment identifier found. Please contact support.");
      return;
    }

    // Call our backend verify endpoint — it runs the Khalti Lookup API
    const verify = async () => {
      try {
        const res  = await fetch(`${BASE_URL}/api/payments/verify/`, {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({ pidx }),
        });
        const result = await res.json();

        if (result.status === "success") {
          setStatus("success");
          setData(result);
        } else if (result.status === "pending") {
          setStatus("pending");
          setError(result.message);
        } else {
          setStatus("failed");
          setError(result.message || "Payment verification failed.");
        }
      } catch {
        setStatus("failed");
        setError("Network error while verifying payment. Please contact support.");
      }
    };

    verify();
  }, [pidx]);

  /* ── Verifying screen ── */
  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-purple-100" />
            <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🟣</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment…</h2>
          <p className="text-gray-500 text-sm">Please wait, we're confirming your payment with Khalti.</p>
        </div>
      </div>
    );
  }

  /* ── Success screen ── */
  if (status === "success" && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden">

          {/* Green header */}
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
              ["Ground",         data.ground_name],
              ["Date",           data.date],
              ["Time",           `${fmtTime(data.start_time)} – ${fmtTime(data.end_time)}`],
              ["Payment Method", "🟣 Khalti"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-800 font-semibold">{v}</span>
              </div>
            ))}

            <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 mt-2">
              <span className="text-green-700 font-semibold">Amount Paid</span>
              <span className="text-green-700 font-black text-xl">Rs {data.amount}</span>
            </div>

            <div className="text-center mt-1">
              <p className="text-gray-400 text-xs">Transaction ID</p>
              <p className="text-gray-600 font-mono text-sm font-semibold">{data.transaction_id}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 pb-6 flex gap-3">
            <button onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
              My Bookings
            </button>
            <button onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition text-sm">
              More Grounds
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Canceled screen ── */
  if (status === "canceled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow border border-gray-200 max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Payment Cancelled</h2>
          <p className="text-gray-500 text-sm mb-6">You cancelled the Khalti payment. Your booking has not been confirmed.</p>
          <div className="flex gap-3">
            <button onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
              My Bookings
            </button>
            <button onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition text-sm">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Pending screen ── */
  if (status === "pending") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow border border-amber-200 max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-xl font-black text-amber-700 mb-2">Payment Pending</h2>
          <p className="text-gray-500 text-sm mb-2">{error}</p>
          <p className="text-gray-400 text-xs mb-6">Please wait a moment and check your bookings page.</p>
          <button onClick={() => navigate("/my-bookings")}
            className="w-full py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition text-sm">
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  /* ── Failed screen ── */
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4 pt-20">
      <div className="bg-white rounded-2xl shadow border border-red-200 max-w-md w-full p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-black text-red-700 mb-2">Payment Failed</h2>
        <p className="text-gray-500 text-sm mb-6">{error || "Something went wrong with your payment."}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate("/my-bookings")}
            className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
            My Bookings
          </button>
          <button onClick={() => navigate("/grounds")}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition text-sm">
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── helper ── */
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
