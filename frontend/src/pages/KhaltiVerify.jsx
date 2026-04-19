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
  const min = parts[1] || "00";
  return `${hour % 12 || 12}:${min} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function KhaltiVerify() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = localStorage.getItem("access");

  const [stage, setStage] = useState("verifying");
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  const pidx = params.get("pidx");
  const khaltiStatus = params.get("status");
  const hasAttempted = useRef(false);

  const doVerify = async (tryNum) => {
    setAttempt(tryNum);
    try {
      const res = await fetch(`${BASE_URL}/api/payments/verify/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pidx }),
      });

      if (!res.ok) {
        if (tryNum < MAX_RETRIES) {
          setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
        } else {
          setStage("failed");
          setMessage("Server error. Please check your bookings page.");
        }
        return;
      }

      const result = await res.json();

      if (result.status === "success") {
        setData(result);
        setStage("success");
      } else if (result.status === "pending") {
        if (tryNum < MAX_RETRIES) {
          setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
        } else {
          setStage("pending");
          setMessage(result.message || "Payment is being processed.");
        }
      } else if (result.status === "canceled") {
        setStage("canceled");
      } else {
        setStage("failed");
        setMessage(result.message || "Payment failed.");
      }
    } catch {
      if (tryNum < MAX_RETRIES) {
        setTimeout(() => doVerify(tryNum + 1), RETRY_DELAY_MS);
      } else {
        setStage("failed");
        setMessage("Network error. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    if (!token) {
      navigate("/login");
      return;
    }

    if (khaltiStatus === "User canceled") {
      setStage("canceled");
      return;
    }

    if (!pidx) {
      setStage("failed");
      setMessage("No payment identifier found.");
      return;
    }

    doVerify(0);
  }, []);

  /* VERIFYING */
  if (stage === "verifying") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-yellow-100" />
            <div className="absolute inset-0 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-500 text-sm">
            Confirming your payment. Please do not close this page.
          </p>
          {attempt > 0 && (
            <p className="text-yellow-600 text-xs mt-3 font-medium">
              Attempt {attempt + 1} of {MAX_RETRIES + 1}
            </p>
          )}
        </div>
      </div>
    );
  }

  /* SUCCESS */
  if (stage === "success" && data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full mx-auto mb-4"></div>
            <h2 className="text-2xl font-black text-white">Booking Confirmed</h2>
            <p className="text-yellow-100 text-sm mt-1">Payment verified successfully</p>
          </div>

          <div className="px-8 py-6 space-y-3">
            {[
              ["Ground", data.ground_name],
              ["Date", data.date],
              ["Time", `${fmtTime(data.start_time)} – ${fmtTime(data.end_time)}`],
              ["Method", "Khalti"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-gray-800 font-semibold">{v}</span>
              </div>
            ))}

            <div className="flex justify-between py-3 bg-yellow-50 rounded-lg px-4 mt-2">
              <span className="text-yellow-700 font-semibold">Amount Paid</span>
              <span className="text-yellow-700 font-black text-xl">Rs {data.amount}</span>
            </div>
          </div>

          <div className="px-8 pb-6 flex gap-3">
            <button
              onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
            >
              Browse Grounds
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* CANCELED */
  if (stage === "canceled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow border max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-black text-gray-900 mb-2">Payment Cancelled</h2>
          <p className="text-gray-500 text-sm mb-6">
            No booking was made. The slot is still available.
          </p>
          <button
            onClick={() => navigate("/grounds")}
            className="py-3 px-6 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600"
          >
            Book Again
          </button>
        </div>
      </div>
    );
  }

  /* FAILED */
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center px-4 pt-20">
      <div className="bg-white rounded-2xl shadow border border-red-200 max-w-md w-full p-8 text-center">
        <h2 className="text-xl font-black text-red-700 mb-2">Payment Failed</h2>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <button
          onClick={() => navigate("/grounds")}
          className="py-3 px-6 bg-red-500 text-white rounded-xl hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}