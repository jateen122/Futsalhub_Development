// frontend/src/pages/PlayerMyBookings.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoyaltyBadge from "../components/LoyaltyBadge";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── helpers ────────────────────────────────────────────────── */
const fmt12 = (h) => {
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12  = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${ampm}`;
};

const fmt12t = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const today = () => new Date().toISOString().split("T")[0];

const buildSlots = (opening, closing) => {
  if (!opening || !closing) return [];
  const start = parseInt(opening.split(":")[0], 10);
  const end   = parseInt(closing.split(":")[0], 10);
  const slots = [];
  for (let h = start; h < end; h++) {
    slots.push({ label: `${h}-${h + 1}`, startH: h, endH: h + 1 });
  }
  return slots;
};

const isSlotBooked = (slot, bookings, date) =>
  bookings.some((b) => {
    if (b.date !== date) return false;
    if (!["pending", "confirmed"].includes(b.status)) return false;
    const bStart = parseInt(b.start_time.split(":")[0], 10);
    const bEnd   = parseInt(b.end_time.split(":")[0], 10);
    return slot.startH < bEnd && slot.endH > bStart;
  });

const STATUS = {
  pending:   { dot: "bg-amber-400",  text: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  label: "Pending"   },
  confirmed: { dot: "bg-emerald-500",text: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",label: "Confirmed" },
  cancelled: { dot: "bg-red-400",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    label: "Cancelled" },
  refunded:  { dot: "bg-blue-400",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   label: "Refunded"  },
};

/* ─── Step dot ───────────────────────────────────────────────── */
function StepDot({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all
        ${done  ? "bg-emerald-500 border-emerald-500 text-white"
        : active ? "bg-white border-emerald-500 text-emerald-600"
        : "bg-gray-100 border-gray-300 text-gray-400"}`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-xs font-bold hidden sm:block
        ${active ? "text-emerald-600" : done ? "text-gray-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKING MODAL — with Khalti + loyalty free booking
═══════════════════════════════════════════════════════════════ */
function BookingModal({ ground, myBookings, onClose, onBooked }) {
  const token = localStorage.getItem("access");

  const [step,          setStep]          = useState(1);
  const [date,          setDate]          = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [groundBooks,   setGroundBooks]   = useState([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [method,        setMethod]        = useState("khalti");
  const [useFree,       setUseFree]       = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [apiError,      setApiError]      = useState("");

  const slots      = buildSlots(ground.opening_time, ground.closing_time);
  const pricePerHr = parseFloat(ground.price_per_hour);

  const sorted      = [...selectedSlots].sort((a, b) => a.startH - b.startH);
  const totalHours  = selectedSlots.length;
  const totalPrice  = useFree ? "0.00" : (totalHours * pricePerHr).toFixed(2);
  const startTime   = sorted[0]     ? `${String(sorted[0].startH).padStart(2, "0")}:00`      : "";
  const endTime     = sorted.at(-1) ? `${String(sorted.at(-1).endH).padStart(2, "0")}:00`    : "";

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setSelectedSlots([]);
    fetch(`${BASE_URL}/api/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const all = data.results || data || [];
        setGroundBooks(all.filter(b =>
          String(b.ground) === String(ground.id) || b.ground_name === ground.name
        ));
      })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const toggleSlot = (slot) => {
    if (isSlotBooked(slot, [...myBookings, ...groundBooks], date)) return;
    const already = selectedSlots.find(s => s.startH === slot.startH);
    if (already) { setSelectedSlots(prev => prev.filter(s => s.startH !== slot.startH)); return; }
    if (selectedSlots.length === 0) { setSelectedSlots([slot]); return; }
    const minH = Math.min(...selectedSlots.map(s => s.startH));
    const maxH = Math.max(...selectedSlots.map(s => s.endH));
    if (slot.endH === minH || slot.startH === maxH) setSelectedSlots(prev => [...prev, slot]);
    else setSelectedSlots([slot]);
  };

  /* ── Pay / Confirm ─────────────────────────────────────────── */
  const handlePay = async () => {
    setSubmitting(true);
    setApiError("");
    try {
      // 1. Create booking
      const bookRes  = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ground:           ground.id,
          date,
          start_time:       startTime,
          end_time:         endTime,
          use_free_booking: useFree,
        }),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) {
        setApiError(bookData?.non_field_errors?.[0] || bookData?.detail || "Booking failed.");
        setSubmitting(false);
        return;
      }

      const bookingId = bookData?.booking?.id || bookData?.id;

      // 2. Free booking — no payment needed
      if (useFree) { onBooked(); onClose(); return; }

      // 3. Cash
      if (method === "cash") {
        const payRes  = await fetch(`${BASE_URL}/api/payments/simulate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ booking_id: bookingId, payment_method: "cash" }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setApiError(payData?.detail || "Cash payment failed."); setSubmitting(false); return; }
        onBooked(); onClose(); return;
      }

      // 4. Khalti
      const payRes  = await fetch(`${BASE_URL}/api/payments/initiate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id:  bookingId,
          return_url:  `${window.location.origin}/payment/verify`,
          website_url: window.location.origin,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) { setApiError(payData?.detail || "Khalti initiation failed."); setSubmitting(false); return; }
      window.location.href = payData.payment_url;

    } catch {
      setApiError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const imgSrc = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0b1120] border border-white/10 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition text-sm">
                ←
              </button>
            )}
            <div>
              <h2 className="text-base font-black text-white">Book Your Slot</h2>
              <p className="text-xs text-white/40">{ground.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:bg-white/20 transition text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center px-6 py-3 bg-white/3 border-b border-white/8 gap-1 flex-shrink-0">
          <StepDot n={1} label="Date & Slot" active={step === 1} done={step > 1} />
          <div className={`flex-1 h-px mx-2 ${step > 1 ? "bg-emerald-400" : "bg-white/10"}`} />
          <StepDot n={2} label="Review"      active={step === 2} done={step > 2} />
          <div className={`flex-1 h-px mx-2 ${step > 2 ? "bg-emerald-400" : "bg-white/10"}`} />
          <StepDot n={3} label="Payment"     active={step === 3} done={false} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {apiError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              ⚠ {apiError}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Ground card */}
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                {imgSrc
                  ? <img src={imgSrc} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-14 h-14 rounded-lg bg-emerald-400/10 flex items-center justify-center text-2xl flex-shrink-0">⚽</div>}
                <div>
                  <p className="font-bold text-white text-sm">{ground.name}</p>
                  <p className="text-white/40 text-xs">📍 {ground.location}</p>
                  <p className="text-emerald-400 font-bold text-xs mt-0.5">
                    Rs {ground.price_per_hour}/hr &nbsp;·&nbsp;
                    {fmt12(parseInt(ground.opening_time))} – {fmt12(parseInt(ground.closing_time))}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-bold text-white/60 mb-2">📅 Select Date</label>
                <input type="date" min={today()} value={date}
                  onChange={e => { setDate(e.target.value); setSelectedSlots([]); }}
                  className="w-full bg-white/5 border-2 border-white/10 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-emerald-500/60 transition-all [color-scheme:dark]" />
              </div>

              {/* Slots */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-white/60">🕐 Select Time Slot</label>
                  {date && (
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1 text-white/40"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" /> Available</span>
                      <span className="flex items-center gap-1 text-white/40"><span className="w-2.5 h-2.5 rounded bg-red-400 inline-block" /> Booked</span>
                      <span className="flex items-center gap-1 text-white/40"><span className="w-2.5 h-2.5 rounded bg-blue-400 inline-block" /> Selected</span>
                    </div>
                  )}
                </div>

                {!date ? (
                  <div className="bg-white/3 border-2 border-dashed border-white/10 rounded-xl py-10 text-center">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-white/30 text-sm font-medium">Pick a date to see available slots</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-white/40 text-sm">Loading slots…</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {slots.map((slot) => {
                        const booked   = isSlotBooked(slot, [...myBookings, ...groundBooks], date);
                        const selected = !!selectedSlots.find(s => s.startH === slot.startH);
                        return (
                          <button key={slot.label} type="button"
                            onClick={() => toggleSlot(slot)}
                            disabled={booked}
                            className={`relative py-3.5 rounded-xl text-sm font-black border-2 transition-all duration-150
                              ${booked
                                ? "bg-red-500/10 border-red-500/20 text-red-400/50 cursor-not-allowed"
                                : selected
                                ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400 cursor-pointer"}`}>
                            {slot.label}
                            {booked   && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-black">✕</span>}
                            {selected && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {selectedSlots.length > 0 && (
                      <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-blue-300 font-bold text-sm">
                            {fmt12(sorted[0].startH)} – {fmt12(sorted.at(-1).endH)}
                          </p>
                          <p className="text-blue-400/60 text-xs mt-0.5">
                            {totalHours} hr{totalHours > 1 ? "s" : ""} &nbsp;·&nbsp; Rs {useFree ? "FREE" : totalPrice}
                          </p>
                        </div>
                        <button onClick={() => setSelectedSlots([])}
                          className="text-blue-400/50 hover:text-blue-400 text-xs font-semibold transition">
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Loyalty Badge inside modal */}
              {date && (
                <div className="rounded-xl overflow-hidden">
                  <LoyaltyBadge
                    groundId={ground.id}
                    useFree={useFree}
                    onFreeToggle={(val) => {
                      setUseFree(val);
                      if (val) setMethod("free");
                      else setMethod("khalti");
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-white">Review Booking</h3>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {imgSrc && <img src={imgSrc} alt="" className="w-full h-32 object-cover" />}
                <div className="p-4 space-y-3">
                  {[
                    ["Ground",   ground.name],
                    ["Location", ground.location],
                    ["Date",     date],
                    ["From",     fmt12(sorted[0].startH)],
                    ["To",       fmt12(sorted.at(-1).endH)],
                    ["Duration", `${totalHours} hr${totalHours > 1 ? "s" : ""}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-white/40">{k}</span>
                      <span className="text-white font-semibold">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1">
                    <span className="text-white/60 font-bold">Total</span>
                    {useFree ? (
                      <div className="text-right">
                        <span className="text-white/30 line-through text-sm mr-2">Rs {(totalHours * pricePerHr).toFixed(2)}</span>
                        <span className="text-amber-400 font-black">🎁 FREE</span>
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-black text-lg">Rs {totalPrice}</span>
                    )}
                  </div>
                  {useFree && (
                    <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg p-2.5 text-center">
                      <p className="text-amber-400 text-xs font-semibold">🎉 Loyalty reward applied — this booking is FREE!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-white">Payment Method</h3>

              {useFree ? (
                <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-5 text-center">
                  <p className="text-4xl mb-2">🎁</p>
                  <p className="text-amber-300 font-black text-base">Free Loyalty Booking!</p>
                  <p className="text-amber-400/60 text-sm mt-1">No payment required — enjoy your free game.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "khalti", icon: "🟣", label: "Khalti", desc: "Pay with Khalti wallet", badge: "Recommended" },
                    { id: "cash",   icon: "💵", label: "Cash",   desc: "Pay at the venue" },
                  ].map(m => (
                    <button key={m.id} onClick={() => setMethod(m.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all relative
                        ${method === m.id ? "border-emerald-500/60 bg-emerald-500/10" : "border-white/10 bg-white/3 hover:border-white/20"}`}>
                      {m.badge && (
                        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                          {m.badge}
                        </span>
                      )}
                      <div className="text-2xl mb-1.5">{m.icon}</div>
                      <p className={`font-black text-sm ${method === m.id ? "text-emerald-400" : "text-white/70"}`}>{m.label}</p>
                      <p className="text-white/30 text-xs">{m.desc}</p>
                      {method === m.id && (
                        <div className="mt-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-black">✓</div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {method === "khalti" && !useFree && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-sm space-y-1">
                  <p className="font-bold text-purple-300">🟣 Khalti Sandbox Credentials</p>
                  <p className="text-purple-400/70 text-xs">ID: <span className="font-mono">9800000001</span> · MPIN: <span className="font-mono">1111</span> · OTP: <span className="font-mono">987654</span></p>
                </div>
              )}

              {/* Summary */}
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2.5 text-sm">
                <p className="font-bold text-white/40 text-xs uppercase tracking-wider">Summary</p>
                <div className="flex justify-between">
                  <span className="text-white/40">{ground.name}</span>
                  <span className="text-white/60 font-semibold">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">{fmt12(sorted[0].startH)} – {fmt12(sorted.at(-1).endH)}</span>
                  <span className="text-white/40">{totalHours} hr</span>
                </div>
                <div className="border-t border-white/8 pt-2.5 flex justify-between">
                  <span className="font-bold text-white">Total</span>
                  {useFree
                    ? <span className="text-amber-400 font-black">🎁 FREE</span>
                    : <span className="text-emerald-400 font-black text-xl">Rs {totalPrice}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0b1120] flex-shrink-0">
          {step === 1 && (
            <button
              onClick={() => {
                if (!date) { setApiError("Please select a date."); return; }
                if (selectedSlots.length === 0) { setApiError("Please select at least one time slot."); return; }
                setApiError(""); setStep(2);
              }}
              className="w-full py-3.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 transition text-sm shadow-lg shadow-emerald-500/20">
              Continue →
            </button>
          )}
          {step === 2 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl hover:bg-white/10 transition">
                ← Edit
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 transition text-sm">
                Choose Payment →
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl hover:bg-white/10 transition">
                ← Back
              </button>
              <button onClick={handlePay} disabled={submitting}
                className={`flex-1 py-3.5 font-black rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm
                  ${useFree
                    ? "bg-amber-400 text-black hover:bg-amber-300 shadow-lg shadow-amber-400/20"
                    : method === "khalti"
                    ? "bg-purple-600 hover:bg-purple-500 text-white"
                    : "bg-emerald-500 hover:bg-emerald-400 text-white"}`}>
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Processing…</>
                  : useFree
                  ? "🎁 Confirm Free Booking"
                  : method === "khalti"
                  ? `🟣 Pay Rs ${totalPrice} via Khalti`
                  : `💵 Pay Rs ${totalPrice} (Cash)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function PlayerMyBookings() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings,       setBookings]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filter,         setFilter]         = useState("all");
  const [cancelling,     setCancelling]     = useState(null);
  const [grounds,        setGrounds]        = useState([]);
  const [loadingGrounds, setLoadingGrounds] = useState(true);
  const [selectedGround, setSelectedGround] = useState(null);
  const [groundFilter,   setGroundFilter]   = useState("");
  const [loyaltyTotal,   setLoyaltyTotal]   = useState(0);

  const fetchBookings = async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBookings(data.results || data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchBookings();

    fetch(`${BASE_URL}/api/grounds/`)
      .then(r => r.json())
      .then(d => setGrounds(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoadingGrounds(false));

    // Fetch loyalty total free count for the badge
    fetch(`${BASE_URL}/api/bookings/loyalty/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setLoyaltyTotal(d.total_free_available || 0))
      .catch(() => {});
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      const res = await fetch(`${BASE_URL}/api/bookings/${id}/cancel/`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchBookings();
    } finally { setCancelling(null); }
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  const filteredGrounds = grounds.filter(g =>
    !groundFilter.trim() ||
    g.name?.toLowerCase().includes(groundFilter.toLowerCase()) ||
    g.location?.toLowerCase().includes(groundFilter.toLowerCase())
  );

  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    pending:   bookings.filter(b => b.status === "pending").length,
    cancelled: bookings.filter(b => b.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[#080d18] pt-20">

      {/* Booking modal */}
      {selectedGround && (
        <BookingModal
          ground={selectedGround}
          myBookings={bookings}
          onClose={() => setSelectedGround(null)}
          onBooked={() => { fetchBookings(); setSelectedGround(null); }}
        />
      )}

      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-amber-500/4 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative bg-[#080d18]/80 backdrop-blur border-b border-white/8 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/player-dashboard")}
          className="text-white/40 hover:text-white text-sm font-medium flex items-center gap-1.5 transition">
          ← Dashboard
        </button>
        <span className="text-white/15">/</span>
        <span className="text-white/70 font-semibold text-sm">My Bookings</span>
        {loyaltyTotal > 0 && (
          <button
            onClick={() => navigate("/my-rewards")}
            className="ml-auto flex items-center gap-2 bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-black px-3 py-1.5 rounded-full hover:bg-amber-400/25 transition animate-pulse"
          >
            🎁 {loyaltyTotal} FREE {loyaltyTotal > 1 ? "BOOKINGS" : "BOOKING"} READY
          </button>
        )}
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── LEFT: Book a Ground panel ── */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden sticky top-24">

              {/* Panel header */}
              <div className="px-5 py-4 border-b border-white/10 bg-white/3">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span className="text-emerald-400">⚽</span> Book a Ground
                </h2>
                <p className="text-white/30 text-xs mt-0.5">
                  Pay via 🟣 Khalti · 💵 Cash · or use a 🎁 Free reward
                </p>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-white/8">
                <input type="text" placeholder="Search grounds..."
                  value={groundFilter} onChange={e => setGroundFilter(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/50 transition" />
              </div>

              {/* Ground list */}
              <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                {loadingGrounds ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredGrounds.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-2">🏟️</p>
                    <p className="text-white/30 text-sm">No grounds found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredGrounds.map(g => {
                      const imgSrc = g.image
                        ? g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`
                        : null;
                      return (
                        <div key={g.id}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition cursor-pointer group"
                          onClick={() => setSelectedGround(g)}>
                          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/10 border border-white/8">
                            {imgSrc
                              ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              : <div className="w-full h-full flex items-center justify-center text-2xl">⚽</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{g.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">📍 {g.location}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-emerald-400 font-bold text-xs">Rs {g.price_per_hour}/hr</span>
                              <span className="text-white/20 text-xs">·</span>
                              <span className="text-white/30 text-xs">{fmt12(parseInt(g.opening_time))}–{fmt12(parseInt(g.closing_time))}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-lg group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition">
                              Book
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: My Bookings ── */}
          <div className="col-span-12 lg:col-span-7">

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total",     value: stats.total,     color: "text-white",       from: "from-white/5"        },
                { label: "Confirmed", value: stats.confirmed, color: "text-emerald-400", from: "from-emerald-500/10" },
                { label: "Pending",   value: stats.pending,   color: "text-amber-400",   from: "from-amber-500/10"   },
                { label: "Cancelled", value: stats.cancelled, color: "text-red-400",     from: "from-red-500/10"     },
              ].map(s => (
                <div key={s.label}
                  className={`bg-gradient-to-br ${s.from} to-transparent border border-white/8 rounded-2xl p-4 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-white/30 text-xs mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-6 bg-white/3 border border-white/8 rounded-xl p-1.5 w-fit">
              {["all", "pending", "confirmed", "cancelled"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all
                    ${filter === f ? "bg-emerald-500 text-white shadow-sm" : "text-white/40 hover:bg-white/5 hover:text-white"}`}>
                  {f}
                </button>
              ))}
            </div>

            {/* Booking list */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white/3 border border-white/8 rounded-2xl py-16 text-center">
                <p className="text-5xl mb-3">🏟️</p>
                <p className="text-white/50 font-semibold mb-1">No bookings found</p>
                <p className="text-white/25 text-sm">Book a ground from the panel on the left</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b, idx) => {
                  const cfg = STATUS[b.status] || STATUS.pending;
                  return (
                    <div key={b.id}
                      style={{ animationDelay: `${idx * 40}ms` }}
                      className="bg-white/3 border border-white/8 rounded-2xl px-5 py-4 hover:border-white/15 hover:bg-white/5 transition-all duration-200">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-white font-black text-base truncate">{b.ground_name}</h3>
                            <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            {b.is_free_booking && (
                              <span className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-black bg-amber-400/10 border border-amber-400/30 text-amber-400">
                                🎁 FREE
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/30">📅</span>
                              <span className="text-white/70 font-medium">{b.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/30">🕐</span>
                              <span className="text-white/70 font-medium">{fmt12t(b.start_time)} – {fmt12t(b.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/30">💰</span>
                              {b.is_free_booking
                                ? <span className="text-amber-400 font-bold">FREE <span className="text-white/30 line-through text-xs">Rs {b.total_price}</span></span>
                                : <span className="text-emerald-400 font-bold">Rs {b.total_price}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-white/30">🎫</span>
                              <span className="text-white/30">#{b.id}</span>
                            </div>
                          </div>
                        </div>
                        {b.status === "pending" && (
                          <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                            className="flex-shrink-0 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/20 transition disabled:opacity-50">
                            {cancelling === b.id ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loyalty promo banner */}
            {!loading && bookings.length > 0 && (
              <button
                onClick={() => navigate("/my-rewards")}
                className="w-full mt-5 bg-gradient-to-r from-amber-400/10 to-amber-600/5 border border-amber-400/30 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-400/60 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition">🏆</div>
                <div className="flex-1 text-left">
                  <p className="text-amber-300 font-black text-sm">
                    {loyaltyTotal > 0
                      ? `🎉 You have ${loyaltyTotal} free booking${loyaltyTotal > 1 ? "s" : ""} ready to use!`
                      : "Book 5 times at the same ground, get the 6th FREE!"}
                  </p>
                  <p className="text-amber-400/50 text-xs mt-0.5">
                    {loyaltyTotal > 0 ? "Tap to view & redeem your rewards →" : "View your loyalty progress →"}
                  </p>
                </div>
                <span className="text-amber-400/40 text-lg group-hover:translate-x-1 transition">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
