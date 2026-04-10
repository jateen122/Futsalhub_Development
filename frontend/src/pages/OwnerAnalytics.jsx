// frontend/src/pages/OwnerAnalytics.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock, Zap,
  RefreshCw, Calendar, DollarSign, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtRs = (n) =>
  n >= 100000
    ? `Rs ${(n / 100000).toFixed(1)}L`
    : n >= 1000
    ? `Rs ${(n / 1000).toFixed(1)}k`
    : `Rs ${Math.round(n)}`;

const fmtHour = (h) => {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
};

const startOf = (unit) => {
  const d = new Date();
  if (unit === "day")   { d.setHours(0, 0, 0, 0); }
  if (unit === "week")  { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); }
  if (unit === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); }
  return d;
};

const prevPeriod = (unit) => {
  const now = new Date();
  if (unit === "week") {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() - 7); start.setHours(0,0,0,0);
    const end   = new Date(start); end.setDate(start.getDate() + 7);
    return { start, end };
  }
  if (unit === "month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  return null;
};

const diffPct = (a, b) => {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 100);
};

// ── mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#f59e0b", height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w   = 120;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`0,${height} ${pts} ${w},${height}`}
        fill={color}
        fillOpacity="0.12"
        stroke="none"
      />
    </svg>
  );
}

// ── bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, colorFn, labelKey, valueKey, maxBars = 24 }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-stone-400 text-sm">No data yet</div>
  );
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const shown = data.slice(0, maxBars);
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {shown.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        const col = colorFn ? colorFn(d) : "#f59e0b";
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
            {/* tooltip */}
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
              {d[labelKey]}: {typeof d[valueKey] === "number" && d[valueKey] > 0 ? (
                valueKey === "revenue" ? fmtRs(d[valueKey]) : d[valueKey]
              ) : 0}
            </div>
            <div
              className="w-full rounded-t-lg transition-all duration-700 ease-out"
              style={{
                height: `${Math.max(pct, pct > 0 ? 3 : 0)}%`,
                backgroundColor: col,
                minHeight: d[valueKey] > 0 ? "3px" : "0px",
              }}
            />
            <span className="text-[9px] text-stone-400 font-medium truncate w-full text-center">
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── compare bar ───────────────────────────────────────────────────────────────
function CompareBar({ label, current, previous, unit = "Rs" }) {
  const max   = Math.max(current, previous, 1);
  const pct   = diffPct(current, previous);
  const up    = pct > 0;
  const same  = pct === 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full
            ${same ? "bg-stone-100 text-stone-500" : up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {same ? <Minus size={10} /> : up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(pct)}%
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-amber-600 font-bold w-16">Current</span>
          <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${(current / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-stone-700 w-20 text-right">
            {unit === "Rs" ? fmtRs(current) : current}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-stone-400 font-bold w-16">Previous</span>
          <div className="flex-1 bg-stone-100 rounded-full h-2.5 overflow-hidden">
            <div className="h-full bg-stone-300 rounded-full transition-all duration-700"
              style={{ width: `${(previous / max) * 100}%` }} />
          </div>
          <span className="text-xs font-bold text-stone-400 w-20 text-right">
            {unit === "Rs" ? fmtRs(previous) : previous}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── slot heat cell ────────────────────────────────────────────────────────────
function HeatCell({ count, max, hour, label }) {
  const pct = max > 0 ? count / max : 0;
  const bg  =
    pct === 0 ? "bg-stone-100 text-stone-300"
    : pct < 0.25 ? "bg-amber-100 text-amber-600"
    : pct < 0.6  ? "bg-amber-300 text-amber-800"
    : pct < 0.85 ? "bg-amber-500 text-white"
    :              "bg-amber-600 text-white";
  return (
    <div
      className={`rounded-xl p-2 text-center transition-all duration-500 cursor-default group relative ${bg}`}
      title={`${label}: ${count} booking${count !== 1 ? "s" : ""}`}
    >
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
        {label}: {count}
      </div>
      <p className="text-[10px] font-bold leading-none">{fmtHour(hour).replace(":00", "")}</p>
      <p className="text-[10px] mt-0.5 opacity-75">{count}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function OwnerAnalytics() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings, setBookings] = useState([]);
  const [ground,   setGround]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = async () => {
    if (!token) { navigate("/login"); return; }
    setLoading(true);
    try {
      const [bRes, gRes] = await Promise.all([
        fetch(`${BASE_URL}/api/bookings/owner/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/grounds/my/`,     { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const bData = await bRes.json();
      const gData = await gRes.json();
      setBookings(bData.results || bData || []);
      const grounds = gData.results || gData || [];
      setGround(grounds[0] || null);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── derived analytics ──────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const now       = new Date();

    // Revenue helpers
    const revOf = (list) => list.reduce((s, b) => s + parseFloat(b.total_price || 0), 0);

    const todayStart  = startOf("day");
    const weekStart   = startOf("week");
    const monthStart  = startOf("month");
    const prevWeek    = prevPeriod("week");
    const prevMonth   = prevPeriod("month");

    const inRange = (b, start, end) => {
      const d = new Date(b.date);
      return d >= start && (end ? d < end : true);
    };

    const totalRevenue   = revOf(confirmed);
    const todayRevenue   = revOf(confirmed.filter((b) => inRange(b, todayStart)));
    const weekRevenue    = revOf(confirmed.filter((b) => inRange(b, weekStart)));
    const monthRevenue   = revOf(confirmed.filter((b) => inRange(b, monthStart)));
    const prevWeekRev    = prevWeek  ? revOf(confirmed.filter((b) => inRange(b, prevWeek.start,  prevWeek.end)))  : 0;
    const prevMonthRev   = prevMonth ? revOf(confirmed.filter((b) => inRange(b, prevMonth.start, prevMonth.end))) : 0;

    const prevWeekCount  = prevWeek  ? confirmed.filter((b) => inRange(b, prevWeek.start,  prevWeek.end)).length  : 0;
    const prevMonthCount = prevMonth ? confirmed.filter((b) => inRange(b, prevMonth.start, prevMonth.end)).length  : 0;
    const weekCount      = confirmed.filter((b) => inRange(b, weekStart)).length;
    const monthCount     = confirmed.filter((b) => inRange(b, monthStart)).length;

    // Hourly heatmap (all confirmed)
    const hourMap = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    confirmed.forEach((b) => {
      if (!b.start_time) return;
      const h = parseInt(b.start_time.split(":")[0], 10);
      if (h >= 0 && h < 24) hourMap[h]++;
    });
    const hourData = Object.entries(hourMap)
      .map(([h, count]) => ({ hour: parseInt(h), label: fmtHour(parseInt(h)), count }))
      .filter((d) => d.hour >= 5 && d.hour <= 23); // show 5 AM – 11 PM

    const maxHour   = Math.max(...hourData.map((d) => d.count), 1);
    const sortedAsc = [...hourData].sort((a, b) => a.count - b.count);
    const top5      = [...hourData].sort((a, b) => b.count - a.count).slice(0, 5);
    const bottom5   = sortedAsc.filter((d) => d.count > 0).slice(0, 5);

    // Daily revenue for the last 30 days
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const rev = revOf(confirmed.filter((b) => b.date === key));
      last30.push({ label: d.getDate().toString(), fullDate: key, revenue: rev });
    }

    // Weekly revenue for last 12 weeks
    const last12w = [];
    for (let i = 11; i >= 0; i--) {
      const wStart = new Date(now);
      wStart.setDate(wStart.getDate() - wStart.getDay() - i * 7);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);
      const rev = revOf(confirmed.filter((b) => inRange(b, wStart, wEnd)));
      const label = `W${12 - i}`;
      last12w.push({ label, revenue: rev });
    }

    // Peak vs off-peak (uses ground rules if available)
    const peakRules    = (ground?.peak_pricing_rules || []).filter(
      (r) => r.is_active && r.rule_type !== "off_peak"
    );
    const offPeakRules = (ground?.peak_pricing_rules || []).filter(
      (r) => r.is_active && r.rule_type === "off_peak"
    );

    const classify = (b) => {
      if (!b.start_time) return "standard";
      const h = parseInt(b.start_time.split(":")[0], 10);
      for (const rule of peakRules) {
        if (rule.start_hour <= h && h < rule.end_hour) return "peak";
      }
      for (const rule of offPeakRules) {
        if (rule.start_hour <= h && h < rule.end_hour) return "off_peak";
      }
      return "standard";
    };

    const peakB     = confirmed.filter((b) => classify(b) === "peak");
    const offPeakB  = confirmed.filter((b) => classify(b) === "off_peak");
    const standardB = confirmed.filter((b) => classify(b) === "standard");

    return {
      totalRevenue, todayRevenue, weekRevenue, monthRevenue,
      prevWeekRev, prevMonthRev,
      weekCount, monthCount, prevWeekCount, prevMonthCount,
      hourData, maxHour, top5, bottom5,
      last30, last12w,
      peakRevenue:     revOf(peakB),
      offPeakRevenue:  revOf(offPeakB),
      standardRevenue: revOf(standardB),
      peakCount:       peakB.length,
      offPeakCount:    offPeakB.length,
      standardCount:   standardB.length,
      totalConfirmed:  confirmed.length,
    };
  }, [bookings, ground]);

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-amber-900/40" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <BarChart2 size={20} className="absolute inset-0 m-auto text-amber-400" />
          </div>
          <p className="text-stone-400 text-sm tracking-widest uppercase">Loading Analytics</p>
        </div>
      </div>
    );
  }

  const { totalRevenue, todayRevenue, weekRevenue, monthRevenue,
    prevWeekRev, prevMonthRev, weekCount, monthCount, prevWeekCount, prevMonthCount,
    hourData, maxHour, top5, bottom5, last30, last12w,
    peakRevenue, offPeakRevenue, standardRevenue, peakCount, offPeakCount, standardCount,
    totalConfirmed } = analytics;

  const overviewCards = [
    {
      label:    "All-Time Revenue",
      value:    fmtRs(totalRevenue),
      rawValue: totalRevenue,
      icon:     <DollarSign size={18} />,
      spark:    last12w.map((d) => d.revenue),
      sparkColor: "#f59e0b",
      sub:      `${totalConfirmed} confirmed bookings`,
    },
    {
      label:    "Today",
      value:    fmtRs(todayRevenue),
      rawValue: todayRevenue,
      icon:     <Calendar size={18} />,
      spark:    last30.slice(-7).map((d) => d.revenue),
      sparkColor: "#22c55e",
      sub:      "Revenue so far today",
    },
    {
      label:    "This Week",
      value:    fmtRs(weekRevenue),
      rawValue: weekRevenue,
      icon:     <Activity size={18} />,
      spark:    last30.slice(-14).map((d) => d.revenue),
      sparkColor: "#3b82f6",
      sub:      `${weekCount} bookings this week`,
    },
    {
      label:    "This Month",
      value:    fmtRs(monthRevenue),
      rawValue: monthRevenue,
      icon:     <TrendingUp size={18} />,
      spark:    last30.map((d) => d.revenue),
      sparkColor: "#a855f7",
      sub:      `${monthCount} bookings this month`,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-950 pt-20 pb-16">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-orange-500/3 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <button
              onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-300 text-sm mb-4 transition"
            >
              <ArrowLeft size={16} /> Dashboard
            </button>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                Owner Analytics
              </span>
            </div>
            <h1 className="text-4xl font-black text-white leading-none tracking-tight">
              Revenue & Insights
            </h1>
            {ground && (
              <p className="text-stone-400 text-sm mt-2">{ground.name} · {ground.location}</p>
            )}
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800/60 border border-stone-700/50 text-stone-400 hover:text-white rounded-xl text-sm transition hover:bg-stone-700/60"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — REVENUE OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <DollarSign size={16} className="text-amber-400" />
            <h2 className="text-white font-bold text-lg">Revenue Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card, i) => (
              <div
                key={card.label}
                className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-5 hover:border-stone-700/60 transition-all duration-300 group"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${card.sparkColor}18`, color: card.sparkColor }}
                  >
                    {card.icon}
                  </div>
                  <Sparkline data={card.spark} color={card.sparkColor} />
                </div>
                <p className="text-2xl font-black text-white mt-1 tracking-tight">
                  {card.value}
                </p>
                <p className="text-stone-400 text-xs mt-1 font-medium">{card.label}</p>
                <p className="text-stone-600 text-[10px] mt-1">{card.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — PEAK VS OFF-PEAK ANALYSIS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <Zap size={16} className="text-amber-400" />
            <h2 className="text-white font-bold text-lg">Peak vs Off-Peak Analysis</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">

            {/* Left: booking type breakdown */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <h3 className="text-stone-300 font-semibold text-sm mb-5">Revenue Breakdown by Slot Type</h3>

              {totalConfirmed === 0 ? (
                <div className="flex items-center justify-center h-32 text-stone-500 text-sm">
                  No confirmed bookings yet
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "🔥 Peak Hours",    count: peakCount,     rev: peakRevenue,     color: "#f59e0b", bg: "bg-amber-400" },
                    { label: "💰 Off-Peak Hours", count: offPeakCount,  rev: offPeakRevenue,  color: "#3b82f6", bg: "bg-blue-400" },
                    { label: "📋 Standard Hours", count: standardCount, rev: standardRevenue, color: "#6b7280", bg: "bg-stone-400" },
                  ].map((item) => {
                    const total    = totalRevenue || 1;
                    const pctRev   = Math.round((item.rev   / total)         * 100);
                    const pctCount = Math.round((item.count / (totalConfirmed || 1)) * 100);
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-stone-300">{item.label}</span>
                            <span className="text-xs text-stone-500">{item.count} bookings</span>
                          </div>
                          <span className="text-sm font-black" style={{ color: item.color }}>
                            {fmtRs(item.rev)}
                            <span className="text-[10px] text-stone-500 ml-1">({pctRev}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700`}
                            style={{ width: `${pctCount}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {ground?.peak_pricing_rules?.length === 0 && (
                <div className="mt-4 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
                  <p className="text-amber-400 text-xs">
                    💡 Add peak & off-peak pricing rules to see deeper slot-type analysis.
                  </p>
                </div>
              )}
            </div>

            {/* Right: hourly heatmap */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-stone-300 font-semibold text-sm">Booking Activity by Hour</h3>
                <div className="flex items-center gap-3 text-[10px] text-stone-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-stone-800 rounded-sm inline-block" />None</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-100 rounded-sm inline-block" />Low</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm inline-block" />High</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-600 rounded-sm inline-block" />Peak</span>
                </div>
              </div>

              {totalConfirmed === 0 ? (
                <div className="flex items-center justify-center h-32 text-stone-500 text-sm">No data yet</div>
              ) : (
                <div className="grid grid-cols-6 gap-1.5">
                  {hourData.map((d) => (
                    <HeatCell
                      key={d.hour}
                      hour={d.hour}
                      count={d.count}
                      max={maxHour}
                      label={d.label}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Most / Least booked */}
          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            {/* Most booked */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-amber-400" />
                <h3 className="text-stone-300 font-semibold text-sm">Most Booked Time Slots</h3>
              </div>
              {top5.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-6">No bookings yet</p>
              ) : (
                <div className="space-y-2.5">
                  {top5.map((d, i) => (
                    <div key={d.hour} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0
                        ${i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-amber-300/70 text-amber-900" : "bg-stone-700 text-stone-300"}`}>
                        {i + 1}
                      </span>
                      <span className="text-stone-300 text-sm font-medium flex-1">{d.label}</span>
                      <div className="flex-1 bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${(d.count / (top5[0]?.count || 1)) * 100}%` }} />
                      </div>
                      <span className="text-amber-400 font-black text-sm w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Least booked */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={15} className="text-blue-400" />
                <h3 className="text-stone-300 font-semibold text-sm">Least Booked Time Slots</h3>
              </div>
              {bottom5.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-6">
                  {totalConfirmed === 0 ? "No bookings yet" : "All slots have bookings!"}
                </p>
              ) : (
                <div className="space-y-2.5">
                  {bottom5.map((d, i) => (
                    <div key={d.hour} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-stone-700 flex items-center justify-center text-xs font-black text-stone-400 flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-stone-300 text-sm font-medium flex-1">{d.label}</span>
                      <div className="flex-1 bg-stone-800 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${(d.count / (maxHour || 1)) * 100}%` }} />
                      </div>
                      <span className="text-blue-400 font-black text-sm w-8 text-right">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
              {bottom5.length > 0 && (
                <div className="mt-4 bg-blue-900/20 border border-blue-700/30 rounded-xl p-3">
                  <p className="text-blue-400 text-xs">
                    💡 Consider adding off-peak discounts for {bottom5[0]?.label} to attract more bookings.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — REVENUE TRENDS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <Clock size={16} className="text-amber-400" />
            <h2 className="text-white font-bold text-lg">Revenue Trends</h2>
          </div>

          {/* Daily chart — last 30 days */}
          <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6 mb-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-stone-300 font-semibold text-sm">Daily Revenue — Last 30 Days</h3>
                <p className="text-stone-500 text-xs mt-0.5">Each bar = one day</p>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-black text-lg">{fmtRs(monthRevenue)}</p>
                <p className="text-stone-500 text-xs">This month</p>
              </div>
            </div>
            <BarChart
              data={last30}
              labelKey="label"
              valueKey="revenue"
              colorFn={(d) => {
                const rev = d.revenue;
                if (rev === 0) return "#292524";
                const maxRev = Math.max(...last30.map((x) => x.revenue), 1);
                const pct    = rev / maxRev;
                return pct > 0.7 ? "#f59e0b" : pct > 0.3 ? "#fbbf24" : "#fcd34d";
              }}
            />
          </div>

          {/* Weekly chart */}
          <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6 mb-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-stone-300 font-semibold text-sm">Weekly Revenue — Last 12 Weeks</h3>
                <p className="text-stone-500 text-xs mt-0.5">Each bar = one week</p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 font-black text-lg">{fmtRs(weekRevenue)}</p>
                <p className="text-stone-500 text-xs">This week</p>
              </div>
            </div>
            <BarChart
              data={last12w}
              labelKey="label"
              valueKey="revenue"
              colorFn={(d, i) => {
                const maxRev = Math.max(...last12w.map((x) => x.revenue), 1);
                const pct    = d.revenue / maxRev;
                return pct > 0.7 ? "#3b82f6" : pct > 0.3 ? "#60a5fa" : "#93c5fd";
              }}
            />
          </div>

          {/* Comparison cards */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Week comparison */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Activity size={15} className="text-amber-400" />
                <h3 className="text-stone-300 font-semibold text-sm">This Week vs Last Week</h3>
              </div>
              <div className="space-y-5">
                <CompareBar
                  label="Revenue"
                  current={weekRevenue}
                  previous={prevWeekRev}
                  unit="Rs"
                />
                <CompareBar
                  label="Bookings"
                  current={weekCount}
                  previous={prevWeekCount}
                  unit="count"
                />
              </div>
              <div className={`mt-5 rounded-xl p-3 text-center text-xs font-semibold
                ${weekRevenue >= prevWeekRev
                  ? "bg-green-900/30 border border-green-700/30 text-green-400"
                  : "bg-red-900/30 border border-red-700/30 text-red-400"}`}>
                {weekRevenue >= prevWeekRev
                  ? `▲ Revenue up ${Math.abs(diffPct(weekRevenue, prevWeekRev))}% from last week`
                  : `▼ Revenue down ${Math.abs(diffPct(weekRevenue, prevWeekRev))}% from last week`}
              </div>
            </div>

            {/* Month comparison */}
            <div className="bg-stone-900/70 border border-stone-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={15} className="text-amber-400" />
                <h3 className="text-stone-300 font-semibold text-sm">This Month vs Last Month</h3>
              </div>
              <div className="space-y-5">
                <CompareBar
                  label="Revenue"
                  current={monthRevenue}
                  previous={prevMonthRev}
                  unit="Rs"
                />
                <CompareBar
                  label="Bookings"
                  current={monthCount}
                  previous={prevMonthCount}
                  unit="count"
                />
              </div>
              <div className={`mt-5 rounded-xl p-3 text-center text-xs font-semibold
                ${monthRevenue >= prevMonthRev
                  ? "bg-green-900/30 border border-green-700/30 text-green-400"
                  : "bg-red-900/30 border border-red-700/30 text-red-400"}`}>
                {monthRevenue >= prevMonthRev
                  ? `▲ Revenue up ${Math.abs(diffPct(monthRevenue, prevMonthRev))}% from last month`
                  : `▼ Revenue down ${Math.abs(diffPct(monthRevenue, prevMonthRev))}% from last month`}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-stone-700 text-xs pb-4">
          Last refreshed: {lastRefresh.toLocaleTimeString()} · Data from confirmed bookings only
        </p>
      </div>
    </div>
  );
}
