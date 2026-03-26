// frontend/src/components/LoyaltyBadge.jsx

import { useEffect, useState } from "react";
import { Trophy, Gift } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

export default function LoyaltyBadge({ groundId, onFreeToggle, useFree }) {
  const token = localStorage.getItem("access");
  const role  = localStorage.getItem("role");

  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || role !== "player" || !groundId) {
      console.log("Missing:", { token, role, groundId });
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/api/bookings/loyalty/${groundId}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ REQUIRED
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch loyalty");
        return res.json();
      })
      .then((data) => {
        console.log("Loyalty Data:", data);
        setLoyalty(data);
      })
      .catch((err) => {
        console.error("Error:", err);
      })
      .finally(() => setLoading(false));

  }, [groundId, token, role]); // ✅ FIXED DEPENDENCY

  if (loading || !loyalty || role !== "player") return null;

  const hasFree   = loyalty.free_bookings_available > 0;
  const threshold = loyalty.loyalty_threshold || 5;
  const current   = loyalty.confirmed_count % threshold;

  return (
    <div
      className={`rounded-xl border p-4 transition-all
        ${hasFree
          ? "bg-amber-400/10 border-amber-400/40"
          : "bg-white/5 border-white/10"}`}
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
            Loyalty Rewards
          </span>
        </div>

        {hasFree && (
          <span className="flex items-center gap-1 bg-amber-400 text-black text-xs font-bold px-2.5 py-1 rounded-full">
            <Gift size={12} />
            {loyalty.free_bookings_available}
          </span>
        )}
      </div>

      {/* Stamp row */}
      <div className="flex items-center gap-1.5 mb-3">
        {Array.from({ length: threshold }, (_, i) => {
          const filled = i < current;
          return (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border transition
                ${filled
                  ? "bg-amber-400 border-amber-400"
                  : "bg-white/5 border-white/20"}`}
            >
              {filled ? (
                <div className="w-2.5 h-2.5 bg-black rounded-full"></div>
              ) : (
                <span className="text-white/20 text-[10px]">{i + 1}</span>
              )}
            </div>
          );
        })}
        <span className="text-white/30 text-xs ml-1">=</span>
        <Gift size={16} className="text-amber-400" />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${loyalty.progress_to_next_free}%` }}
          />
        </div>

        <p className="text-white/40 text-xs mt-1">
          {hasFree
            ? "Free booking available"
            : `${loyalty.bookings_until_next_free} more to next free booking`}
        </p>
      </div>

      {/* Redeem button */}
      {hasFree && (
        <button
          type="button"
          onClick={() => onFreeToggle?.(!useFree)}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2
            ${useFree
              ? "bg-amber-400 text-black"
              : "bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25"}`}
        >
          <Gift size={14} />
          {useFree ? "Free Booking Applied" : "Use Free Booking"}
        </button>
      )}

      {useFree && (
        <p className="text-amber-400/70 text-xs text-center mt-2">
          Total will be Rs 0
        </p>
      )}
    </div>
  );
}