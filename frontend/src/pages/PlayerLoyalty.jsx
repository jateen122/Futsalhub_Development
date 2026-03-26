// frontend/src/pages/PlayerLoyalty.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const timeAgo = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function StampCard({ confirmed, threshold = 5 }) {
  const stamps = Array.from({ length: threshold }, (_, i) => i < confirmed % threshold || (confirmed > 0 && confirmed % threshold === 0 && i < threshold));
  // if just completed a set
  const completedSets = Math.floor(confirmed / threshold);
  const currentProgress = confirmed % threshold;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: threshold }, (_, i) => {
        const filled = i < currentProgress;
        return (
          <div
            key={i}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 border-2
              ${filled
                ? "bg-amber-400 border-amber-400 shadow-lg shadow-amber-400/30 scale-105"
                : "bg-white/5 border-white/20"}`}
          >
            {filled ? "⚽" : <span className="text-white/20 text-xs font-bold">{i + 1}</span>}
          </div>
        );
      })}
      <div className="ml-2 text-white/40 text-sm">
        = <span className="text-2xl ml-1">🎁</span>
      </div>
    </div>
  );
}

function LoyaltyCard({ record, onBook }) {
  const imgSrc = record.ground_image
    ? record.ground_image.startsWith("http")
      ? record.ground_image
      : `${BASE_URL}${record.ground_image}`
    : null;

  const hasFree = record.free_bookings_available > 0;

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all duration-300
        ${hasFree
          ? "border-amber-400/50 bg-gradient-to-br from-amber-400/10 to-amber-600/5 shadow-lg shadow-amber-400/10"
          : "border-white/10 bg-white/3 hover:border-white/20"}`}
    >
      {/* Free badge */}
      {hasFree && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-amber-400 text-black text-xs font-black px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
            🎁 {record.free_bookings_available} FREE
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Ground info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 border border-white/10">
            {imgSrc
              ? <img src={imgSrc} alt={record.ground_name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-2xl">⚽</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-black text-base truncate">{record.ground_name}</h3>
            <p className="text-white/40 text-xs truncate">📍 {record.ground_location}</p>
            <p className="text-white/30 text-xs mt-0.5">{record.confirmed_count} confirmed bookings total</p>
          </div>
        </div>

        {/* Stamp progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">
              Progress to Next Free
            </span>
            <span className="text-white/60 text-xs">
              {record.confirmed_count % record.loyalty_threshold}/{record.loyalty_threshold}
            </span>
          </div>
          <StampCard
            confirmed={record.confirmed_count}
            threshold={record.loyalty_threshold}
          />
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${record.progress_to_next_free}%` }}
            />
          </div>
          <p className="text-white/35 text-xs mt-1.5">
            {hasFree
              ? "🎉 You have a free booking ready!"
              : `${record.bookings_until_next_free} more booking${record.bookings_until_next_free !== 1 ? "s" : ""} to earn a free slot`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Confirmed", value: record.confirmed_count, color: "text-white" },
            { label: "Earned", value: record.free_bookings_earned, color: "text-amber-400" },
            { label: "Used", value: record.free_bookings_used, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-lg p-2.5 text-center border border-white/5">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-white/30 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action */}
        {hasFree ? (
          <button
            onClick={() => onBook(record.ground)}
            className="w-full py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
          >
            🎁 Redeem Free Booking
          </button>
        ) : (
          <button
            onClick={() => onBook(record.ground)}
            className="w-full py-3 bg-white/5 border border-white/10 text-white/60 font-semibold rounded-xl hover:bg-white/10 hover:text-white transition text-sm"
          >
            ⚽ Book This Ground
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerLoyalty() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/bookings/loyalty/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBook = (groundId) => {
    navigate(`/my-bookings`);
  };

  const records = data?.loyalty_records || [];
  const totalFree = data?.total_free_available || 0;

  return (
    <div className="min-h-screen bg-[#070b14] pt-24 px-4 pb-16">
      {/* bg blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-amber-400/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/player-dashboard")}
            className="text-white/30 hover:text-white text-sm mb-5 flex items-center gap-1.5 transition"
          >
            ← Dashboard
          </button>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.2em]">
                  Loyalty Rewards
                </span>
              </div>
              <h1 className="text-4xl font-black text-white">My Rewards</h1>
              <p className="text-white/40 mt-1 text-sm">
                Book 5 times at the same ground, get the 6th FREE
              </p>
            </div>
            {totalFree > 0 && (
              <div className="bg-amber-400/15 border border-amber-400/40 rounded-2xl px-5 py-3 text-center">
                <p className="text-amber-400 text-3xl font-black">{totalFree}</p>
                <p className="text-amber-400/70 text-xs font-semibold uppercase tracking-wider">Free Slots Ready</p>
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-amber-400">✦</span> How It Works
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "⚽", step: "1", title: "Book & Play", desc: "Make confirmed bookings at any ground" },
              { icon: "📈", step: "2", title: "Earn Stamps", desc: "Every 5 confirmed bookings = 1 free booking" },
              { icon: "🎁", step: "3", title: "Play Free!", desc: "Redeem your free booking at the same ground" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-2xl mx-auto mb-2">
                  {item.icon}
                </div>
                <p className="text-white font-bold text-sm">{item.title}</p>
                <p className="text-white/40 text-xs mt-1 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <div className="text-center py-20 bg-white/3 border border-white/8 rounded-2xl">
            <p className="text-6xl mb-4">🏆</p>
            <h2 className="text-white text-xl font-black mb-2">No Loyalty Points Yet</h2>
            <p className="text-white/40 text-sm mb-6 max-w-sm mx-auto">
              Start booking futsal grounds to earn loyalty stamps. Every 5 confirmed bookings earns you a free slot!
            </p>
            <button
              onClick={() => navigate("/grounds")}
              className="px-8 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition"
            >
              Browse Grounds →
            </button>
          </div>
        )}

        {/* Free bookings alert */}
        {!loading && totalFree > 0 && (
          <div className="bg-amber-400/10 border border-amber-400/40 rounded-2xl p-5 mb-6 flex items-center gap-4">
            <div className="text-4xl flex-shrink-0">🎉</div>
            <div className="flex-1">
              <p className="text-amber-300 font-black text-base">
                You have {totalFree} free booking{totalFree > 1 ? "s" : ""} ready to use!
              </p>
              <p className="text-amber-400/60 text-sm mt-0.5">
                Click "Redeem Free Booking" on any eligible ground below.
              </p>
            </div>
          </div>
        )}

        {/* Loyalty cards grid */}
        {!loading && records.length > 0 && (
          <>
            {/* Free first */}
            {records.filter(r => r.free_bookings_available > 0).length > 0 && (
              <div className="mb-6">
                <h2 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>🎁</span> Ready to Redeem
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {records
                    .filter(r => r.free_bookings_available > 0)
                    .map(r => (
                      <LoyaltyCard key={r.id} record={r} onBook={handleBook} />
                    ))}
                </div>
              </div>
            )}

            {/* In progress */}
            {records.filter(r => r.free_bookings_available === 0).length > 0 && (
              <div>
                <h2 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>📈</span> In Progress
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {records
                    .filter(r => r.free_bookings_available === 0)
                    .map(r => (
                      <LoyaltyCard key={r.id} record={r} onBook={handleBook} />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
