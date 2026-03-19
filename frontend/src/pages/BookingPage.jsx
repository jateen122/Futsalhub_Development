import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

/* ─── helpers ─────────────────────────────────────────────────── */
const parseTime = (t) => {
  if (!t) return null;
  const h24 = parseInt(t.split(":")[0], 10);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h24, h12, ampm, label: `${h12} ${ampm}` };
};

const buildSlots = (openingStr, closingStr) => {
  if (!openingStr || !closingStr) return [];
  const open = parseInt(openingStr.split(":")[0], 10);
  const close = parseInt(closingStr.split(":")[0], 10);
  const slots = [];
  for (let h = open; h < close; h++) {
    const startH12 = h % 12 === 0 ? 12 : h % 12;
    const startAmpm = h >= 12 ? "PM" : "AM";
    const endH = h + 1;
    const endH12 = endH % 12 === 0 ? 12 : endH % 12;
    const endAmpm = endH >= 12 ? "PM" : "AM";
    slots.push({
      start: `${String(h).padStart(2, "0")}:00`,
      end: `${String(endH).padStart(2, "0")}:00`,
      label: `${startH12}:00 ${startAmpm} – ${endH12}:00 ${endAmpm}`,
      shortStart: `${startH12} ${startAmpm}`,
      shortEnd: `${endH12} ${endAmpm}`,
    });
  }
  return slots;
};

const today = () => new Date().toISOString().split("T")[0];

const fmtDate = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [ground, setGround] = useState(null);
  const [loadingGround, setLoadingGround] = useState(true);

  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [method, setMethod] = useState("esewa");

  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetch(`${BASE_URL}/api/grounds/`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        const found = list.find((g) => String(g.id) === String(id));
        setGround(found || null);
      })
      .catch(console.error)
      .finally(() => setLoadingGround(false));
  }, [id]);

  useEffect(() => {
    if (!ground || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`${BASE_URL}/api/bookings/my/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const all = data.results || data || [];
        const relevant = all.filter(
          (b) =>
            String(b.ground) === String(ground.id) &&
            b.date === selectedDate &&
            !["cancelled", "refunded"].includes(b.status),
        );
        setBookedSlots(
          relevant.map((b) => ({ start: b.start_time, end: b.end_time })),
        );
      })
      .catch(() => setBookedSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [ground, selectedDate]);

  const slots = ground
    ? buildSlots(ground.opening_time, ground.closing_time)
    : [];

  const isBooked = (slot) =>
    bookedSlots.some((b) => b.start <= slot.start && slot.end <= b.end) ||
    bookedSlots.some((b) => slot.start < b.end && slot.end > b.start);

  const totalPrice =
    selectedSlot && ground
      ? parseFloat(ground.price_per_hour).toFixed(2)
      : "0.00";

  const handleConfirm = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    setError("");

    try {
      const bookRes = await fetch(`${BASE_URL}/api/bookings/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ground: ground.id,
          date: selectedDate,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          payment_method: method,
        }),
      });

      const bookData = await bookRes.json();

      if (!bookRes.ok) {
        setError(
          bookData?.non_field_errors?.[0] ||
            bookData?.detail ||
            "Booking failed. Slot may already be taken.",
        );
        return;
      }

      const bookingId = bookData?.booking?.id || bookData?.id;

      if (method === "cash") {
        setResult({
          amount: totalPrice,
          payment_method: "Cash",
          transaction_id: "PENDING_APPROVAL",
        });
        setStep(3);
        return;
      }

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
        setError(payData?.detail || "Payment failed.");
        return;
      }

      setResult(payData);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading ground details...</p>
        </div>
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Ground not found
          </h2>
          <button
            onClick={() => navigate("/grounds")}
            className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition"
          >
            Browse Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground.image
    ? ground.image.startsWith("http")
      ? ground.image
      : `${BASE_URL}${ground.image}`
    : null;

  const openInfo = parseTime(ground.opening_time);
  const closeInfo = parseTime(ground.closing_time);

  if (step === 3 && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 pt-20">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Booking Confirmed!
            </h2>
            <p className="text-green-100 text-sm mt-2">Payment successful</p>
          </div>

          <div className="px-8 py-6 space-y-3">
            {[
              ["Ground", ground.name],
              ["Date", fmtDate(selectedDate)],
              ["Time", selectedSlot?.label],
              ["Payment Method", result.payment_method],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-500 text-sm">{k}</span>
                <span className="text-gray-800 font-semibold text-sm">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 mt-2">
              <span className="text-green-700 font-semibold">Amount Paid</span>
              <span className="text-green-700 font-bold text-xl">
                Rs {result.amount}
              </span>
            </div>
            <div className="text-center mt-1">
              <p className="text-gray-400 text-xs">Transaction ID</p>
              <p className="text-gray-600 font-mono text-sm font-semibold">
                {result.transaction_id}
              </p>
            </div>
          </div>

          <div className="px-8 pb-6 flex gap-3">
            <button
              onClick={() => navigate("/my-bookings")}
              className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition text-sm"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate("/grounds")}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition text-sm"
            >
              More Grounds
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 pt-20 pb-16">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate("/grounds")}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Grounds
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 truncate">{ground.name}</span>
        <span className="text-gray-300">/</span>
        <span className="text-green-600 font-semibold">Book Slot</span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT: Ground Info Card */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-24">
              <div className="w-full h-48 overflow-hidden bg-gray-100">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={ground.name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100"></div>
                )}
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <h2 className="font-bold text-gray-900 text-lg">
                    {ground.name}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {ground.location}
                  </p>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">
                      Price per hour
                    </p>
                    <p className="text-green-600 font-bold text-lg mt-1">
                      Rs {ground.price_per_hour}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Operating Hours
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Opens</p>
                      <p className="text-gray-800 font-semibold">
                        {openInfo?.label}
                      </p>
                    </div>
                    <div className="flex-1 mx-4 h-px bg-gray-200" />
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Closes</p>
                      <p className="text-gray-800 font-semibold">
                        {closeInfo?.label}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-600 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    Available
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-400" />
                    Booked
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-600" />
                    Selected
                  </div>
                </div>

                {ground.facilities && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                      Facilities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ground.facilities.split(",").map((f) => (
                        <span
                          key={f}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200"
                        >
                          {f.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Booking Form */}
          <div className="col-span-12 lg:col-span-8">
            {/* Step Indicator */}
            <div className="flex items-center gap-3 mb-8">
              {[
                { n: 1, label: "Select Slot" },
                { n: 2, label: "Payment" },
                { n: 3, label: "Confirmed" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                            ${
                                              step === s.n
                                                ? "bg-green-500 border-green-500 text-white"
                                                : step > s.n
                                                  ? "bg-green-100 border-green-400 text-green-700"
                                                  : "bg-white border-gray-300 text-gray-400"
                                            }`}
                    >
                      {step > s.n ? "✓" : s.n}
                    </div>
                    <span
                      className={`text-sm font-semibold hidden sm:block
                                            ${step === s.n ? "text-green-600" : step > s.n ? "text-green-500" : "text-gray-400"}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-px flex-1 min-w-8 ${step > s.n ? "bg-green-400" : "bg-gray-300"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* STEP 1: Select date + slot */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Date picker */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-3">
                    <span className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    Select Date
                  </h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="date"
                      min={today()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-3 text-gray-800 font-medium focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-sm"
                    />
                    {selectedDate && (
                      <div className="bg-green-50 border border-green-300 rounded-lg px-4 py-3 text-center flex-shrink-0">
                        <p className="text-green-700 font-semibold text-sm">
                          {fmtDate(selectedDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slot picker */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-bold text-gray-800 flex items-center gap-3">
                      <span className="w-6 h-6 bg-green-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                        2
                      </span>
                      Select Time Slot
                    </h3>
                    <span className="text-xs text-gray-400 font-medium">
                      {slots.length} slots
                    </span>
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-12 gap-2">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-400 text-sm">
                        Checking availability...
                      </span>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-sm">
                        No slots available for this ground.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const booked = isBooked(slot);
                        const selected = selectedSlot?.start === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={booked}
                            onClick={() => !booked && setSelectedSlot(slot)}
                            className={`relative py-4 px-3 rounded-lg border-2 text-center transition-all duration-150 font-semibold text-sm
                                                            ${
                                                              booked
                                                                ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                                                                : selected
                                                                  ? "bg-green-500 border-green-500 text-white shadow-md scale-105"
                                                                  : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-400"
                                                            }`}
                          >
                            {booked && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                Booked
                              </span>
                            )}
                            {selected && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                ✓
                              </span>
                            )}
                            <div className="font-bold">{slot.shortStart}</div>
                            <div className="text-xs opacity-70">to</div>
                            <div className="font-bold">{slot.shortEnd}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Selected summary + continue */}
                {selectedSlot && (
                  <div className="bg-green-50 rounded-2xl border-2 border-green-300 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
                          Selected Slot
                        </p>
                        <p className="text-gray-900 font-bold text-lg">
                          {selectedSlot.label}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {fmtDate(selectedDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-green-600 font-bold text-2xl">
                          Rs {totalPrice}
                        </p>
                        <p className="text-gray-400 text-xs">1 hour</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="w-full py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition text-sm"
                    >
                      Continue to Payment
                    </button>
                  </div>
                )}

                {!selectedSlot && !loadingSlots && slots.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-sm text-blue-700 font-medium">
                    Select a time slot above to proceed
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Payment */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                    <h3 className="font-bold text-gray-800">Booking Summary</h3>
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    {[
                      ["Ground", ground.name],
                      ["Location", ground.location],
                      ["Date", fmtDate(selectedDate)],
                      ["Time", selectedSlot?.label],
                      ["Duration", "1 hour"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="text-gray-500 font-medium">{k}</span>
                        <span className="text-gray-800 font-semibold">{v}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                      <span className="text-gray-700 font-bold">
                        Total Amount
                      </span>
                      <span className="text-green-600 font-bold text-xl">
                        Rs {totalPrice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-5">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        id: "esewa",
                        label: "eSewa",
                        desc: "Digital wallet",
                      },
                      {
                        id: "cash",
                        label: "Cash",
                        desc: "Pay at ground",
                      },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all
                                                    ${
                                                      method === m.id
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-gray-200 bg-white hover:border-gray-300"
                                                    }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {method === m.id && (
                            <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <p
                          className={`font-bold text-sm ${method === m.id ? "text-green-700" : "text-gray-700"}`}
                        >
                          {m.label}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
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
      </div>
    </div>
  );
}
