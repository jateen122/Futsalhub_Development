import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── tiny helpers ─────────────────────────────────────────── */
const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
};

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const calcPrice = (start, end, pricePerHour) => {
  if (!start || !end) return 0;
  const diff = (toMinutes(end) - toMinutes(start)) / 60;
  return diff > 0 ? (diff * parseFloat(pricePerHour)).toFixed(2) : 0;
};

const today = () => new Date().toISOString().split("T")[0];

/* ─── step indicator ───────────────────────────────────────── */
const Step = ({ num, label, active, done }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500
        ${done ? "bg-emerald-500 text-white" : active ? "bg-amber-400 text-black scale-110" : "bg-white/10 text-white/40"}`}
    >
      {done ? "✓" : num}
    </div>
    <span className={`text-xs font-medium tracking-wide ${active ? "text-amber-400" : done ? "text-emerald-400" : "text-white/30"}`}>
      {label}
    </span>
  </div>
);

/* ─── main component ───────────────────────────────────────── */
export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [step, setStep] = useState(1); // 1=details  2=time  3=payment  4=success

  const [ground, setGround] = useState(null);
  const [loadingGround, setLoadingGround] = useState(true);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [method, setMethod] = useState("esewa");

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);   // successful payment data

  /* ── fetch ground ─────────────────────────────────────────── */
  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BASE_URL}/api/grounds/`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        const found = list.find((g) => String(g.id) === String(id));
        setGround(found || null);
        setLoadingGround(false);
      })
      .catch(() => setLoadingGround(false));
  }, [id]);

  /* ── derived ──────────────────────────────────────────────── */
  const totalPrice = ground ? calcPrice(startTime, endTime, ground.price_per_hour) : 0;
  const duration =
    startTime && endTime
      ? ((toMinutes(endTime) - toMinutes(startTime)) / 60).toFixed(1)
      : 0;

  /* ── step 1 → 2 ───────────────────────────────────────────── */
  const validateStep1 = () => {
    const e = {};
    if (!date) e.date = "Please select a date.";
    if (!startTime) e.startTime = "Select start time.";
    if (!endTime) e.endTime = "Select end time.";
    if (startTime && endTime && toMinutes(startTime) >= toMinutes(endTime))
      e.endTime = "End time must be after start time.";
    if (startTime && ground) {
      const open  = ground.opening_time?.slice(0, 5);
      const close = ground.closing_time?.slice(0, 5);
      if (open && toMinutes(startTime) < toMinutes(open))
        e.startTime = `Ground opens at ${fmt12(open)}.`;
      if (close && endTime && toMinutes(endTime) > toMinutes(close))
        e.endTime = `Ground closes at ${fmt12(close)}.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── submit booking + payment ─────────────────────────────── */
  const handleConfirm = async () => {
    setSubmitting(true);
    setErrors({});

    try {
      // 1. Create booking
      const bookRes = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ground: ground.id,
          date,
          start_time: startTime,
          end_time: endTime,
        }),
      });

      const bookData = await bookRes.json();

      if (!bookRes.ok) {
        const msg =
          bookData?.non_field_errors?.[0] ||
          bookData?.detail ||
          bookData?.message ||
          "Booking failed. Slot may already be taken.";
        setErrors({ api: msg });
        setSubmitting(false);
        return;
      }

      const bookingId = bookData?.booking?.id || bookData?.id;

      // 2. Simulate payment
      const payRes = await fetch(`${BASE_URL}/api/payments/simulate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          booking_id: bookingId,
          payment_method: method,
        }),
      });

      const payData = await payRes.json();

      if (!payRes.ok) {
        setErrors({ api: payData?.detail || "Payment failed." });
        setSubmitting(false);
        return;
      }

      setResult(payData);
      setStep(4);
    } catch (err) {
      setErrors({ api: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /* ── loading / not found ──────────────────────────────────── */
  if (loadingGround) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 font-mono text-sm tracking-widest">LOADING GROUND</p>
        </div>
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-6xl mb-4">⚽</p>
          <p className="text-2xl font-bold mb-2">Ground not found</p>
          <button onClick={() => navigate("/grounds")} className="mt-4 px-6 py-2 bg-amber-400 text-black rounded-lg font-semibold">
            Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;

  /* ── SUCCESS SCREEN ───────────────────────────────────────── */
  if (step === 4 && result) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">

          {/* animated checkmark */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="absolute inset-4 rounded-full bg-emerald-500/30" />
            <div className="absolute inset-0 flex items-center justify-center text-6xl">✅</div>
          </div>

          <h1 className="text-4xl font-black text-white mb-2">Booked!</h1>
          <p className="text-white/50 mb-8 font-mono text-sm">Payment confirmed successfully</p>

          {/* receipt card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Ground</span>
              <span className="text-white font-semibold">{ground.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Date</span>
              <span className="text-white font-semibold">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Time</span>
              <span className="text-white font-semibold">{fmt12(startTime)} – {fmt12(endTime)}</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-white/40">Amount Paid</span>
              <span className="text-emerald-400 font-black text-lg">Rs {result.amount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Transaction ID</span>
              <span className="text-amber-400 font-mono">{result.transaction_id}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Method</span>
              <span className="text-white/60">{result.payment_method}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/player-dashboard")}
              className="flex-1 py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition"
            >
              More Grounds
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ── MAIN LAYOUT ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0f1e] pt-20">

      {/* ── HERO BANNER ──────────────────────────────────────── */}
      <div className="relative h-64 overflow-hidden">
        {imgSrc ? (
          <img src={imgSrc} alt={ground.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-700 flex items-center justify-center text-6xl">⚽</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-3xl font-black text-white">{ground.name}</h1>
          <p className="text-white/60 mt-1">📍 {ground.location}</p>
        </div>
        <button
          onClick={() => navigate("/grounds")}
          className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-black/70 transition"
        >
          ← Back
        </button>
      </div>

      {/* ── STEP INDICATOR ───────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 py-8 px-4">
        <Step num={1} label="DATE & TIME" active={step === 1} done={step > 1} />
        <div className={`h-px w-16 transition-all duration-500 ${step > 1 ? "bg-emerald-500" : "bg-white/10"}`} />
        <Step num={2} label="REVIEW"    active={step === 2} done={step > 2} />
        <div className={`h-px w-16 transition-all duration-500 ${step > 2 ? "bg-emerald-500" : "bg-white/10"}`} />
        <Step num={3} label="PAYMENT"   active={step === 3} done={step > 3} />
      </div>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 pb-20">

        {/* error banner */}
        {errors.api && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-300 text-sm font-medium">
            ⚠ {errors.api}
          </div>
        )}

        {/* ─── STEP 1 : Date & Time ─────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">

            {/* ground info pill */}
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Price</p>
                <p className="text-2xl font-black text-amber-400">Rs {ground.price_per_hour}<span className="text-sm font-normal text-white/40">/hr</span></p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Hours</p>
                <p className="text-white/60 text-sm">{fmt12(ground.opening_time?.slice(0,5))} – {fmt12(ground.closing_time?.slice(0,5))}</p>
              </div>
            </div>

            {/* date */}
            <div>
              <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">Select Date</label>
              <input
                type="date"
                min={today()}
                value={date}
                onChange={(e) => { setDate(e.target.value); setErrors({}); }}
                className={`w-full bg-white/5 border rounded-xl p-4 text-white focus:outline-none focus:border-amber-400 transition
                  ${errors.date ? "border-red-500" : "border-white/10"}`}
              />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
            </div>

            {/* times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  min={ground.opening_time?.slice(0,5)}
                  max={ground.closing_time?.slice(0,5)}
                  onChange={(e) => { setStartTime(e.target.value); setErrors({}); }}
                  className={`w-full bg-white/5 border rounded-xl p-4 text-white focus:outline-none focus:border-amber-400 transition
                    ${errors.startTime ? "border-red-500" : "border-white/10"}`}
                />
                {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <label className="block text-white/60 text-xs uppercase tracking-widest mb-2">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  min={startTime || ground.opening_time?.slice(0,5)}
                  max={ground.closing_time?.slice(0,5)}
                  onChange={(e) => { setEndTime(e.target.value); setErrors({}); }}
                  className={`w-full bg-white/5 border rounded-xl p-4 text-white focus:outline-none focus:border-amber-400 transition
                    ${errors.endTime ? "border-red-500" : "border-white/10"}`}
                />
                {errors.endTime && <p className="text-red-400 text-xs mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {/* live price preview */}
            {totalPrice > 0 && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-xs uppercase tracking-widest">Estimated Total</p>
                  <p className="text-white/60 text-sm mt-0.5">{duration} hr × Rs {ground.price_per_hour}</p>
                </div>
                <p className="text-amber-400 text-3xl font-black">Rs {totalPrice}</p>
              </div>
            )}

            <button
              onClick={() => { if (validateStep1()) setStep(2); }}
              className="w-full py-4 bg-amber-400 text-black font-black text-lg rounded-xl hover:bg-amber-300 transition"
            >
              Continue →
            </button>

          </div>
        )}

        {/* ─── STEP 2 : Review ──────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">

            <h2 className="text-xl font-bold text-white">Review Your Booking</h2>

            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {imgSrc && <img src={imgSrc} alt={ground.name} className="w-full h-40 object-cover" />}
              <div className="p-6 space-y-4">
                {[
                  ["Ground",    ground.name],
                  ["Location",  ground.location],
                  ["Date",      date],
                  ["Time",      `${fmt12(startTime)} – ${fmt12(endTime)}`],
                  ["Duration",  `${duration} hours`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <span className="text-white/40 text-sm">{k}</span>
                    <span className="text-white font-semibold text-sm">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <span className="text-white/40">Total Amount</span>
                  <span className="text-amber-400 font-black text-xl">Rs {totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-white/20 text-white font-bold rounded-xl hover:bg-white/5 transition"
              >
                ← Edit
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition"
              >
                Proceed to Pay →
              </button>
            </div>

          </div>
        )}

        {/* ─── STEP 3 : Payment ─────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">

            <h2 className="text-xl font-bold text-white">Choose Payment Method</h2>

            {/* method cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: "esewa", label: "eSewa", icon: "💚", desc: "Instant digital payment" },
                { id: "cash",  label: "Cash",  icon: "💵", desc: "Pay at the ground" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-5 rounded-2xl border-2 text-left transition-all duration-200
                    ${method === m.id
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"}`}
                >
                  <div className="text-3xl mb-2">{m.icon}</div>
                  <div className={`font-bold ${method === m.id ? "text-amber-400" : "text-white"}`}>{m.label}</div>
                  <div className="text-white/40 text-xs mt-1">{m.desc}</div>
                  {method === m.id && (
                    <div className="mt-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-black text-xs font-black">✓</div>
                  )}
                </button>
              ))}
            </div>

            {/* final summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Order Summary</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/60">{ground.name}</span>
                <span className="text-white">{date}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-white/60">{fmt12(startTime)} – {fmt12(endTime)}</span>
                <span className="text-white">{duration} hrs</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between">
                <span className="text-white font-semibold">Total</span>
                <span className="text-amber-400 font-black text-2xl">Rs {totalPrice}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 border border-white/20 text-white font-bold rounded-xl hover:bg-white/5 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-4 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  `Pay Rs ${totalPrice}`
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
