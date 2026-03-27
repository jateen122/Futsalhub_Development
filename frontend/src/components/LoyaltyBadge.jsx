// frontend/src/components/LoyaltyBadge.jsx

import { useEffect, useState } from "react";
import { Trophy, Gift } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

export default function LoyaltyBadge({ groundId, onFreeToggle, useFree }) {
  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role");

  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || role !== "player" || !groundId) {
      setLoading(false);
      return;
    }

    fetch(`${BASE_URL}/api/bookings/loyalty/${groundId}/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch loyalty");
        return res.json();
      })
      .then((data) => {
        setLoyalty(data);
      })
      .catch((err) => {
        console.error("Loyalty fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [groundId, token, role]);

  if (loading || !loyalty || role !== "player") return null;

  const hasFree = loyalty.free_bookings_available > 0;
  const threshold = loyalty.loyalty_threshold || 5;
  const current = loyalty.confirmed_count % threshold || 0;
  const progress = loyalty.progress_to_next_free || 0;

  return (
    <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
            <Trophy size={28} />
          </div>
          <div>
            <p className="uppercase tracking-[3px] text-xs font-semibold opacity-90">Loyalty Rewards</p>
            <p className="text-2xl font-bold tracking-tight">Free Booking Progress</p>
          </div>
        </div>

        {/* Stamp / Progress Circles */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: threshold }, (_, i) => {
            const isFilled = i < current;
            return (
              <div
                key={i}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border-2 transition-all duration-300
                  ${isFilled 
                    ? "bg-white border-white text-orange-500" 
                    : "bg-white/10 border-white/30"}`}
              >
                {isFilled ? (
                  <div className="w-4 h-4 bg-orange-500 rounded-full" />
                ) : (
                  <span className="text-white/40 font-semibold text-lg">{i + 1}</span>
                )}
              </div>
            );
          })}

          <div className="text-4xl opacity-40">=</div>

          <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
            <Gift size={26} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Text */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm font-medium opacity-90">
              {hasFree 
                ? "🎉 Free booking available!" 
                : `${loyalty.bookings_until_next_free || (threshold - current)} more bookings to unlock next free`}
            </p>
          </div>

          {hasFree && (
            <div className="text-right">
              <span className="text-xs opacity-75">Available</span>
              <p className="text-3xl font-bold leading-none">{loyalty.free_bookings_available}</p>
            </div>
          )}
        </div>

        {/* Redeem Toggle */}
        {hasFree && (
          <div className="mt-8 pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={() => onFreeToggle?.(!useFree)}
              className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3
                ${useFree 
                  ? "bg-white text-orange-600 shadow-lg" 
                  : "bg-white/10 hover:bg-white/20 border border-white/30"}`}
            >
              <Gift size={22} />
              {useFree ? "Free Booking Applied ✓" : "Use Free Booking"}
            </button>

            {useFree && (
              <p className="text-center text-white/70 text-sm mt-3">
                Your booking will be completely free
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}