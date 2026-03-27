import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Clock, MapPin, Calendar, IndianRupee, Gift, ChevronRight } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const parseTime = (t) => {
  if (!t) return null;
  const h24  = parseInt(t.split(":")[0], 10);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12  = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h24, h12, ampm, label: `${h12} ${ampm}` };
};

const buildSlots = (openingStr, closingStr) => {
  if (!openingStr || !closingStr) return [];
  const open  = parseInt(openingStr.split(":")[0], 10);
  const close = parseInt(closingStr.split(":")[0], 10);
  const slots = [];
  for (let h = open; h < close; h++) {
    const startH12  = h % 12 === 0 ? 12 : h % 12;
    const startAmpm = h >= 12 ? "PM" : "AM";
    const endH      = h + 1;
    const endH12    = endH % 12 === 0 ? 12 : endH % 12;
    const endAmpm   = endH >= 12 ? "PM" : "AM";
    slots.push({
      start:      `${String(h).padStart(2, "0")}:00`,       // "HH:MM"
      end:        `${String(endH).padStart(2, "0")}:00`,
      label:      `${startH12}:00 ${startAmpm} – ${endH12}:00 ${endAmpm}`,
      shortStart: `${startH12} ${startAmpm}`,
      shortEnd:   `${endH12} ${endAmpm}`,
    });
  }
  return slots;
};

const today   = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
};

// ─── Loyalty Progress Badge ───────────────────────────────────────────────────
function LoyaltyPanel({ groundId, useFree, onFreeToggle }) {
  const token = localStorage.getItem("access");
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => {
    if (!groundId || !token) return;
    fetch(`${BASE_URL}/api/bookings/loyalty/${groundId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setLoyalty(d))
      .catch(() => {});
  }, [groundId]);

  if (!loyalty) return null;

  const { confirmed_count, bookings_until_next_free, free_bookings_available, loyalty_threshold, progress_to_next_free } = loyalty;
  const hasFree = free_bookings_available > 0;

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all duration-300 ${hasFree ? "bg-amber-50 border-amber-300 shadow-lg" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasFree ? "bg-amber-500" : "bg-gray-200"}`}>
            <Gift size={16} className={hasFree ? "text-white" : "text-gray-500"} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loyalty Reward</p>
            <p className="text-sm font-bold text-gray-900">Book {loyalty_threshold}, Get 1 Free</p>
          </div>
        </div>
        {confirmed_count > 0 && (
          <span className="text-xs font-black bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {confirmed_count} booked
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Progress to next free booking</span>
          <span className="font-bold">{Math.round(progress_to_next_free)}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${hasFree ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${progress_to_next_free}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {hasFree
            ? `🎁 You have ${free_bookings_available} free booking${free_bookings_available > 1 ? "s" : ""} available!`
            : `${bookings_until_next_free} more booking${bookings_until_next_free !== 1 ? "s" : ""} until your next free slot`}
        </p>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mb-4">
        {Array.from({ length: loyalty_threshold }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
              i < (confirmed_count % loyalty_threshold) ? "bg-green-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Use free toggle */}
      {hasFree && (
        <button
          onClick={() => onFreeToggle(!useFree)}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2
            ${useFree
              ? "bg-amber-500 text-white shadow-md"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300"}`}
        >
          <Gift size={16} />
          {useFree ? "✓ Using Free Booking" : "Use Free Booking"}
        </button>
      )}
    </div>
  );
}

// ─── Main BookingPage ─────────────────────────────────────────────────────────
export default function BookingPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,        setGround]        = useState(null);
  const [loadingGround, setLoadingGround] = useState(true);
  const [selectedDate,  setSelectedDate]  = useState(today());
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [method,        setMethod]        = useState("khalti");
  const [useFree,       setUseFree]       = useState(false);
  const [bookedSlots,   setBookedSlots]   = useState([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [step,          setStep]          = useState(1);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");

  // Load ground
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/`)
      .then((r) => r.json())
      .then((data) => {
        const list  = data.results || data || [];
        const found = list.find((g) => String(g.id) === String(id));
        setGround(found || null);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, [id]);

  // Load booked slots — uses dedicated endpoint so ALL users' bookings are visible
  useEffect(() => {
    if (!ground || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);

    fetch(
      `${BASE_URL}/api/bookings/ground/${ground.id}/booked-slots/?date=${selectedDate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.ok ? r.json() : { booked_slots: [] })
      .then((data) => {
        // API returns "HH:MM:SS" — normalise to "HH:MM" for string comparison
        const normalised = (data.booked_slots || []).map((b) => ({
          start: b.start.slice(0, 5),
          end:   b.end.slice(0, 5),
        }));
        setBookedSlots(normalised);
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [ground, selectedDate]);

  const slots = ground ? buildSlots(ground.opening_time, ground.closing_time) : [];

  // Allen's interval overlap: booked.start < slot.end  AND  booked.end > slot.start
  // Both sides are "HH:MM" — lexicographic order equals time order for same-day slots
  const isBooked = (slot) =>
    bookedSlots.some((b) => b.start < slot.end && b.end > slot.start);

  const totalPrice = useFree
    ? "0.00"
    : selectedSlot && ground
    ? parseFloat(ground.price_per_hour).toFixed(2)
    : "0.00";

  const handleConfirm = async () => {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      // 1. Create booking
      const bookRes  = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          ground:          ground.id,
          date:            selectedDate,
          start_time:      selectedSlot.start,
          end_time:        selectedSlot.end,
          is_free_booking: useFree,
        }),
      });
      const bookData = await bookRes.json();

      if (!bookRes.ok) {
        setError(bookData?.non_field_errors?.[0] || bookData?.detail || "Booking failed.");
        setSubmitting(false);
        return;
      }

      // Free booking — no payment needed
      if (useFree) { navigate("/my-bookings"); return; }

      const bookingId = bookData?.booking?.id || bookData?.id;

      // 2a. Cash
      if (method === "cash") {
        const payRes  = await fetch(`${BASE_URL}/api/payments/simulate/`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ booking_id: bookingId, payment_method: "cash" }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setError(payData?.detail || "Cash failed."); setSubmitting(false); return; }
        navigate("/my-bookings");
        return;
      }

      // 2b. Khalti
      const payRes  = await fetch(`${BASE_URL}/api/payments/initiate/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          booking_id:  bookingId,
          return_url:  `${window.location.origin}/payment/verify`,
          website_url: window.location.origin,
        }),
      });
      const payData = await payRes.json();

      if (!payRes.ok) { setError(payData?.detail || "Khalti initiation failed."); setSubmitting(false); return; }
      window.location.href = payData.payment_url;

    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🏟️</p>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ground not found</h2>
          <button onClick={() => navigate("/grounds")}
            className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition">
            Browse Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc    = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;
  const openInfo  = parseTime(ground.opening_time);
  const closeInfo = parseTime(ground.closing_time);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 pb-16">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/grounds")} className="text-gray-500 hover:text-gray-800 transition font-medium">Grounds</button>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-gray-600 truncate">{ground.name}</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-amber-600 font-semibold">Book Slot</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── LEFT: Ground info + loyalty ── */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            {/* Ground card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden sticky top-28">
              <div className="relative h-56 bg-gray-100 overflow-hidden">
                {imgSrc
                  ? <img src={imgSrc} alt={ground.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-green-50 to-emerald-100">⚽</div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              <div className="p-6">
                <h2 className="font-black text-xl text-gray-900 tracking-tight">{ground.name}</h2>
                <div className="flex items-center gap-1.5 text-gray-500 mt-1.5 text-sm">
                  <MapPin size={15} />
                  <span>{ground.location}</span>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">Rs</span>
                  <span className="text-3xl font-black text-gray-900">{ground.price_per_hour}</span>
                  <span className="text-gray-400 text-sm font-medium">/ hour</span>
                </div>

                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between text-sm">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Opens</p>
                    <p className="font-bold text-gray-900">{openInfo?.label}</p>
                  </div>
                  <div className="text-gray-300">—</div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Closes</p>
                    <p className="font-bold text-gray-900">{closeInfo?.label}</p>
                  </div>
                </div>
              </div>

              {/* Loyalty panel inside card */}
              <div className="px-6 pb-6">
                <LoyaltyPanel
                  groundId={ground.id}
                  useFree={useFree}
                  onFreeToggle={(val) => {
                    setUseFree(val);
                    if (val) setMethod("free");
                    else setMethod("khalti");
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Booking flow ── */}
          <div className="col-span-12 lg:col-span-8">

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-8">
              {[{ n: 1, label: "Select Slot" }, { n: 2, label: "Payment" }].map((s, i) => (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm border-2 transition-all
                    ${step === s.n ? "bg-amber-500 border-amber-500 text-white"
                    : step > s.n  ? "bg-green-100 border-green-500 text-green-700"
                    :               "bg-white border-gray-300 text-gray-400"}`}>
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <span className={`text-sm font-semibold ${step === s.n ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                  {i === 0 && <div className={`flex-1 h-0.5 ${step > 1 ? "bg-green-400" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6 flex items-center justify-between text-sm">
                <span>⚠ {error}</span>
                <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 font-bold">✕</button>
              </div>
            )}

            {/* ── STEP 1: Date + Slot ── */}
            {step === 1 && (
              <div className="space-y-6">

                {/* Date picker */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <Calendar size={20} className="text-amber-500" />
                    <h3 className="font-bold text-lg text-gray-900">Select Date</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="date"
                      min={today()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 font-semibold focus:outline-none focus:border-amber-400 transition"
                    />
                    {selectedDate && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-center whitespace-nowrap">
                        <p className="text-amber-700 font-bold">{fmtDate(selectedDate)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slot picker */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <Clock size={20} className="text-amber-500" />
                      <h3 className="font-bold text-lg text-gray-900">Select Time Slot</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Available</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Booked</span>
                    </div>
                  </div>

                  {loadingSlots ? (
                    <div className="py-16 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: "3px" }} />
                      <p className="text-gray-500 text-sm">Checking availability...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const booked   = isBooked(slot);
                        const selected = selectedSlot?.start === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={booked}
                            onClick={() => !booked && setSelectedSlot(slot)}
                            className={`relative py-5 px-3 rounded-xl border-2 text-center transition-all font-semibold
                              ${booked
                                ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                                : selected
                                ? "bg-green-500 border-green-500 text-white shadow-md scale-[1.03]"
                                : "bg-white border-gray-200 hover:border-green-400 hover:bg-green-50 cursor-pointer"}`}
                          >
                            {booked && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                                Booked
                              </span>
                            )}
                            {selected && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                                ✓ Selected
                              </span>
                            )}
                            <div className="font-bold text-base">{slot.shortStart}</div>
                            <div className="text-xs text-gray-400 my-0.5">to</div>
                            <div className="font-bold text-base">{slot.shortEnd}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected slot CTA */}
                {selectedSlot && (
                  <div className={`rounded-2xl border-2 p-6 shadow-sm transition-all
                    ${useFree ? "bg-amber-50 border-amber-400" : "bg-green-50 border-green-400"}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${useFree ? "text-amber-600" : "text-green-600"}`}>
                          Selected Slot
                        </p>
                        <p className="text-xl font-black text-gray-900">{selectedSlot.label}</p>
                        <p className="text-gray-500 text-sm mt-0.5">{fmtDate(selectedDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        {useFree ? (
                          <div>
                            <p className="line-through text-gray-400 text-sm">Rs {ground.price_per_hour}</p>
                            <p className="text-2xl font-black text-amber-600">FREE 🎁</p>
                          </div>
                        ) : (
                          <p className="text-2xl font-black text-green-600">Rs {totalPrice}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className={`w-full mt-5 py-3.5 font-black rounded-xl transition text-base
                        ${useFree ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}
                    >
                      {useFree ? "Continue with Free Booking →" : "Continue to Payment →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 2: Payment ── */}
            {step === 2 && (
              <div className="space-y-5">

                {/* Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-5">Booking Summary</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      ["Ground",   ground.name],
                      ["Location", ground.location],
                      ["Date",     fmtDate(selectedDate)],
                      ["Time",     selectedSlot?.label],
                      ["Duration", "1 hour"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-gray-500">{k}</span>
                        <span className="font-semibold text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-base text-gray-800">Total Amount</span>
                    {useFree ? (
                      <div className="text-right">
                        <span className="line-through text-gray-400 text-sm block">Rs {ground.price_per_hour}</span>
                        <span className="text-2xl font-black text-amber-600">FREE 🎁</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-black text-green-600">Rs {totalPrice}</span>
                    )}
                  </div>

                  {useFree && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                      <p className="text-amber-700 font-semibold text-sm">🎉 Loyalty reward applied — this booking is completely free!</p>
                    </div>
                  )}
                </div>

                {/* Payment method */}
                {!useFree && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-5">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "khalti", icon: "🟣", label: "Khalti",          desc: "Digital wallet — fast & secure", badge: "Recommended" },
                        { id: "cash",   icon: "💵", label: "Cash on Ground",   desc: "Pay when you arrive" },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setMethod(m.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all relative
                            ${method === m.id ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                        >
                          {m.badge && (
                            <span className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                              {m.badge}
                            </span>
                          )}
                          <div className="text-2xl mb-2">{m.icon}</div>
                          <p className={`font-black text-sm ${method === m.id ? "text-green-700" : "text-gray-700"}`}>{m.label}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{m.desc}</p>
                        </button>
                      ))}
                    </div>

                    {method === "khalti" && (
                      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <p className="text-purple-700 text-xs leading-relaxed">
                          <span className="font-bold">🟣 Khalti Sandbox:</span> ID <span className="font-mono">9800000001</span> · MPIN <span className="font-mono">1111</span> · OTP <span className="font-mono">987654</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep(1); setError(""); }}
                    className="flex-1 py-3.5 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className={`flex-1 py-3.5 font-black rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2
                      ${useFree
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : method === "khalti"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"}`}
                  >
                    {submitting
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                      : useFree
                      ? "🎁 Confirm Free Booking"
                      : method === "khalti"
                      ? `🟣 Pay Rs ${totalPrice} via Khalti`
                      : `💵 Pay Rs ${totalPrice} (Cash)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
