// frontend/src/pages/BookingPage.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  MapPin,
  Calendar,
  IndianRupee,
  Gift,
  ChevronRight,
  Tag,
  AlertCircle,
  Ban,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const parseTime = (t) => {
  if (!t) return null;
  const h24 = parseInt(t.split(":")[0], 10);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { h24, h12, ampm, label: `${h12} ${ampm}` };
};

const today = () => new Date().toISOString().split("T")[0];

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const isSlotTooSoon = (slotDate, slotStartHour) => {
  const now = new Date();
  const todayStr = today();
  if (slotDate !== todayStr) return false;
  const slotTime = new Date();
  slotTime.setHours(slotStartHour, 0, 0, 0);
  const cutoff = new Date(now.getTime() + 30 * 60 * 1000);
  return slotTime <= cutoff;
};

const isSlotInPast = (slotDate, slotStartHour) => {
  const now = new Date();
  const todayStr = today();
  if (slotDate !== todayStr) return false;
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  return (
    currentHour > slotStartHour ||
    (currentHour === slotStartHour && currentMin > 0)
  );
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
      startHour: h,
      label: `${startH12}:00 ${startAmpm} – ${endH12}:00 ${endAmpm}`,
      shortStart: `${startH12} ${startAmpm}`,
      shortEnd: `${endH12} ${endAmpm}`,
    });
  }
  return slots;
};

function LoyaltyPanel({ groundId, useFree, onFreeToggle }) {
  const token = localStorage.getItem("access");
  const [loyalty, setLoyalty] = useState(null);

  useEffect(() => {
    if (!groundId || !token) return;
    fetch(`${BASE_URL}/api/bookings/loyalty/${groundId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLoyalty(d))
      .catch(() => {});
  }, [groundId]);

  if (!loyalty) return null;

  const {
    confirmed_count,
    bookings_until_next_free,
    free_bookings_available,
    loyalty_threshold,
    progress_to_next_free,
  } = loyalty;
  const hasFree = free_bookings_available > 0;

  return (
    <div
      className={`rounded-3xl border-2 p-6 transition-all duration-300
      ${hasFree ? "bg-amber-50 border-amber-300 shadow-md" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center
            ${hasFree ? "bg-amber-500" : "bg-gray-100"}`}
          >
            <Gift size={18} className={hasFree ? "text-white" : "text-gray-500"} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">LOYALTY REWARD</p>
            <p className="text-base font-bold text-gray-900">Book 5, Get 1 Free</p>
          </div>
        </div>
        {confirmed_count > 0 && (
          <span className="text-xs font-black bg-gray-100 text-gray-600 px-3 py-1 rounded-2xl">
            {confirmed_count} booked
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress to next free booking</span>
          <span className="font-bold">{Math.round(progress_to_next_free)}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${hasFree ? "bg-amber-500" : "bg-green-500"}`}
            style={{ width: `${progress_to_next_free}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        {hasFree
          ? `You have ${free_bookings_available} free booking${free_bookings_available > 1 ? "s" : ""} available!`
          : `${bookings_until_next_free} more booking${bookings_until_next_free !== 1 ? "s" : ""} until your next free slot`}
      </p>

      {hasFree && (
        <button
          onClick={() => onFreeToggle(!useFree)}
          className={`w-full mt-5 py-3.5 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2
            ${useFree
              ? "bg-amber-500 text-white shadow-md"
              : "bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200"}`}
        >
          <Gift size={18} />
          {useFree ? "✓ Using Free Booking" : "Use Free Booking"}
        </button>
      )}
    </div>
  );
}

function ReschedulingTokenPanel({ groundId, activeToken, onTokenApply, onTokenRemove }) {
  const token = localStorage.getItem("access");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/bookings/tokens/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const valid = (d.tokens || []).filter(
          (t) => t.is_valid && String(t.original_ground) === String(groundId),
        );
        setTokens(valid);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groundId]);

  if (loading || tokens.length === 0) return null;

  return (
    <div
      className={`rounded-3xl border-2 p-6 transition-all duration-300
      ${activeToken ? "bg-blue-50 border-blue-400 shadow-md" : "bg-white border-blue-200"}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-blue-500 rounded-2xl flex items-center justify-center">
          <Tag size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">RESCHEDULING TOKEN</p>
          <p className="text-base font-bold text-gray-900">
            {tokens.length} token{tokens.length > 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {activeToken ? (
        <div className="bg-blue-100 border border-blue-300 rounded-2xl p-4 mb-4">
          <p className="text-blue-800 font-semibold text-sm">
            ✓ Token applied — Rs {activeToken.original_price} credit
          </p>
          <p className="text-blue-600 text-xs mt-1">From {activeToken.original_date}</p>
          <button
            onClick={onTokenRemove}
            className="w-full mt-4 py-3 text-sm font-semibold border border-blue-300 text-blue-700 rounded-2xl hover:bg-blue-50 transition"
          >
            Remove Token
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowList(!showList)}
          className="w-full py-3 bg-blue-100 text-blue-700 font-semibold text-base rounded-2xl hover:bg-blue-200 transition border border-blue-300"
        >
          {showList ? "Hide Tokens ▲" : `Apply Rescheduling Token (${tokens.length}) ▼`}
        </button>
      )}

      {showList && (
        <div className="mt-4 space-y-3">
          {tokens.map((t) => (
            <button
              key={t.token}
              onClick={() => {
                onTokenApply(t);
                setShowList(false);
              }}
              className="w-full text-left p-4 bg-white border border-blue-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <p className="text-base font-semibold text-gray-900">Rs {t.original_price} credit</p>
              <p className="text-xs text-gray-500 mt-1">
                From {t.original_date} • Expires in {t.days_until_expiry} day
                {t.days_until_expiry !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [ground, setGround] = useState(null);
  const [loadingGround, setLoadingGround] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [method, setMethod] = useState("khalti");
  const [useFree, setUseFree] = useState(false);
  const [activeToken, setActiveToken] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotPrices, setSlotPrices] = useState({});
  const [blockedInfo, setBlockedInfo] = useState({
    full_day: false,
    block_reason: "",
    blocked_hours: [],
  });
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

    Promise.all([
      fetch(
        `${BASE_URL}/api/bookings/ground/${ground.id}/booked-slots/?date=${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ).then((r) => (r.ok ? r.json() : { booked_slots: [] })),
      fetch(
        `${BASE_URL}/api/grounds/${ground.id}/blocked-slots/?date=${selectedDate}`,
      ).then((r) =>
        r.ok
          ? r.json()
          : { full_day: false, block_reason: "", blocked_hours: [] },
      ),
    ])
      .then(([bookedData, blockedData]) => {
        const normalised = (bookedData.booked_slots || []).map((b) => ({
          start: b.start.slice(0, 5),
          end: b.end.slice(0, 5),
        }));
        setBookedSlots(normalised);
        setBlockedInfo({
          full_day: blockedData.full_day || false,
          block_reason: blockedData.block_reason || "",
          blocked_hours: blockedData.blocked_hours || [],
        });
      })
      .catch(() => {
        setBookedSlots([]);
        setBlockedInfo({
          full_day: false,
          block_reason: "",
          blocked_hours: [],
        });
      })
      .finally(() => setLoadingSlots(false));
  }, [ground, selectedDate]);

  useEffect(() => {
    if (!ground || !selectedDate) return;
    const open = parseInt((ground.opening_time || "00:00").split(":")[0], 10);
    const close = parseInt((ground.closing_time || "00:00").split(":")[0], 10);
    const fetches = [];
    for (let h = open; h < close; h++) {
      fetches.push(
        fetch(
          `${BASE_URL}/api/grounds/${ground.id}/slot-price/?date=${selectedDate}&hour=${h}`,
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d ? [h, d] : null))
          .catch(() => null),
      );
    }
    Promise.all(fetches).then((results) => {
      const priceMap = {};
      results.forEach((r) => {
        if (r) priceMap[r[0]] = r[1];
      });
      setSlotPrices(priceMap);
    });
  }, [ground, selectedDate]);

  const slots = ground
    ? buildSlots(ground.opening_time, ground.closing_time)
    : [];

  const isBooked = (slot) =>
    bookedSlots.some((b) => b.start < slot.end && b.end > slot.start);

  const isBlocked = (slot) => {
    if (blockedInfo.full_day)
      return { blocked: true, reason: blockedInfo.block_reason };
    const match = blockedInfo.blocked_hours.find(
      (bh) => bh.hour === slot.startHour,
    );
    if (match) return { blocked: true, reason: match.reason };
    return { blocked: false, reason: "" };
  };

  const getSlotPrice = useCallback(
    (slot) => {
      if (!slot) return null;
      const priceData = slotPrices[slot.startHour];
      if (priceData) return parseFloat(priceData.effective_price);
      return ground ? parseFloat(ground.price_per_hour) : 0;
    },
    [slotPrices, ground],
  );

  const getSlotPriceInfo = useCallback(
    (slot) => {
      const priceData = slotPrices[slot.startHour];
      if (!priceData)
        return {
          effectivePrice: ground ? parseFloat(ground.price_per_hour) : 0,
          isPeak: false,
          isOffPeak: false,
          label: null,
        };
      return {
        effectivePrice: parseFloat(priceData.effective_price),
        isPeak: priceData.is_peak,
        isOffPeak: priceData.is_off_peak || false,
        label:
          priceData.peak_rule?.label || priceData.off_peak_rule?.label || null,
      };
    },
    [slotPrices, ground],
  );

  const effectiveSlotPrice = selectedSlot ? getSlotPrice(selectedSlot) : 0;
  const totalPrice =
    useFree || activeToken ? "0.00" : effectiveSlotPrice.toFixed(2);

  const handleConfirm = async () => {
    if (!selectedSlot || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      if (useFree || activeToken) {
        const body = {
          ground: ground.id,
          date: selectedDate,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          is_free_booking: true,
        };
        if (activeToken) body.rescheduling_token = activeToken.token;

        const bookRes = await fetch(`${BASE_URL}/api/bookings/create/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const bookData = await bookRes.json();
        if (!bookRes.ok) {
          setError(
            bookData?.non_field_errors?.[0] ||
              bookData?.detail ||
              "Booking failed.",
          );
          setSubmitting(false);
          return;
        }
        sessionStorage.setItem("newBookingCreated", "true");
        navigate("/my-bookings");
        return;
      }

      if (method === "cash") {
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
            is_free_booking: false,
          }),
        });
        const bookData = await bookRes.json();
        if (!bookRes.ok) {
          setError(
            bookData?.non_field_errors?.[0] ||
              bookData?.detail ||
              "Booking failed.",
          );
          setSubmitting(false);
          return;
        }
        const bookingId = bookData?.booking?.id || bookData?.id;
        const payRes = await fetch(`${BASE_URL}/api/payments/simulate/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            booking_id: bookingId,
            payment_method: "cash",
          }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) {
          setError(payData?.detail || "Cash payment failed.");
          setSubmitting(false);
          return;
        }
        sessionStorage.setItem("newBookingCreated", "true");
        navigate("/my-bookings");
        return;
      }

      // Khalti
      const payRes = await fetch(`${BASE_URL}/api/payments/initiate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ground_id: ground.id,
          date: selectedDate,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          return_url: `${window.location.origin}/payment/verify`,
          website_url: window.location.origin,
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setError(payData?.detail || "Khalti initiation failed.");
        setSubmitting(false);
        return;
      }
      sessionStorage.setItem("newBookingCreated", "true");
      window.location.href = payData.payment_url;
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loadingGround) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Ground not found</h2>
          <button
            onClick={() => navigate("/grounds")}
            className="px-8 py-3 bg-yellow-500 text-white font-semibold rounded-2xl hover:bg-yellow-600 transition"
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
  const hasPeakRules =
    (ground.peak_pricing_rules || []).filter((r) => r.is_active).length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 pb-16">
      {/* Top Bar - Full width */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate("/grounds")}
            className="text-gray-500 hover:text-gray-800 transition font-medium"
          >
            Grounds
          </button>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-gray-600 truncate">{ground.name}</span>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-amber-600 font-semibold">Book Slot</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT: Ground Info Panel - Full height usage */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-28">
              {/* Image */}
              <div className="relative h-64 bg-gray-100">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={ground.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-amber-100 to-yellow-100">
                    ⚽
                  </div>
                )}
              </div>

              <div className="p-6">
                <h2 className="font-bold text-2xl text-gray-900">{ground.name}</h2>
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin size={16} />
                  <span>{ground.location}</span>
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-gray-400 text-sm">Rs</span>
                  <span className="text-3xl font-bold text-yellow-500">
                    {ground.price_per_hour}
                  </span>
                  <span className="text-gray-400 text-sm">/hr base</span>
                </div>

                {hasPeakRules && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-xs font-medium text-amber-700 flex items-center gap-2">
                    <Tag size={14} />
                    Dynamic pricing active — rates may vary
                  </div>
                )}

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex justify-between text-sm">
                  <div>
                    <p className="text-xs text-gray-400">OPENS</p>
                    <p className="font-semibold">{openInfo?.label}</p>
                  </div>
                  <div className="text-gray-300">—</div>
                  <div>
                    <p className="text-xs text-gray-400">CLOSES</p>
                    <p className="font-semibold">{closeInfo?.label}</p>
                  </div>
                </div>
              </div>

              {/* Loyalty & Token */}
              <div className="px-6 pb-6 space-y-4">
                <ReschedulingTokenPanel
                  groundId={ground.id}
                  activeToken={activeToken}
                  onTokenApply={(t) => {
                    setActiveToken(t);
                    setUseFree(false);
                    setMethod("free");
                  }}
                  onTokenRemove={() => {
                    setActiveToken(null);
                    setMethod("khalti");
                  }}
                />
                {!activeToken && (
                  <LoyaltyPanel
                    groundId={ground.id}
                    useFree={useFree}
                    onFreeToggle={(val) => {
                      setUseFree(val);
                      setMethod(val ? "free" : "khalti");
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Booking Flow - Full remaining space */}
          <div className="col-span-12 lg:col-span-8">
            {/* Step Indicator */}
            <div className="flex items-center gap-3 mb-8">
              {[
                { n: 1, label: "Select Slot" },
                { n: 2, label: "Payment" },
              ].map((s, i) => (
                <div key={s.n} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-base border-2 transition-all
                    ${
                      step === s.n
                        ? "bg-yellow-500 border-yellow-500 text-white"
                        : step > s.n
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {step > s.n ? "✓" : s.n}
                  </div>
                  <span
                    className={`ml-3 text-base font-semibold ${step === s.n ? "text-gray-900" : "text-gray-400"}`}
                  >
                    {s.label}
                  </span>
                  {i === 0 && (
                    <div className={`flex-1 h-px mx-4 ${step > 1 ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 flex items-center justify-between">
                <span>⚠ {error}</span>
                <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
                  ✕
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                {/* Date Picker */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={20} className="text-yellow-500" />
                    <h3 className="font-bold text-xl">Select Date</h3>
                  </div>
                  <input
                    type="date"
                    min={today()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-lg focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {blockedInfo.full_day && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 flex gap-4">
                    <Ban size={28} className="text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-red-800">Ground is fully blocked on this date</p>
                      <p className="text-red-700 text-sm mt-1">
                        {blockedInfo.block_reason || "The owner has closed this ground."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Slot Picker */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <Clock size={20} className="text-yellow-500" />
                      <h3 className="font-bold text-xl">Select Time Slot</h3>
                    </div>
                  </div>

                  {loadingSlots ? (
                    <div className="py-16 flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-gray-500">Checking availability…</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const booked = isBooked(slot);
                        const past = isSlotInPast(selectedDate, slot.startHour);
                        const tooSoon = !past && isSlotTooSoon(selectedDate, slot.startHour);
                        const blockInfo = isBlocked(slot);
                        const blocked = blockInfo.blocked;
                        const disabled = booked || past || tooSoon || blocked || blockedInfo.full_day;
                        const selected = selectedSlot?.start === slot.start;
                        const priceInfo = getSlotPriceInfo(slot);

                        let btnClass = "";
                        let badge = null;

                        if (past) {
                          btnClass = "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed";
                          badge = "Past";
                        } else if (tooSoon) {
                          btnClass = "bg-orange-50 border-orange-200 text-orange-300 cursor-not-allowed";
                          badge = "Too Soon";
                        } else if (blocked || blockedInfo.full_day) {
                          btnClass = "bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed";
                          badge = "Blocked";
                        } else if (booked) {
                          btnClass = "bg-red-50 border-red-200 text-red-400 cursor-not-allowed";
                          badge = "Booked";
                        } else if (selected) {
                          btnClass = "bg-green-500 border-green-500 text-white shadow-md";
                          badge = "✓ Selected";
                        } else if (priceInfo.isPeak) {
                          btnClass = "bg-amber-50 border-amber-300 hover:bg-amber-100";
                          badge = "Peak";
                        } else if (priceInfo.isOffPeak) {
                          btnClass = "bg-blue-50 border-blue-300 hover:bg-blue-100";
                          badge = "Off-Peak";
                        } else {
                          btnClass = "bg-white border-gray-200 hover:border-yellow-400";
                        }

                        return (
                          <button
                            key={slot.start}
                            disabled={disabled}
                            onClick={() => !disabled && setSelectedSlot(slot)}
                            className={`relative py-6 px-4 rounded-3xl border-2 text-center font-semibold transition-all ${btnClass}`}
                          >
                            {badge && (
                              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-3 py-0.5 rounded-full">
                                {badge}
                              </span>
                            )}
                            <div className="font-bold text-xl">{slot.shortStart}</div>
                            <div className="text-xs text-gray-400 my-1">to</div>
                            <div className="font-bold text-xl">{slot.shortEnd}</div>
                            {!past && !tooSoon && !booked && !blocked && !blockedInfo.full_day && (
                              <div className="text-xs font-bold mt-3 text-gray-600">
                                Rs {priceInfo.effectivePrice}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedSlot && (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-bold text-xl">{selectedSlot.label}</p>
                        <p className="text-gray-500">{fmtDate(selectedDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Total</p>
                        {useFree || activeToken ? (
                          <p className="text-3xl font-black text-amber-500">FREE</p>
                        ) : (
                          <p className="text-3xl font-black text-yellow-500">
                            Rs {totalPrice}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="w-full mt-6 py-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-2xl text-base transition"
                    >
                      Continue to Payment →
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-bold text-xl mb-6">Booking Summary</h3>
                  <div className="space-y-4">
                    {[
                      ["Ground", ground.name],
                      ["Date", fmtDate(selectedDate)],
                      ["Time", selectedSlot?.label],
                      ["Duration", "1 hour"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t flex justify-between items-baseline">
                    <span className="font-bold text-lg">Total</span>
                    {useFree || activeToken ? (
                      <span className="text-3xl font-black text-amber-500">FREE</span>
                    ) : (
                      <span className="text-3xl font-black text-yellow-500">Rs {totalPrice}</span>
                    )}
                  </div>
                </div>

                {!(useFree || activeToken) && (
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-xl mb-6">Payment Method</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setMethod("khalti")}
                        className={`p-5 rounded-3xl border-2 text-left transition-all ${
                          method === "khalti" ? "border-yellow-500 bg-yellow-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-lg">🟣 Khalti</p>
                        <p className="text-xs text-gray-500 mt-1">Digital wallet</p>
                      </button>
                      <button
                        onClick={() => setMethod("cash")}
                        className={`p-5 rounded-3xl border-2 text-left transition-all ${
                          method === "cash" ? "border-yellow-500 bg-yellow-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-semibold text-lg">💵 Cash on Ground</p>
                        <p className="text-xs text-gray-500 mt-1">Pay when you arrive</p>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 border border-gray-200 font-semibold rounded-3xl hover:bg-gray-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting}
                    className={`flex-1 py-4 font-semibold rounded-3xl text-base transition ${
                      activeToken
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : useFree
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : method === "khalti"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {submitting
                      ? "Processing..."
                      : activeToken
                        ? "Confirm Rescheduled Booking"
                        : useFree
                          ? "Confirm Free Booking"
                          : method === "khalti"
                            ? `Pay Rs ${totalPrice} via Khalti`
                            : `Confirm Cash Booking`}
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