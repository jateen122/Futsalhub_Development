// frontend/src/pages/OwnerAnalytics.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, TrendingUp, TrendingDown, Clock,
  RefreshCw, Calendar, DollarSign, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, Minus, MapPin,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const fmtRs = (n) => {
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `Rs ${(n / 1000).toFixed(1)}k`;
  return `Rs ${Math.round(n).toLocaleString()}`;
};

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

function BarChart({ data, labelKey, valueKey, colorFn, maxBars = 30 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        No data yet
      </div>
    );
  }
  const max   = Math.max(...data.map((d) => d[valueKey]), 1);
  const shown = data.slice(0, maxBars);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {shown.map((d, i) => {
        const pct = (d[valueKey] / max) * 100;
        const col = colorFn ? colorFn(d, i) : "#10b981";
        return (
          <div key={i} className="flex flex-col items-center flex-1 gap-1 group relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity shadow-lg">
              {d[labelKey]}: {d[valueKey] > 0 ? (valueKey === "revenue" ? fmtRs(d[valueKey]) : d[valueKey]) : 0}
            </div>
            <div className="w-full rounded-t-md transition-all duration-700 ease-out"
              style={{ height: `${Math.max(pct, d[valueKey] > 0 ? 4 : 0)}%`, backgroundColor: col, minHeight: d[valueKey] > 0 ? "4px" : "0px" }} />
            <span className="text-[9px] text-gray-400 font-medium truncate w-full text-center leading-none">
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HeatCell({ count, max, hour, label }) {
  const pct = max > 0 ? count / max : 0;
  let bg, text;
  if (pct === 0)       { bg = "bg-gray-100";         text = "text-gray-400"; }
  else if (pct < 0.25) { bg = "bg-emerald-100";       text = "text-emerald-600"; }
  else if (pct < 0.55) { bg = "bg-emerald-300";       text = "text-emerald-900"; }
  else if (pct < 0.80) { bg = "bg-emerald-500";       text = "text-white"; }
  else                 { bg = "bg-emerald-700";        text = "text-white"; }

  return (
    <div className={`rounded-xl p-2 text-center cursor-default group relative ${bg} border border-white/60`}
      title={`${label}: ${count} booking${count !== 1 ? "s" : ""}`}>
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 shadow-lg transition-opacity">
        {label}: {count}
      </div>
      <p className={`text-[10px] font-bold leading-none ${text}`}>{fmtHour(hour).replace(":00", "")}</p>
      <p className={`text-[10px] mt-0.5 font-semibold ${text}`}>{count}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }) {
  return (
    <div className={`relative bg-white rounded-2xl border p-5 shadow-sm overflow-hidden hover:-translate-y-0.5 transition-transform
      ${accent ? "border-emerald-200" : "border-gray-200"}`}>
      {accent && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-70" />}
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 shadow-sm text-white
          ${accent ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-600 to-slate-800"}`}>
          {icon}
        </div>
        <p className="text-2xl font-black text-gray-900 tracking-tight leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OwnerAnalytics() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [bookings,    setBookings]    = useState([]);
  const [ground,      setGround]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeChart, setActiveChart] = useState("daily");

  const fetchData = async (silent = false) => {
    if (!token) { navigate("/login"); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);
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
    } catch (e) { console.error(e); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const analytics = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const revOf     = (list) => list.reduce((s, b) => s + parseFloat(b.total_price || 0), 0);

    const todayStart = startOf("day");
    const weekStart  = startOf("week");
    const monthStart = startOf("month");

    const inRange = (b, start, end) => {
      const d = new Date(b.date);
      return d >= start && (end ? d < end : true);
    };

    const totalRevenue  = revOf(confirmed);
    const todayRevenue  = revOf(confirmed.filter((b) => inRange(b, todayStart)));
    const weekRevenue   = revOf(confirmed.filter((b) => inRange(b, weekStart)));
    const monthRevenue  = revOf(confirmed.filter((b) => inRange(b, monthStart)));
    const weekCount     = confirmed.filter((b) => inRange(b, weekStart)).length;
    const monthCount    = confirmed.filter((b) => inRange(b, monthStart)).length;

    const hourMap = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    confirmed.forEach((b) => {
      if (!b.start_time) return;
      const h = parseInt(b.start_time.split(":")[0], 10);
      if (h >= 0 && h < 24) hourMap[h]++;
    });
    const hourData = Object.entries(hourMap)
      .map(([h, count]) => ({ hour: parseInt(h), label: fmtHour(parseInt(h)), count }))
      .filter((d) => d.hour >= 5 && d.hour <= 23);
    const maxHour = Math.max(...hourData.map((d) => d.count), 1);
    const top5    = [...hourData].sort((a, b) => b.count - a.count).slice(0, 5);
    const bottom5 = [...hourData].filter((d) => d.count > 0).sort((a, b) => a.count - b.count).slice(0, 5);

    const now    = new Date();
    const last30 = [];
    for (let i = 29; i >= 0; i--) {
      const d   = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const rev = revOf(confirmed.filter((b) => b.date === key));
      last30.push({ label: d.getDate().toString(), fullDate: key, revenue: rev });
    }

    const last12w = [];
    for (let i = 11; i >= 0; i--) {
      const wStart = new Date(now);
      wStart.setDate(wStart.getDate() - wStart.getDay() - i * 7);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 7);
      const rev = revOf(confirmed.filter((b) => inRange(b, wStart, wEnd)));
      last12w.push({ label: `W${12 - i}`, revenue: rev });
    }

    const peakRules    = (ground?.peak_pricing_rules || []).filter((r) => r.is_active && r.rule_type !== "off_peak");
    const offPeakRules = (ground?.peak_pricing_rules || []).filter((r) => r.is_active && r.rule_type === "off_peak");

    const classify = (b) => {
      if (!b.start_time) return "standard";
      const h = parseInt(b.start_time.split(":")[0], 10);
      for (const rule of peakRules) { if (rule.start_hour <= h && h < rule.end_hour) return "peak"; }
      for (const rule of offPeakRules) { if (rule.start_hour <= h && h < rule.end_hour) return "off_peak"; }
      return "standard";
    };

    const peakB     = confirmed.filter((b) => classify(b) === "peak");
    const offPeakB  = confirmed.filter((b) => classify(b) === "off_peak");
    const standardB = confirmed.filter((b) => classify(b) === "standard");

    return {
      totalRevenue, todayRevenue, weekRevenue, monthRevenue,
      weekCount, monthCount, hourData, maxHour, top5, bottom5,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <BarChart2 size={16} className="absolute inset-0 m-auto text-emerald-500" />
          </div>
          <p className="text-gray-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const {
    totalRevenue, todayRevenue, weekRevenue, monthRevenue,
    weekCount, monthCount, hourData, maxHour, top5, bottom5,
    last30, last12w, peakRevenue, offPeakRevenue, standardRevenue,
    peakCount, offPeakCount, standardCount, totalConfirmed,
  } = analytics;

  const chartData  = activeChart === "daily" ? last30 : last12w;
  const chartLabel = activeChart === "daily" ? "Daily Revenue — Last 30 Days" : "Weekly Revenue — Last 12 Weeks";
  const chartColor = (d) => {
    const max = Math.max(...chartData.map((x) => x.revenue), 1);
    const pct = d.revenue / max;
    if (d.revenue === 0) return "#f3f4f6";
    return activeChart === "daily"
      ? pct > 0.65 ? "#10b981" : pct > 0.3 ? "#34d399" : "#a7f3d0"
      : pct > 0.65 ? "#3b82f6" : pct > 0.3 ? "#60a5fa" : "#bfdbfe";
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium">
              <ArrowLeft size={17} /> Dashboard
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                <BarChart2 size={16} className="text-emerald-600" />
              </div>
              <div>
                <h1 className="text-base font-black text-gray-900 leading-none">Analytics</h1>
                {ground && <p className="text-xs text-gray-400 mt-0.5">{ground.name}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 hidden sm:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
            <button onClick={() => fetchData(true)} disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8">

        {/* Ground banner */}
        {ground && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-4 mb-8 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-black text-gray-900">{ground.name}</h2>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border
                  ${ground.is_approved
                    ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                    : "bg-amber-100 border-amber-200 text-amber-700"}`}>
                  {ground.is_approved ? "Live" : "Pending"}
                </span>
              </div>
              <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                <MapPin size={13} /> {ground.location}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="text-center">
                <p className="font-black text-gray-900 text-lg">Rs {ground.price_per_hour}</p>
                <p className="text-gray-400 text-xs">Base / hr</p>
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 text-lg">{totalConfirmed}</p>
                <p className="text-gray-400 text-xs">Confirmed</p>
              </div>
              <div className="text-center">
                <p className="font-black text-emerald-600 text-lg">{fmtRs(totalRevenue)}</p>
                <p className="text-gray-400 text-xs">Revenue</p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KpiCard label="All-Time Revenue" value={fmtRs(totalRevenue)} sub={`${totalConfirmed} confirmed`} icon={<DollarSign size={18} />} accent />
          <KpiCard label="Today"        value={fmtRs(todayRevenue)} sub="so far"               icon={<Calendar size={18} />} />
          <KpiCard label="This Week"    value={fmtRs(weekRevenue)}  sub={`${weekCount} bookings`}  icon={<Activity size={18} />} />
          <KpiCard label="This Month"   value={fmtRs(monthRevenue)} sub={`${monthCount} bookings`} icon={<TrendingUp size={18} />} />
          <KpiCard label="Bookings"     value={totalConfirmed}      sub="confirmed only"          icon={<BarChart2 size={18} />} />
          <KpiCard label="Avg / Booking" value={totalConfirmed > 0 ? fmtRs(totalRevenue / totalConfirmed) : "Rs 0"} sub="revenue avg" icon={<Clock size={18} />} />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left — 2/3 */}
          <div className="xl:col-span-2 space-y-6">

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-gray-900 text-base">{chartLabel}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {activeChart === "daily" ? "Each bar = one day" : "Each bar = one week"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {[{ id: "daily", label: "30 Days" }, { id: "weekly", label: "12 Weeks" }].map((opt) => (
                    <button key={opt.id} onClick={() => setActiveChart(opt.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition border
                        ${activeChart === opt.id
                          ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <BarChart data={chartData} labelKey="label" valueKey="revenue" colorFn={chartColor} />
              <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                <span>{activeChart === "daily" ? "Last 30 days" : "Last 12 weeks"}</span>
                <span className="font-semibold text-gray-600">
                  Total: {fmtRs(chartData.reduce((s, d) => s + d.revenue, 0))}
                </span>
              </div>
            </div>

            {/* Hourly heatmap */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h3 className="font-black text-gray-900 text-base">Booking Activity by Hour</h3>
                  <p className="text-sm text-gray-400 mt-0.5">When your ground gets booked most</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  {[
                    { bg: "bg-gray-100",     label: "None" },
                    { bg: "bg-emerald-100",  label: "Low"  },
                    { bg: "bg-emerald-300",  label: "Med"  },
                    { bg: "bg-emerald-500",  label: "High" },
                    { bg: "bg-emerald-700",  label: "Peak" },
                  ].map((l) => (
                    <span key={l.label} className="flex items-center gap-1">
                      <span className={`w-3 h-3 rounded ${l.bg} border border-gray-200`} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
              {totalConfirmed === 0 ? (
                <div className="flex items-center justify-center h-28 text-gray-400 text-sm">
                  No confirmed bookings yet.
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-9 lg:grid-cols-10 gap-1.5">
                  {hourData.map((d) => (
                    <HeatCell key={d.hour} hour={d.hour} count={d.count} max={maxHour} label={d.label} />
                  ))}
                </div>
              )}
            </div>

            {/* Slot type breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="mb-5">
                <h3 className="font-black text-gray-900 text-base">Revenue by Slot Type</h3>
                <p className="text-sm text-gray-400 mt-0.5">How dynamic pricing affects your earnings</p>
              </div>

              {totalConfirmed === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">No confirmed bookings yet.</div>
              ) : (
                <div className="space-y-4">
                  {[
                    { label: "Peak Hours",     count: peakCount,     rev: peakRevenue,     color: "bg-amber-500",   text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
                    { label: "Off-Peak Hours", count: offPeakCount,  rev: offPeakRevenue,  color: "bg-blue-500",    text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200"  },
                    { label: "Standard Hours", count: standardCount, rev: standardRevenue, color: "bg-emerald-400", text: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
                  ].map((item) => {
                    const pctRev   = totalRevenue   > 0 ? Math.round((item.rev   / totalRevenue)   * 100) : 0;
                    const pctCount = totalConfirmed > 0 ? Math.round((item.count / totalConfirmed) * 100) : 0;
                    return (
                      <div key={item.label} className={`rounded-xl border p-4 ${item.bg} ${item.border}`}>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-sm ${item.text}`}>{item.label}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${item.text} ${item.bg} ${item.border}`}>
                              {item.count} bookings
                            </span>
                          </div>
                          <span className={`text-lg font-black ${item.text}`}>
                            {fmtRs(item.rev)}
                            <span className="text-xs font-semibold ml-1 opacity-60">({pctRev}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color} transition-all duration-700`}
                            style={{ width: `${pctCount}%` }} />
                        </div>
                        <p className={`text-xs mt-1.5 opacity-60 ${item.text}`}>{pctCount}% of all bookings</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {(ground?.peak_pricing_rules || []).length === 0 && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-emerald-700 text-xs font-semibold">
                    Add peak & off-peak pricing rules from the Pricing page to unlock deeper slot analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right — 1/3 */}
          <div className="xl:col-span-1 space-y-5">

            {/* Top booked slots */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <h3 className="font-black text-gray-900 text-sm">Most Booked Hours</h3>
              </div>
              {top5.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No booking data yet</p>
              ) : (
                <div className="space-y-3">
                  {top5.map((d, i) => (
                    <div key={d.hour} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0
                        ${i === 0 ? "bg-emerald-500 text-white shadow-sm"
                          : i === 1 ? "bg-emerald-200 text-emerald-800"
                          : "bg-gray-100 text-gray-500"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800">{d.label}</p>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${(d.count / (top5[0]?.count || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-600 flex-shrink-0">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Least booked slots */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingDown size={14} className="text-blue-500" />
                </div>
                <h3 className="font-black text-gray-900 text-sm">Least Booked Hours</h3>
              </div>
              {bottom5.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  {totalConfirmed === 0 ? "No data yet" : "All hours have bookings!"}
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {bottom5.map((d, i) => (
                      <div key={d.hour} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-700">{d.label}</p>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full transition-all duration-700"
                              style={{ width: `${(d.count / (maxHour || 1)) * 100}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-black text-blue-500 flex-shrink-0">{d.count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-blue-700 text-xs font-semibold">
                      Consider an off-peak discount for {bottom5[0]?.label} to attract more bookings.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-black text-gray-900 text-sm mb-4">Quick Summary</h3>
              <div className="space-y-3">
                {[
                  { label: "Today's Revenue", value: fmtRs(todayRevenue),  accent: todayRevenue > 0 },
                  { label: "Week Revenue",    value: fmtRs(weekRevenue)  },
                  { label: "Week Bookings",   value: weekCount            },
                  { label: "Month Revenue",   value: fmtRs(monthRevenue) },
                  { label: "Month Bookings",  value: monthCount           },
                  { label: "Avg / Booking",   value: totalConfirmed > 0 ? fmtRs(totalRevenue / totalConfirmed) : "—" },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`text-sm font-black ${accent ? "text-emerald-600" : "text-gray-800"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking status */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-black text-gray-900 text-sm mb-4">Booking Status</h3>
              <div className="space-y-3">
                {[
                  { label: "Confirmed", count: bookings.filter((b) => b.status === "confirmed").length, color: "bg-emerald-500", text: "text-emerald-700" },
                  { label: "Pending",   count: bookings.filter((b) => b.status === "pending").length,   color: "bg-amber-500",   text: "text-amber-700"  },
                  { label: "Cancelled", count: bookings.filter((b) => b.status === "cancelled").length, color: "bg-red-400",     text: "text-red-600"    },
                ].map((s) => {
                  const total = bookings.length || 1;
                  const pct   = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-600 font-medium">{s.label}</span>
                        <span className={`text-sm font-black ${s.text}`}>{s.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>Total bookings</span>
                <span className="font-black text-gray-700">{bookings.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
