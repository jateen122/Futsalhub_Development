import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [status, setStatus]   = useState("loading"); // "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/accounts/verify-email/${token}/`
        );
        setStatus("success");
        setMessage(res.data.message);
        // Redirect to login after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.error || "Something went wrong. Please try again."
        );
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-2xl max-w-md w-full text-center">

        {status === "loading" && (
          <>
            <div className="text-5xl mb-6 animate-spin">⚙️</div>
            <h2 className="text-2xl font-bold mb-2">Verifying your email…</h2>
            <p className="text-gray-400">Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-amber-400">Email Verified!</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <p className="text-gray-500 text-sm">Redirecting to login…</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-6 w-full bg-amber-400 text-black font-semibold py-3 rounded-lg hover:bg-amber-300 transition"
            >
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <button
              onClick={() => navigate("/register")}
              className="mt-2 w-full bg-amber-400 text-black font-semibold py-3 rounded-lg hover:bg-amber-300 transition"
            >
              Register Again
            </button>
          </>
        )}

      </div>
    </div>
  );
}
