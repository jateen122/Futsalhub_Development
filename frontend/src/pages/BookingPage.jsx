// frontend/src/pages/BookingPage.jsx  — REPLACE ENTIRE FILE
// Changes: imports LoyaltyBadge, passes use_free_booking to create API

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LoyaltyBadge from "../components/LoyaltyBadge";

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
  const close = parseInt(closingStr.split(":")[0],  10);
  const slots = [];
  for (let h = open; h < close; h++) {
    const startH12 = h % 12 === 0 ? 12 : h % 12;
    const startAmpm = h >= 12 ? "PM" : "AM";
    const endH = h + 1;
    const endH12 = endH % 12 === 0 ? 12 : endH % 12;
    const endAmpm = endH >= 12 ? "PM" : "AM";
    slots.push({
      start:      `${String(h).padStart(2, "0")}:00`,
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

export default function BookingPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,        setGround]        = useState(null);
  const [loadingGround, setLoadingGround] = useState(true);
  const [selectedDate,  setSelectedDate]  = useState(today());
  const [selectedSlot,  setSelectedSlot]  = useState(null);
  const [method,        setMethod]        = useState("khalti");
  const [useFree,       setUseFree]       = useState(false);   // ← loyalty
  const [bookedSlots,   setBookedSlots]   = useState([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [step,          setStep]          = useState(1);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState("");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/`)
      .then(r => r.json())
      .then(data => {
        const list  = data.results || data || [];
        const found = list.find(g => String(g.id) === String(id));
        setGround(found || null);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, [id]);

  useEffect(() => {
    if (!ground || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`${BASE_URL}/api/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const all      = data.results || data || [];
        const relevant = all.filter(b =>
          String(b.ground) === String(ground.id) &&
          b.date === selectedDate &&
          !["cancelled", "refunded"].includes(b.status)
        );
        setBookedSlots(relevant.map(b => ({ start: b.start_time, end: b.end_time })));
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [ground, selectedDate]);

  const slots    = ground ? buildSlots(ground.opening_time, ground.closing_time) : [];
  const isBooked = (slot) =>
    bookedSlots.some(b => slot.start < b.end && slot.end > b.start);

  const totalPrice = useFree
    ? "0.00"
    : selectedSlot && ground
    ? parseFloat(ground.price_per_hour).toFixed(2)
    : "0.00";

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");

    try {
      // 1. Create booking (with free flag if applicable)
      const bookRes  = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
  ground: ground.id,
  date: selectedDate,
  start_time: selectedSlot.start,
  end_time: selectedSlot.end,
  is_free_booking: useFree,   // ✅ FIXED
}),
      });
      const bookData = await bookRes.json();

      if (!bookRes.ok) {
        setError(bookData?.non_field_errors?.[0] || bookData?.detail || "Booking failed.");
        setSubmitting(false);
        return;
      }

      const bookingId = bookData?.booking?.id || bookData?.id;

      // 2. Free booking — no payment needed, navigate directly
      if (useFree) {
        navigate("/my-bookings");
        return;
      }

      // 3. Cash fallback
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

      // 4. Khalti
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ground not found</h2>
          <button onClick={() => navigate("/grounds")}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition text-sm">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pt-20 pb-16">

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-2 text-sm">
        <button onClick={() => navigate("/grounds")} className="text-gray-500 hover:text-gray-700 font-medium">Grounds</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 truncate">{ground.name}</span>
        <span className="text-gray-300">/</span>
        <span className="text-green-600 font-semibold">Book Slot</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* Ground info + loyalty badge */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="w-full h-48 overflow-hidden bg-gray-100">
                {imgSrc
                  ? <img src={imgSrc} alt={ground.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-green-50 to-emerald-100">⚽</div>}
              </div>
              <div className="p-5">
                <h2 className="font-bold text-gray-900 text-lg">{ground.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{ground.location}</p>
                <p className="text-green-600 font-black text-lg mt-2">
                  Rs {ground.price_per_hour} <span className="text-gray-400 font-normal text-sm">/ hr</span>
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-center"><p className="text-xs text-gray-400 mb-1">Opens</p><p className="text-gray-800 font-semibold">{openInfo?.label}</p></div>
                    <div className="flex-1 mx-3 h-px bg-gray-200" />
                    <div className="text-center"><p className="text-xs text-gray-400 mb-1">Closes</p><p className="text-gray-800 font-semibold">{closeInfo?.label}</p></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty badge — dark themed to stand out */}
            <div className="bg-[#0d1520] rounded-2xl overflow-hidden">
              <LoyaltyBadge
                groundId={ground.id}
                useFree={useFree}
                onFreeToggle={(val) => {
                  setUseFree(val);
                  if (val) setMethod("free"); else setMethod("khalti");
                }}
              />
            </div>
          </div>

          {/* Booking form */}
          <div className="col-span-12 lg:col-span-8">

            {/* Steps */}
            <div className="flex items-center gap-3 mb-8">
              {[{ n:1, label:"Select Slot" }, { n:2, label:"Payment" }].map((s, i) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${step === s.n ? "bg-green-500 border-green-500 text-white"
                      : step > s.n  ? "bg-green-100 border-green-400 text-green-700"
                      : "bg-white border-gray-300 text-gray-400"}`}>
                      {step > s.n ? "✓" : s.n}
                    </div>
                    <span className={`text-sm font-semibold hidden sm:block
                      ${step === s.n ? "text-green-600" : step > s.n ? "text-green-500" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 1 && <div className={`h-px flex-1 min-w-8 ${step > s.n ? "bg-green-400" : "bg-gray-300"}`} />}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <span className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">1</span>
                    Select Date
                  </h3>
                  <div className="flex items-center gap-4">
                    <input type="date" min={today()} value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 font-medium focus:outline-none focus:border-green-500 transition text-sm" />
                    {selectedDate && (
                      <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-center flex-shrink-0">
                        <p className="text-green-700 font-semibold text-sm">{fmtDate(selectedDate)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-800 flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">2</span>
                      Select Time Slot
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Available</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Booked</span>
                    </div>
                  </div>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-12 gap-2">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-400 text-sm">Checking availability…</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const booked   = isBooked(slot);
                        const selected = selectedSlot?.start === slot.start;
                        return (
                          <button key={slot.start} type="button" disabled={booked}
                            onClick={() => !booked && setSelectedSlot(slot)}
                            className={`relative py-4 px-3 rounded-lg border-2 text-center transition-all font-semibold text-sm
                              ${booked ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                              : selected ? "bg-green-500 border-green-500 text-white shadow-md scale-105"
                              : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-400"}`}>
                            {booked   && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Booked</span>}
                            {selected && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">✓</span>}
                            <div className="font-bold">{slot.shortStart}</div>
                            <div className="text-xs opacity-70">to</div>
                            <div className="font-bold">{slot.shortEnd}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedSlot && (
                  <div className={`rounded-2xl border-2 shadow-sm p-6
                    ${useFree ? "bg-amber-50 border-amber-300" : "bg-green-50 border-green-300"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${useFree ? "text-amber-600" : "text-green-600"}`}>
                          {useFree ? "🎁 Free Slot Selected" : "Selected Slot"}
                        </p>
                        <p className="text-gray-900 font-bold text-lg">{selectedSlot.label}</p>
                        <p className="text-gray-500 text-sm">{fmtDate(selectedDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        {useFree ? (
                          <div>
                            <p className="text-gray-400 line-through text-sm">Rs {ground.price_per_hour}</p>
                            <p className="text-amber-600 font-black text-2xl">FREE</p>
                          </div>
                        ) : (
                          <p className="text-green-600 font-black text-2xl">Rs {totalPrice}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setStep(2)}
                      className={`w-full py-3 font-bold rounded-lg transition text-sm
                        ${useFree ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-green-500 text-white hover:bg-green-600"}`}>
                      {useFree ? "🎁 Continue with Free Booking →" : "Continue to Payment →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <div className="space-y-6">

                {/* Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                    <h3 className="font-bold text-gray-800">Booking Summary</h3>
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    {[
                      ["Ground",   ground.name],
                      ["Location", ground.location],
                      ["Date",     fmtDate(selectedDate)],
                      ["Time",     selectedSlot?.label],
                      ["Duration", "1 hour"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">{k}</span>
                        <span className="text-gray-800 font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                      <span className="text-gray-700 font-bold">Total Amount</span>
                      {useFree ? (
                        <div className="text-right">
                          <span className="text-gray-400 line-through text-sm mr-2">Rs {ground.price_per_hour}</span>
                          <span className="text-amber-500 font-black text-xl">🎁 FREE</span>
                        </div>
                      ) : (
                        <span className="text-green-600 font-black text-xl">Rs {totalPrice}</span>
                      )}
                    </div>
                    {useFree && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                        <p className="text-amber-700 text-sm font-semibold">
                          🎉 Loyalty reward applied — this booking is FREE!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment method (hidden for free bookings) */}
                {!useFree && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-5">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: "khalti", label: "🟣 Khalti", desc: "Digital wallet — Recommended", recommended: true },
                        { id: "cash",   label: "💵 Cash",   desc: "Pay at the ground" },
                      ].map((m) => (
                        <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                          className={`p-4 rounded-lg border-2 text-left transition-all relative
                            ${method === m.id ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                          {m.recommended && (
                            <span className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">Best</span>
                          )}
                          <p className={`font-bold text-sm ${method === m.id ? "text-green-700" : "text-gray-700"}`}>{m.label}</p>
                          <p className="text-gray-400 text-xs mt-1">{m.desc}</p>
                        </button>
                      ))}
                    </div>
                    {method === "khalti" && (
                      <div className="mt-4 bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-700 space-y-1">
                        <p className="font-bold">🔐 Secure Khalti Payment</p>
                        <p>Sandbox: ID <span className="font-mono">9800000001</span> · MPIN <span className="font-mono">1111</span> · OTP <span className="font-mono">987654</span></p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={() => { setStep(1); setError(""); }}
                    className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition text-sm">
                    Back
                  </button>
                  <button onClick={handleConfirm} disabled={submitting}
                    className={`flex-1 py-3 font-bold rounded-lg transition disabled:opacity-50 text-sm flex items-center justify-center gap-2
                      ${useFree
                        ? "bg-amber-400 text-black hover:bg-amber-300"
                        : method === "khalti"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"}`}>
                    {submitting
                      ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Processing…</>
                      : useFree
                      ? "🎁 Confirm Free Booking"
                      : method === "khalti"
                      ? `🟣 Pay Rs ${totalPrice} via Khalti`
                      : `Pay Rs ${totalPrice} (Cash)`}
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
