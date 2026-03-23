import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  pending:   { dot: "bg-amber-400",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  label: "Pending"   },
  confirmed: { dot: "bg-green-500",  text: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  label: "Confirmed" },
  cancelled: { dot: "bg-red-400",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    label: "Cancelled" },
  refunded:  { dot: "bg-blue-400",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   label: "Refunded"  },
};

/* ─── Step dot ───────────────────────────────────────────────── */
function StepDot({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all
        ${done ? "bg-green-500 border-green-500 text-white"
        : active ? "bg-white border-green-500 text-green-600"
        : "bg-gray-100 border-gray-300 text-gray-400"}`}>
        {done ? "✓" : n}
      </div>
      <span className={`text-xs font-bold hidden sm:block
        ${active ? "text-green-600" : done ? "text-gray-600" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOOKING MODAL — with Khalti payment
═══════════════════════════════════════════════════════════════ */
function BookingModal({ ground, myBookings, onClose, onBooked }) {
  const token = localStorage.getItem("access");

  const [step,          setStep]          = useState(1);
  const [date,          setDate]          = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [groundBooks,   setGroundBooks]   = useState([]);
  const [loadingSlots,  setLoadingSlots]  = useState(false);
  const [method,        setMethod]        = useState("khalti");
  const [submitting,    setSubmitting]    = useState(false);
  const [apiError,      setApiError]      = useState("");

  const slots      = buildSlots(ground.opening_time, ground.closing_time);
  const pricePerHr = parseFloat(ground.price_per_hour);

  const sorted     = [...selectedSlots].sort((a, b) => a.startH - b.startH);
  const totalHours = selectedSlots.length;
  const totalPrice = (totalHours * pricePerHr).toFixed(2);
  const startTime  = sorted[0]    ? `${String(sorted[0].startH).padStart(2,"0")}:00`      : "";
  const endTime    = sorted.at(-1) ? `${String(sorted.at(-1).endH).padStart(2,"0")}:00`   : "";

  // Fetch ground bookings to show booked slots
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

  /* ── Pay handler ─────────────────────────────────────────── */
  const handlePay = async () => {
    setSubmitting(true);
    setApiError("");

    try {
      // 1. Create the booking
      const bookRes  = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ground: ground.id, date, start_time: startTime, end_time: endTime }),
      });
      const bookData = await bookRes.json();

      if (!bookRes.ok) {
        setApiError(bookData?.non_field_errors?.[0] || bookData?.detail || "Booking failed.");
        setSubmitting(false);
        return;
      }

      const bookingId = bookData?.booking?.id || bookData?.id;

      // 2. Cash payment — simulate
      if (method === "cash") {
        const payRes  = await fetch(`${BASE_URL}/api/payments/simulate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ booking_id: bookingId, payment_method: "cash" }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setApiError(payData?.detail || "Cash payment failed."); setSubmitting(false); return; }
        onBooked();
        onClose();
        return;
      }

      // 3. Khalti payment — initiate
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

      if (!payRes.ok) {
        setApiError(payData?.detail || "Khalti initiation failed.");
        setSubmitting(false);
        return;
      }

      // 4. Redirect to Khalti payment page
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition text-sm">
                ←
              </button>
            )}
            <div>
              <h2 className="text-base font-black text-gray-900">Book Your Slot</h2>
              <p className="text-xs text-gray-400">{ground.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Step bar */}
        <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-100 gap-1 flex-shrink-0">
          <StepDot n={1} label="Date & Slot" active={step === 1} done={step > 1} />
          <div className={`flex-1 h-0.5 mx-2 ${step > 1 ? "bg-green-400" : "bg-gray-200"}`} />
          <StepDot n={2} label="Review"      active={step === 2} done={step > 2} />
          <div className={`flex-1 h-0.5 mx-2 ${step > 2 ? "bg-green-400" : "bg-gray-200"}`} />
          <StepDot n={3} label="Payment"     active={step === 3} done={false} />
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {apiError && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              ⚠ {apiError}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                {imgSrc
                  ? <img src={imgSrc} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-14 h-14 rounded-lg bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">⚽</div>}
                <div>
                  <p className="font-bold text-gray-800 text-sm">{ground.name}</p>
                  <p className="text-gray-500 text-xs">📍 {ground.location}</p>
                  <p className="text-green-600 font-bold text-xs mt-0.5">
                    Rs {ground.price_per_hour}/hr &nbsp;·&nbsp;
                    {fmt12(parseInt(ground.opening_time))} – {fmt12(parseInt(ground.closing_time))}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">📅 Select Date</label>
                <input type="date" min={today()} value={date}
                  onChange={e => { setDate(e.target.value); setSelectedSlots([]); }}
                  className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-gray-800 font-semibold focus:outline-none focus:border-green-500 transition-all" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700">🕐 Select Time Slot</label>
                  {date && (
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Available</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Booked</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Selected</span>
                    </div>
                  )}
                </div>

                {!date ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                    <p className="text-3xl mb-2">📅</p>
                    <p className="text-gray-400 text-sm font-medium">Pick a date to see available slots</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 text-sm">Loading slots…</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                      {slots.map((slot) => {
                        const booked   = isSlotBooked(slot, [...myBookings, ...groundBooks], date);
                        const selected = !!selectedSlots.find(s => s.startH === slot.startH);
                        return (
                          <button key={slot.label} type="button"
                            onClick={() => toggleSlot(slot)}
                            disabled={booked}
                            className={`relative py-3.5 rounded-xl text-sm font-black border-2 transition-all duration-150
                              ${booked
                                ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                                : selected
                                ? "bg-blue-500 border-blue-500 text-white shadow-md scale-105"
                                : "bg-green-50 border-green-300 text-green-700 hover:bg-green-500 hover:text-white hover:border-green-500 hover:scale-105 cursor-pointer"}`}>
                            {slot.label}
                            {booked   && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-black shadow">✕</span>}
                            {selected && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[8px] font-black shadow">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {selectedSlots.length > 0 && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-blue-700 font-bold text-sm">
                            {fmt12(sorted[0].startH)} – {fmt12(sorted.at(-1).endH)}
                          </p>
                          <p className="text-blue-500 text-xs mt-0.5">
                            {totalHours} hr{totalHours > 1 ? "s" : ""} &nbsp;·&nbsp; Rs {totalPrice}
                          </p>
                        </div>
                        <button onClick={() => setSelectedSlots([])}
                          className="text-blue-400 hover:text-blue-600 text-xs font-semibold transition">
                          Clear
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: Review ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-gray-800">Review Booking</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
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
                    <div key={k} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-gray-800 font-semibold">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-700 font-bold">Total</span>
                    <span className="text-green-600 font-black text-lg">Rs {totalPrice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-black text-gray-800">Payment Method</h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id:    "khalti",
                    icon:  "🟣",
                    label: "Khalti",
                    desc:  "Pay with Khalti wallet",
                    badge: "Recommended",
                  },
                  {
                    id:    "cash",
                    icon:  "💵",
                    label: "Cash",
                    desc:  "Pay at the venue",
                  },
                ].map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative
                      ${method === m.id ? "border-green-500 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                    {m.badge && (
                      <span className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                        {m.badge}
                      </span>
                    )}
                    <div className="text-2xl mb-1.5">{m.icon}</div>
                    <p className={`font-black text-sm ${method === m.id ? "text-green-700" : "text-gray-700"}`}>{m.label}</p>
                    <p className="text-gray-400 text-xs">{m.desc}</p>
                    {method === m.id && (
                      <div className="mt-1.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-black">✓</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Khalti info box */}
              {method === "khalti" && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm space-y-1">
                  <p className="font-bold text-purple-800">🟣 How Khalti works:</p>
                  <p className="text-purple-700 text-xs leading-relaxed">
                    You'll be redirected to Khalti's secure payment page. After payment, you'll return here with confirmation.
                  </p>
                  <p className="text-purple-600 text-xs font-semibold mt-2">
                    Sandbox test ID: <span className="font-mono">9800000001</span> &nbsp;·&nbsp; MPIN: <span className="font-mono">1111</span> &nbsp;·&nbsp; OTP: <span className="font-mono">987654</span>
                  </p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2.5 text-sm">
                <p className="font-bold text-gray-700 text-xs uppercase tracking-wider">Summary</p>
                <div className="flex justify-between"><span className="text-gray-500">{ground.name}</span><span className="text-gray-700 font-semibold">{date}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">{fmt12(sorted[0].startH)} – {fmt12(sorted.at(-1).endH)}</span><span className="text-gray-700">{totalHours} hr</span></div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-green-600 font-black text-xl">Rs {totalPrice}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          {step === 1 && (
            <button
              onClick={() => {
                if (!date) { setApiError("Please select a date."); return; }
                if (selectedSlots.length === 0) { setApiError("Please select at least one time slot."); return; }
                setApiError(""); setStep(2);
              }}
              className="w-full py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition disabled:opacity-40">
              Continue →
            </button>
          )}
          {step === 2 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3.5 bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                ← Edit
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition">
                Choose Payment →
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3.5 bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">
                ← Back
              </button>
              <button onClick={handlePay} disabled={submitting}
                className={`flex-1 py-3.5 font-black rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2
                  ${method === "khalti" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}>
                {submitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
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

  const filtered       = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
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
    <div className="min-h-screen bg-gray-50 pt-20">

      {selectedGround && (
        <BookingModal
          ground={selectedGround}
          myBookings={bookings}
          onClose={() => setSelectedGround(null)}
          onBooked={() => { fetchBookings(); setSelectedGround(null); }}
        />
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/player-dashboard")}
          className="text-gray-500 hover:text-gray-800 text-sm font-medium flex items-center gap-1.5 transition">
          ← Dashboard
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold text-sm">My Bookings</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── LEFT: Book a Ground ── */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden sticky top-24">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-black text-gray-900">⚽ Book a Ground</h2>
                <p className="text-gray-400 text-xs mt-0.5">Pay instantly with 🟣 Khalti or 💵 Cash</p>
              </div>
              <div className="px-5 py-3 border-b border-gray-100">
                <input type="text" placeholder="Search grounds..."
                  value={groundFilter} onChange={e => setGroundFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-500 transition" />
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-260px)]">
                {loadingGrounds ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredGrounds.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-3xl mb-2">🏟️</p>
                    <p className="text-gray-400 text-sm">No grounds found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredGrounds.map(g => {
                      const imgSrc = g.image
                        ? g.image.startsWith("http") ? g.image : `${BASE_URL}${g.image}`
                        : null;
                      return (
                        <div key={g.id}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer group"
                          onClick={() => setSelectedGround(g)}>
                          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                            {imgSrc
                              ? <img src={imgSrc} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              : <div className="w-full h-full flex items-center justify-center text-2xl">⚽</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-bold text-sm truncate">{g.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">📍 {g.location}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-green-600 font-bold text-xs">Rs {g.price_per_hour}/hr</span>
                              <span className="text-gray-300 text-xs">·</span>
                              <span className="text-gray-400 text-xs">
                                {fmt12(parseInt(g.opening_time))}–{fmt12(parseInt(g.closing_time))}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-black rounded-lg group-hover:bg-green-600 transition shadow-sm">
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
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "Total",     value: stats.total,     color: "text-gray-800",  bg: "bg-white"    },
                { label: "Confirmed", value: stats.confirmed, color: "text-green-600", bg: "bg-green-50" },
                { label: "Pending",   value: stats.pending,   color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Cancelled", value: stats.cancelled, color: "text-red-500",   bg: "bg-red-50"   },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-4 text-center shadow-sm`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-gray-400 text-xs mt-1 uppercase tracking-wider font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-5 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm w-fit">
              {["all", "pending", "confirmed", "cancelled"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all
                    ${filter === f ? "bg-green-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm py-16 text-center">
                <p className="text-5xl mb-3">🏟️</p>
                <p className="text-gray-500 font-semibold mb-1">No bookings found</p>
                <p className="text-gray-400 text-sm">Book a ground from the panel on the left</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(b => {
                  const cfg = STATUS[b.status] || STATUS.pending;
                  return (
                    <div key={b.id}
                      className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 hover:border-gray-300 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-gray-900 font-black text-base truncate">{b.ground_name}</h3>
                            <span className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">📅</span>
                              <span className="text-gray-700 font-medium">{b.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">🕐</span>
                              <span className="text-gray-700 font-medium">{fmt12t(b.start_time)} – {fmt12t(b.end_time)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">💰</span>
                              <span className="text-green-600 font-bold">Rs {b.total_price}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">🎫</span>
                              <span className="text-gray-500">#{b.id}</span>
                            </div>
                          </div>
                        </div>
                        {b.status === "pending" && (
                          <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                            className="flex-shrink-0 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition disabled:opacity-50">
                            {cancelling === b.id ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
