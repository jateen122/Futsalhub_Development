// frontend/src/pages/OwnerPricingAndBlocking.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Edit3, Clock, DollarSign,
  Ban, RefreshCw, Tag, ChevronDown, ChevronUp, MapPin,
  CheckCircle, AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const DAY_LABELS = {
  "-1": "All Days",
  "0": "Monday",
  "1": "Tuesday",
  "2": "Wednesday",
  "3": "Thursday",
  "4": "Friday",
  "5": "Saturday",
  "6": "Sunday",
};

const DAY_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const ampm = i >= 12 ? "PM" : "AM";
  const h12  = i % 12 === 0 ? 12 : i % 12;
  return { value: i, label: `${h12}:00 ${ampm}` };
});

const fmtHour = (h) => {
  if (h == null) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl text-sm font-semibold whitespace-nowrap border
      ${type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
      {msg}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, toggle, isOpen }) {
  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition border-b border-gray-100"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-bold text-gray-900 text-base">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
    </button>
  );
}

function PricingForm({ groundId, rule, ruleType, onSave, onCancel, token, basePrice }) {
  const isPeak = ruleType !== "off_peak";
  const [form, setForm] = useState({
    day_of_week:    rule?.day_of_week    ?? -1,
    start_hour:     rule?.start_hour     ?? (isPeak ? 17 : 6),
    end_hour:       rule?.end_hour       ?? (isPeak ? 21 : 10),
    price_per_hour: rule?.price_per_hour ?? "",
    label:          rule?.label          ?? (isPeak ? "Peak Hours" : "Off-Peak Discount"),
    is_active:      rule?.is_active      ?? true,
    rule_type:      ruleType,
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const validate = () => {
    const e = {};
    if (form.start_hour >= form.end_hour) e.end_hour = "End hour must be after start hour.";
    const price = parseFloat(form.price_per_hour);
    if (!form.price_per_hour || isNaN(price) || price <= 0) e.price_per_hour = "Enter a valid price.";
    if (!isPeak && basePrice && price >= parseFloat(basePrice))
      e.price_per_hour = `Off-peak price must be less than base price (Rs ${basePrice}).`;
    if (!form.label.trim()) e.label = "Label is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    const url    = rule ? `${BASE_URL}/api/grounds/${groundId}/pricing/${rule.id}/` : `${BASE_URL}/api/grounds/${groundId}/pricing/`;
    const method = rule ? "PATCH" : "POST";
    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          day_of_week:    parseInt(form.day_of_week, 10),
          start_hour:     parseInt(form.start_hour,  10),
          end_hour:       parseInt(form.end_hour,    10),
          price_per_hour: parseFloat(form.price_per_hour),
          rule_type: ruleType,
        }),
      });
      const data = await res.json();
      if (res.ok) onSave(data.rule || data);
      else setErrors(data);
    } catch { setErrors({ api: "Network error." }); }
    finally   { setSaving(false); }
  };

  const priceDiff = basePrice && form.price_per_hour
    ? Math.round(((parseFloat(form.price_per_hour) - parseFloat(basePrice)) / parseFloat(basePrice)) * 100)
    : null;

  const selectCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-800";
  const inputCls  = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-800 placeholder-gray-400";

  return (
    <div className={`bg-white border-2 rounded-2xl p-6 mb-6 shadow-sm ${isPeak ? "border-amber-200" : "border-blue-200"}`}>
      <h3 className="font-bold text-gray-900 text-base mb-1">
        {rule ? `Edit ${isPeak ? "Peak" : "Off-Peak"} Rule` : `New ${isPeak ? "Peak Pricing" : "Off-Peak Discount"}`}
      </h3>
      <p className="text-gray-400 text-xs mb-5">
        {isPeak ? `Higher price during busy hours. Base: Rs ${basePrice}/hr` : `Discounted price during slow hours. Must be below Rs ${basePrice}/hr`}
      </p>

      {errors.api && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">{errors.api}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Apply On</label>
            <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} className={selectCls}>
              {Object.entries(DAY_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Rule Label</label>
            <input type="text" value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={isPeak ? "Evening Peak" : "Morning Discount"}
              className={`${inputCls} ${errors.label ? "border-red-400" : ""}`}
            />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Start Time</label>
            <select value={form.start_hour} onChange={(e) => setForm((f) => ({ ...f, start_hour: parseInt(e.target.value, 10) }))} className={selectCls}>
              {HOUR_OPTIONS.slice(0, 24).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">End Time</label>
            <select value={form.end_hour} onChange={(e) => setForm((f) => ({ ...f, end_hour: parseInt(e.target.value, 10) }))} className={`${selectCls} ${errors.end_hour ? "border-red-400" : ""}`}>
              {HOUR_OPTIONS.slice(1).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            {errors.end_hour && <p className="text-red-500 text-xs mt-1">{errors.end_hour}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              {isPeak ? "Peak" : "Off-Peak"} Price per Hour (Rs)
            </label>
            <div className={`flex border rounded-xl overflow-hidden focus-within:border-emerald-500 ${errors.price_per_hour ? "border-red-400" : "border-gray-200"}`}>
              <span className="px-4 py-3 bg-gray-50 text-gray-400 text-sm font-semibold border-r border-gray-200">Rs</span>
              <input type="number" min="1" step="0.01" value={form.price_per_hour}
                onChange={(e) => setForm((f) => ({ ...f, price_per_hour: e.target.value }))}
                placeholder={isPeak ? "2000" : "800"} className="flex-1 px-4 py-3 text-sm focus:outline-none bg-white text-gray-800" />
              {priceDiff != null && (
                <span className={`px-4 py-3 text-sm font-bold border-l border-gray-200 ${priceDiff > 0 ? "bg-amber-50 text-amber-700" : priceDiff < 0 ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-400"}`}>
                  {priceDiff > 0 ? `+${priceDiff}%` : `${priceDiff}%`}
                </span>
              )}
            </div>
            {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">{errors.price_per_hour}</p>}
            {basePrice && <p className="text-gray-400 text-xs mt-1">Base price: Rs {basePrice}/hr</p>}
          </div>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-emerald-500" : "bg-gray-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">{form.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className={`flex-1 py-3 font-bold rounded-xl transition text-sm text-white disabled:opacity-50
              ${isPeak ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}>
            {saving ? "Saving..." : rule ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BlockForm({ groundId, block, onSave, onCancel, token }) {
  const [form, setForm] = useState({
    block_type:   block?.block_type  ?? "date",
    blocked_date: block?.blocked_date ?? "",
    day_of_week:  block?.day_of_week  ?? 0,
    full_day:     block ? block.start_hour == null : true,
    start_hour:   block?.start_hour ?? 8,
    end_hour:     block?.end_hour   ?? 22,
    reason:       block?.reason     ?? "",
    is_active:    block?.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (form.block_type === "date" && !form.blocked_date) e.blocked_date = "Please select a date.";
    if (!form.full_day && form.start_hour >= form.end_hour) e.end_hour = "End hour must be after start hour.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    const payload = {
      block_type:  form.block_type,
      reason:      form.reason,
      is_active:   form.is_active,
      start_hour:  form.full_day ? null : parseInt(form.start_hour, 10),
      end_hour:    form.full_day ? null : parseInt(form.end_hour,   10),
    };
    if (form.block_type === "date")      payload.blocked_date = form.blocked_date;
    if (form.block_type === "recurring") payload.day_of_week  = parseInt(form.day_of_week, 10);
    const url    = block ? `${BASE_URL}/api/grounds/${groundId}/blocks/${block.id}/` : `${BASE_URL}/api/grounds/${groundId}/blocks/`;
    const method = block ? "PATCH" : "POST";
    try {
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) onSave(data.block || data);
      else setErrors(data);
    } catch { setErrors({ api: "Network error." }); }
    finally   { setSaving(false); }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const selectCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-800";

  return (
    <div className="bg-white border-2 border-red-200 rounded-2xl p-6 mb-6 shadow-sm">
      <h3 className="font-bold text-gray-900 text-base mb-4">{block ? "Edit Block" : "New Blocked Slot"}</h3>
      {errors.api && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">{errors.api}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Block Type</label>
            <div className="flex gap-3">
              {[{ value: "date", label: "Specific Date" }, { value: "recurring", label: "Recurring Weekday" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, block_type: opt.value }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition
                    ${form.block_type === opt.value ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-600 hover:border-red-200"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.block_type === "date" ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Date to Block</label>
              <input type="date" min={todayStr} value={form.blocked_date}
                onChange={(e) => setForm((f) => ({ ...f, blocked_date: e.target.value }))}
                className={`${selectCls} ${errors.blocked_date ? "border-red-400" : ""}`} />
              {errors.blocked_date && <p className="text-red-500 text-xs mt-1">{errors.blocked_date}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Day of Week</label>
              <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} className={selectCls}>
                {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Reason (shown to players)</label>
            <input type="text" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Maintenance, Private event..."
              className={selectCls} />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, full_day: !f.full_day }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.full_day ? "bg-red-500" : "bg-gray-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.full_day ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">{form.full_day ? "Block Full Day" : "Block Specific Hours"}</span>
            </div>

            {!form.full_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">From</label>
                  <select value={form.start_hour} onChange={(e) => setForm((f) => ({ ...f, start_hour: parseInt(e.target.value, 10) }))} className={selectCls}>
                    {HOUR_OPTIONS.slice(0, 24).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">To</label>
                  <select value={form.end_hour} onChange={(e) => setForm((f) => ({ ...f, end_hour: parseInt(e.target.value, 10) }))} className={`${selectCls} ${errors.end_hour ? "border-red-400" : ""}`}>
                    {HOUR_OPTIONS.slice(1).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                  {errors.end_hour && <p className="text-red-500 text-xs mt-1">{errors.end_hour}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition text-sm disabled:opacity-50">
            {saving ? "Saving..." : block ? "Update Block" : "Create Block"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OwnerPricingAndBlocking() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,          setGround]          = useState(null);
  const [rules,           setRules]           = useState([]);
  const [blocks,          setBlocks]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [toast,           setToast]           = useState({ msg: "", type: "" });
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [pricingFormType, setPricingFormType] = useState("peak");
  const [editingRule,     setEditingRule]     = useState(null);
  const [deletingRule,    setDeletingRule]    = useState(null);
  const [pricingSection,  setPricingSection]  = useState(true);
  const [showBlockForm,   setShowBlockForm]   = useState(false);
  const [editingBlock,    setEditingBlock]    = useState(null);
  const [deletingBlock,   setDeletingBlock]   = useState(null);
  const [blockingSection, setBlockingSection] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  const fetchData = async () => {
    if (!token) { navigate("/login"); return; }
    try {
      const gRes  = await fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } });
      const gData = await gRes.json();
      const myGrounds = gData.results || gData || [];
      if (myGrounds.length === 0) { setLoading(false); return; }
      const g = myGrounds[0];
      setGround(g);
      const [pRes, bRes] = await Promise.all([
        fetch(`${BASE_URL}/api/grounds/${g.id}/pricing/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BASE_URL}/api/grounds/${g.id}/blocks/`,  { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pData = await pRes.json();
      const bData = await bRes.json();
      setRules(pData.rules   || []);
      setBlocks(bData.blocks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRuleSaved = (rule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === rule.id);
      return exists ? prev.map((r) => r.id === rule.id ? rule : r) : [...prev, rule];
    });
    setShowPricingForm(false);
    setEditingRule(null);
    showToast(editingRule ? "Rule updated!" : "Rule created!");
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Delete this pricing rule?")) return;
    setDeletingRule(ruleId);
    try {
      await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${ruleId}/`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast("Rule deleted.");
    } finally { setDeletingRule(null); }
  };

  const toggleRuleActive = async (rule) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${rule.id}/`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? (data.rule || data) : r));
        showToast(rule.is_active ? "Rule deactivated." : "Rule activated!");
      }
    } catch {}
  };

  const handleBlockSaved = (block) => {
    setBlocks((prev) => {
      const exists = prev.find((b) => b.id === block.id);
      return exists ? prev.map((b) => b.id === block.id ? block : b) : [...prev, block];
    });
    setShowBlockForm(false);
    setEditingBlock(null);
    showToast(editingBlock ? "Block updated!" : "Block created!");
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm("Remove this block?")) return;
    setDeletingBlock(blockId);
    try {
      await fetch(`${BASE_URL}/api/grounds/${ground.id}/blocks/${blockId}/`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      showToast("Block removed.");
    } finally { setDeletingBlock(null); }
  };

  const toggleBlockActive = async (block) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/blocks/${block.id}/`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !block.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlocks((prev) => prev.map((b) => b.id === block.id ? (data.block || data) : b));
        showToast(block.is_active ? "Block deactivated." : "Block activated!");
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MapPin size={26} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">No Ground Found</h2>
          <p className="text-gray-500 text-sm mb-6">Register a ground first to manage pricing and availability.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-sm">
            Add Ground
          </button>
        </div>
      </div>
    );
  }

  const peakRules         = rules.filter((r) => r.rule_type !== "off_peak");
  const offPeakRules      = rules.filter((r) => r.rule_type === "off_peak");
  const activePeakRules   = peakRules.filter((r) => r.is_active);
  const inactivePeakRules = peakRules.filter((r) => !r.is_active);
  const activeOffPeakRules   = offPeakRules.filter((r) => r.is_active);
  const inactiveOffPeakRules = offPeakRules.filter((r) => !r.is_active);
  const activeBlocks   = blocks.filter((b) => b.is_active);
  const inactiveBlocks = blocks.filter((b) => !b.is_active);

  const RuleCard = ({ rule }) => {
    const isPeak = rule.rule_type !== "off_peak";
    return (
      <div className={`border-2 rounded-xl p-4 flex items-center justify-between
        ${isPeak ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-sm">{rule.label}</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${isPeak ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
              {DAY_LABELS[String(rule.day_of_week)]}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)} · Rs {rule.price_per_hour}/hr
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleRuleActive(rule)}
            className="px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition">
            {rule.is_active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => { setEditingRule(rule); setShowPricingForm(false); }}
            className="p-1.5 text-gray-400 hover:text-amber-600 transition rounded-lg hover:bg-amber-50">
            <Edit3 size={15} />
          </button>
          <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
            className="p-1.5 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 disabled:opacity-40">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-16 z-30">
        <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 font-medium transition text-sm">
              <ArrowLeft size={18} /> Dashboard
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div>
              <h1 className="text-xl font-black text-gray-900">Pricing & Availability</h1>
              <p className="text-gray-400 text-xs mt-0.5">{ground.name}</p>
            </div>
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 text-sm font-medium transition">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-6 md:px-10 lg:px-14 xl:px-20 py-8 space-y-6">

        {/* Info bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-bold text-gray-900">{ground.name}</p>
            <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
              <MapPin size={13} /> {ground.location} · Base: Rs {ground.price_per_hour}/hr
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg font-semibold">
              {activePeakRules.length} peak rule{activePeakRules.length !== 1 ? "s" : ""}
            </span>
            <span className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-semibold">
              {activeOffPeakRules.length} off-peak rule{activeOffPeakRules.length !== 1 ? "s" : ""}
            </span>
            <span className="bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg font-semibold">
              {activeBlocks.length} block{activeBlocks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={<DollarSign size={20} />}
            title="Dynamic Pricing Rules"
            subtitle={`${rules.length} rule${rules.length !== 1 ? "s" : ""} · Peak surcharges and off-peak discounts`}
            toggle={() => setPricingSection((v) => !v)}
            isOpen={pricingSection}
          />

          {pricingSection && (
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={15} className="text-amber-600" />
                    <p className="font-bold text-amber-800">Peak Pricing</p>
                  </div>
                  <p className="text-amber-700 text-xs">Set higher rates during busy hours to maximise revenue.</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={15} className="text-blue-600" />
                    <p className="font-bold text-blue-800">Off-Peak Discount</p>
                  </div>
                  <p className="text-blue-700 text-xs">Set lower rates during slow hours to attract more players.</p>
                </div>
              </div>

              {(showPricingForm || editingRule) && (
                <PricingForm
                  groundId={ground.id}
                  rule={editingRule}
                  ruleType={editingRule ? (editingRule.rule_type === "off_peak" ? "off_peak" : "peak") : pricingFormType}
                  token={token}
                  basePrice={ground.price_per_hour}
                  onSave={handleRuleSaved}
                  onCancel={() => { setShowPricingForm(false); setEditingRule(null); }}
                />
              )}

              {!showPricingForm && !editingRule && (
                <div className="flex gap-3 mb-6">
                  <button onClick={() => { setPricingFormType("peak"); setShowPricingForm(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-50 text-amber-700 border border-amber-300 rounded-xl text-sm font-semibold hover:bg-amber-100 transition">
                    <Plus size={16} /> Add Peak Rule
                  </button>
                  <button onClick={() => { setPricingFormType("off_peak"); setShowPricingForm(true); }}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-sm font-semibold hover:bg-blue-100 transition">
                    <Plus size={16} /> Add Off-Peak Discount
                  </button>
                </div>
              )}

              {activePeakRules.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">Active Peak Rules</p>
                  <div className="space-y-3">{activePeakRules.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
                </div>
              )}

              {activeOffPeakRules.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Active Off-Peak Discounts</p>
                  <div className="space-y-3">{activeOffPeakRules.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
                </div>
              )}

              {(inactivePeakRules.length > 0 || inactiveOffPeakRules.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Inactive Rules</p>
                  <div className="space-y-2">
                    {[...inactivePeakRules, ...inactiveOffPeakRules].map((rule) => (
                      <div key={rule.id} className="border border-gray-200 bg-gray-50 rounded-xl p-4 flex items-center justify-between opacity-60">
                        <div>
                          <p className="font-semibold text-gray-700 text-sm">{rule.label}
                            <span className="ml-2 text-xs text-gray-400">({rule.rule_type === "off_peak" ? "off-peak" : "peak"})</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {DAY_LABELS[String(rule.day_of_week)]} · {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)} · Rs {rule.price_per_hour}/hr
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleRuleActive(rule)}
                            className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition">
                            Activate
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition disabled:opacity-40">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rules.length === 0 && !showPricingForm && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                  <DollarSign size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-semibold text-sm">No pricing rules yet</p>
                  <p className="text-gray-400 text-xs mt-1">Set peak and off-peak rates to maximise revenue</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blocking Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={<Ban size={20} />}
            title="Blocked Slots"
            subtitle={`${blocks.length} block${blocks.length !== 1 ? "s" : ""} · Prevent bookings during maintenance or events`}
            toggle={() => setBlockingSection((v) => !v)}
            isOpen={blockingSection}
          />

          {blockingSection && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={15} className="text-red-600" />
                  <p className="font-bold">Blocked slots prevent all bookings</p>
                </div>
                <p className="text-xs text-red-700">Players will see the slot as unavailable when booking.</p>
              </div>

              {(showBlockForm || editingBlock) && (
                <BlockForm groundId={ground.id} block={editingBlock} token={token}
                  onSave={handleBlockSaved} onCancel={() => { setShowBlockForm(false); setEditingBlock(null); }} />
              )}

              {!showBlockForm && !editingBlock && (
                <button onClick={() => setShowBlockForm(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-700 border border-red-300 rounded-xl text-sm font-semibold hover:bg-red-100 transition mb-5">
                  <Plus size={16} /> Add Blocked Slot
                </button>
              )}

              {activeBlocks.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Active Blocks</p>
                  <div className="space-y-3">
                    {activeBlocks.map((block) => (
                      <div key={block.id} className="border-2 border-red-200 bg-red-50 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {block.block_type === "date" ? block.blocked_date : `Every ${DAY_LABELS[block.day_of_week]}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {block.is_full_day ? "Full day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                            {block.reason && ` · ${block.reason}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleBlockActive(block)}
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition">
                            Deactivate
                          </button>
                          <button onClick={() => { setEditingBlock(block); setShowBlockForm(false); }}
                            className="p-1.5 text-gray-400 hover:text-amber-600 transition rounded-lg hover:bg-amber-50">
                            <Edit3 size={15} />
                          </button>
                          <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition disabled:opacity-40">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inactiveBlocks.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Inactive Blocks</p>
                  <div className="space-y-2">
                    {inactiveBlocks.map((block) => (
                      <div key={block.id} className="border border-gray-200 bg-gray-50 rounded-xl p-4 flex items-center justify-between opacity-60">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {block.block_type === "date" ? block.blocked_date : `Every ${DAY_LABELS[block.day_of_week]}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {block.is_full_day ? "Full day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                            {block.reason && ` · ${block.reason}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleBlockActive(block)}
                            className="px-3 py-1.5 text-xs font-semibold border border-emerald-300 text-emerald-600 rounded-lg hover:bg-emerald-50 transition">
                            Activate
                          </button>
                          <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition disabled:opacity-40">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {blocks.length === 0 && !showBlockForm && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                  <Ban size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-semibold text-sm">No blocked slots</p>
                  <p className="text-gray-400 text-xs mt-1">Block time slots for maintenance or private events</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
