// frontend/src/pages/PlayerLoyalty.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Gift, Target, ArrowLeft, Calendar, Star } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

function StampCard({ confirmed, threshold = 5 }) {
  const currentProgress = confirmed % threshold;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {Array.from({ length: threshold }, (_, i) => {
        const filled = i < currentProgress;
        return (
          <div
            key={i}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300
              ${filled
                ? "bg-yellow-400 border-yellow-400 shadow-lg shadow-yellow-400/30 text-white"
                : "bg-white border-gray-200 text-gray-300"}`}
          >
            {filled ? (
              <Star size={24} className="fill-current" />
            ) : (
              <span className="text-sm font-bold">{i + 1}</span>
            )}
          </div>
        );
      })}
      <div className="ml-4 text-gray-400 text-lg font-light">=</div>
      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
        <Gift size={28} className="text-amber-500" />
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
      className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300
        ${hasFree ? "border-yellow-400 ring-1 ring-yellow-300/50" : "border-gray-200"}`}
    >
      {/* Ground Image */}
      <div className="h-48 bg-gray-100 relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={record.ground_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50">
            <Trophy size={52} className="text-amber-300" />
          </div>
        )}

        {hasFree && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-5 py-2 rounded-2xl shadow flex items-center gap-2">
            <Gift size={18} />
            FREE READY
          </div>
        )}
      </div>

      <div className="p-7">
        <h3 className="font-semibold text-2xl text-gray-900 mb-1">{record.ground_name}</h3>
        <p className="text-gray-500 flex items-center gap-2 text-sm">
          <Calendar size={16} />
          {record.ground_location}
        </p>

        {/* Stamps */}
        <div className="my-8">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 tracking-widest mb-4">
            <span>PROGRESS TO NEXT FREE BOOKING</span>
            <span className="text-gray-400">
              {record.confirmed_count % record.loyalty_threshold} / {record.loyalty_threshold}
            </span>
          </div>
          <StampCard confirmed={record.confirmed_count} threshold={record.loyalty_threshold} />
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${record.progress_to_next_free}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {hasFree
              ? "You can now redeem a free booking on this ground!"
              : `${record.bookings_until_next_free} more confirmed booking${record.bookings_until_next_free !== 1 ? "s" : ""} needed for your next free slot`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Confirmed", value: record.confirmed_count },
            { label: "Earned", value: record.free_bookings_earned },
            { label: "Used", value: record.free_bookings_used },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-2xl py-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action Button */}
        {hasFree ? (
          <button
            onClick={() => onBook(record.ground)}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg"
          >
            <Gift size={22} />
            Redeem Free Booking
          </button>
        ) : (
          <button
            onClick={() => onBook(record.ground)}
            className="w-full py-4 border-2 border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-yellow-300 transition"
          >
            Book This Ground
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerLoyalty() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/bookings/loyalty/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBook = () => {
    navigate("/my-bookings");
  };

  const records = data?.loyalty_records || [];
  const totalFree = data?.total_free_available || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={18} />
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-semibold text-gray-900">My Loyalty Rewards</h1>
          </div>

          {totalFree > 0 && (
            <div className="flex items-center gap-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-6 py-3 rounded-2xl font-semibold shadow">
              <Gift size={20} />
              {totalFree} Free Booking{totalFree > 1 ? "s" : ""} Ready
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* How it works */}
        <div className="bg-white rounded-3xl p-9 shadow border border-gray-100 mb-12">
          <div className="flex items-center gap-4 mb-8">
            <Trophy size={32} className="text-yellow-500" />
            <h2 className="text-2xl font-semibold text-gray-900">How Loyalty Works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: "1", title: "Book & Play", desc: "Make confirmed bookings at any ground" },
              { step: "2", title: "Earn Stamps", desc: "Every 5 confirmed bookings = 1 free booking" },
              { step: "3", title: "Redeem Free", desc: "Use your free booking at the same ground" },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="w-11 h-11 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-2xl flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-xl text-gray-900 mb-2">{item.title}</p>
                  <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-6">Loading your rewards...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-3xl py-24 text-center shadow border border-gray-100">
            <Trophy size={72} className="mx-auto text-gray-200 mb-8" />
            <h2 className="text-3xl font-semibold text-gray-800">No loyalty points yet</h2>
            <p className="text-gray-500 mt-4 max-w-md mx-auto">
              Start booking futsal grounds to earn stamps.<br />Every 5 confirmed bookings at the same ground earns you a free slot!
            </p>
            <button
              onClick={() => navigate("/grounds")}
              className="mt-10 px-10 py-4 bg-yellow-500 text-white font-semibold rounded-2xl hover:bg-yellow-600 transition"
            >
              Browse Grounds
            </button>
          </div>
        ) : (
          <>
            {/* Ready to Redeem */}
            {records.filter((r) => r.free_bookings_available > 0).length > 0 && (
              <div className="mb-14">
                <div className="flex items-center gap-4 mb-6">
                  <Gift size={28} className="text-amber-500" />
                  <h2 className="text-2xl font-semibold text-gray-900">Ready to Redeem</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {records
                    .filter((r) => r.free_bookings_available > 0)
                    .map((r) => (
                      <LoyaltyCard key={r.id} record={r} onBook={handleBook} />
                    ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {records.filter((r) => r.free_bookings_available === 0).length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <Target size={28} className="text-gray-400" />
                  <h2 className="text-2xl font-semibold text-gray-900">In Progress</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  {records
                    .filter((r) => r.free_bookings_available === 0)
                    .map((r) => (
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