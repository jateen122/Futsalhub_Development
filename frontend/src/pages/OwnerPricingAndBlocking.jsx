// frontend/src/pages/OwnerPricingAndBlocking.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Edit3, Clock,
  DollarSign, Ban, Calendar, RefreshCw, Tag,
  ChevronDown, ChevronUp,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = {
  "-1": "All Days",
  "0":  "Monday",
  "1":  "Tuesday",
  "2":  "Wednesday",
  "3":  "Thursday",
  "4":  "Friday",
  "5":  "Saturday",
  "6":  "Sunday",
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

// ─── Shared input styles ──────────────────────────────────────────────────────

const SELECT_CLS =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white";
const INPUT_CLS =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl
      text-sm font-semibold whitespace-nowrap border
      ${type === "error"
        ? "bg-white border-red-300 text-red-700"
        : "bg-white border-amber-300 text-amber-700"}`}>
      {type === "error" ? "⚠ " : "✅ "}{msg}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Peak Pricing Form ────────────────────────────────────────────────────────

function PricingForm({ groundId, rule, onSave, onCancel, token }) {
  const [form, setForm] = useState({
    day_of_week:    rule?.day_of_week    ?? -1,
    start_hour:     rule?.start_hour     ?? 17,
    end_hour:       rule?.end_hour       ?? 21,
    price_per_hour: rule?.price_per_hour ?? "",
    label:          rule?.label          ?? "Peak Hours",
    is_active:      rule?.is_active      ?? true,
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const validate = () => {
    const e = {};
    if (form.start_hour >= form.end_hour)     e.end_hour = "End hour must be after start hour.";
    if (!form.price_per_hour || parseFloat(form.price_per_hour) <= 0)
      e.price_per_hour = "Enter a valid price.";
    if (!form.label.trim())                   e.label = "Label is required.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    const url    = rule
      ? `${BASE_URL}/api/grounds/${groundId}/pricing/${rule.id}/`
      : `${BASE_URL}/api/grounds/${groundId}/pricing/`;
    const method = rule ? "PATCH" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          day_of_week:    parseInt(form.day_of_week, 10),
          start_hour:     parseInt(form.start_hour, 10),
          end_hour:       parseInt(form.end_hour, 10),
          price_per_hour: parseFloat(form.price_per_hour),
        }),
      });
      const data = await res.json();
      if (res.ok) onSave(data.rule || data);
      else setErrors(data);
    } catch {
      setErrors({ api: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-4">
        {rule ? "Edit Pricing Rule" : "New Pricing Rule"}
      </h3>
      {errors.api && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3 mb-4">{errors.api}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Apply On</label>
            <select value={form.day_of_week}
              onChange={(e) => setForm(f => ({ ...f, day_of_week: e.target.value }))}
              className={SELECT_CLS}>
              {Object.entries(DAY_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Label</label>
            <input type="text" value={form.label}
              onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Evening Peak"
              className={`${INPUT_CLS} ${errors.label ? "border-red-400" : ""}`} />
            {errors.label && <p className="text-red-500 text-xs mt-1">⚠ {errors.label}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
            <select value={form.start_hour}
              onChange={(e) => setForm(f => ({ ...f, start_hour: parseInt(e.target.value, 10) }))}
              className={SELECT_CLS}>
              {HOUR_OPTIONS.slice(0, 24).map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
            <select value={form.end_hour}
              onChange={(e) => setForm(f => ({ ...f, end_hour: parseInt(e.target.value, 10) }))}
              className={`${SELECT_CLS} ${errors.end_hour ? "border-red-400" : ""}`}>
              {HOUR_OPTIONS.slice(1).map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
            {errors.end_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.end_hour}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Peak Price / Hour (Rs)</label>
            <div className={`flex border rounded-xl overflow-hidden focus-within:border-amber-400
              ${errors.price_per_hour ? "border-red-400" : "border-gray-200"}`}>
              <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">Rs</span>
              <input type="number" min="1" step="0.01" value={form.price_per_hour}
                onChange={(e) => setForm(f => ({ ...f, price_per_hour: e.target.value }))}
                placeholder="2000" className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.price_per_hour}</p>}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${form.is_active ? "bg-amber-400" : "bg-gray-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl transition disabled:opacity-50 text-sm">
            {saving ? "Saving…" : rule ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Blocked Slot Form ────────────────────────────────────────────────────────

function BlockForm({ groundId, block, onSave, onCancel, token }) {
  const [form, setForm] = useState({
    block_type:   block?.block_type   ?? "date",
    blocked_date: block?.blocked_date ?? "",
    day_of_week:  block?.day_of_week  ?? 0,
    full_day:     block ? (block.start_hour == null) : true,
    start_hour:   block?.start_hour   ?? 8,
    end_hour:     block?.end_hour     ?? 22,
    reason:       block?.reason       ?? "",
    is_active:    block?.is_active    ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (form.block_type === "date" && !form.blocked_date)
      e.blocked_date = "Please select a date.";
    if (!form.full_day && form.start_hour >= form.end_hour)
      e.end_hour = "End hour must be after start hour.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    const payload = {
      block_type:   form.block_type,
      reason:       form.reason,
      is_active:    form.is_active,
      start_hour:   form.full_day ? null : parseInt(form.start_hour, 10),
      end_hour:     form.full_day ? null : parseInt(form.end_hour, 10),
    };
    if (form.block_type === "date")      payload.blocked_date = form.blocked_date;
    if (form.block_type === "recurring") payload.day_of_week  = parseInt(form.day_of_week, 10);

    const url    = block
      ? `${BASE_URL}/api/grounds/${groundId}/blocks/${block.id}/`
      : `${BASE_URL}/api/grounds/${groundId}/blocks/`;
    const method = block ? "PATCH" : "POST";

    try {
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) onSave(data.block || data);
      else setErrors(data);
    } catch {
      setErrors({ api: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-4">
      <h3 className="font-bold text-gray-900 mb-4">
        {block ? "Edit Block" : "New Blocked Slot"}
      </h3>
      {errors.api && (
        <p className="text-red-600 text-sm bg-red-100 border border-red-200 rounded-xl p-3 mb-4">{errors.api}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-2 gap-4 mb-4">

          {/* Block type */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Block Type</label>
            <div className="flex gap-3">
              {[
                { value: "date",      label: "📅 Specific Date" },
                { value: "recurring", label: "🔁 Recurring Weekday" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, block_type: opt.value }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition
                    ${form.block_type === opt.value
                      ? "border-red-500 bg-red-100 text-red-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-red-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date / Day */}
          {form.block_type === "date" ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date to Block</label>
              <input type="date" min={today} value={form.blocked_date}
                onChange={(e) => setForm(f => ({ ...f, blocked_date: e.target.value }))}
                className={`${INPUT_CLS} ${errors.blocked_date ? "border-red-400" : ""}`} />
              {errors.blocked_date && <p className="text-red-500 text-xs mt-1">⚠ {errors.blocked_date}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Day of Week</label>
              <select value={form.day_of_week}
                onChange={(e) => setForm(f => ({ ...f, day_of_week: e.target.value }))}
                className={SELECT_CLS}>
                {DAY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason (shown to players)</label>
            <input type="text" value={form.reason}
              onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Maintenance, Private Event, Closed"
              className={INPUT_CLS} />
          </div>

          {/* Full day toggle */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, full_day: !f.full_day }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${form.full_day ? "bg-red-500" : "bg-gray-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${form.full_day ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm font-semibold text-gray-700">
                {form.full_day ? "🚫 Block Full Day" : "⏰ Block Specific Hours"}
              </span>
            </div>

            {!form.full_day && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">From</label>
                  <select value={form.start_hour}
                    onChange={(e) => setForm(f => ({ ...f, start_hour: parseInt(e.target.value, 10) }))}
                    className={SELECT_CLS}>
                    {HOUR_OPTIONS.slice(0, 24).map(h => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Until</label>
                  <select value={form.end_hour}
                    onChange={(e) => setForm(f => ({ ...f, end_hour: parseInt(e.target.value, 10) }))}
                    className={`${SELECT_CLS} ${errors.end_hour ? "border-red-400" : ""}`}>
                    {HOUR_OPTIONS.slice(1).map(h => (
                      <option key={h.value} value={h.value}>{h.label}</option>
                    ))}
                  </select>
                  {errors.end_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.end_hour}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${form.is_active ? "bg-red-500" : "bg-gray-200"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {form.is_active ? "Block Active" : "Block Inactive"}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm">
            {saving ? "Saving…" : block ? "Update Block" : "Create Block"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerPricingAndBlocking() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,      setGround]      = useState(null);
  const [rules,       setRules]       = useState([]);
  const [blocks,      setBlocks]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState({ msg: "", type: "" });

  // Pricing UI
  const [showPricingForm,  setShowPricingForm]  = useState(false);
  const [editingRule,      setEditingRule]      = useState(null);
  const [deletingRule,     setDeletingRule]     = useState(null);
  const [pricingSection,   setPricingSection]   = useState(true); // collapsed

  // Blocking UI
  const [showBlockForm,    setShowBlockForm]    = useState(false);
  const [editingBlock,     setEditingBlock]     = useState(null);
  const [deletingBlock,    setDeletingBlock]    = useState(null);
  const [blockingSection,  setBlockingSection]  = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  const fetchData = async () => {
    if (!token) { navigate("/login"); return; }

    try {
      const gRes  = await fetch(`${BASE_URL}/api/grounds/my/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const gData = await gRes.json();
      const myGrounds = gData.results || gData || [];
      if (myGrounds.length === 0) { setLoading(false); return; }
      const g = myGrounds[0];
      setGround(g);

      const [pRes, bRes] = await Promise.all([
        fetch(`${BASE_URL}/api/grounds/${g.id}/pricing/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/api/grounds/${g.id}/blocks/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const pData = await pRes.json();
      const bData = await bRes.json();
      setRules(pData.rules || []);
      setBlocks(bData.blocks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Pricing handlers ──────────────────────────────────────────────────────

  const handleRuleSaved = (rule) => {
    setRules(prev => {
      const exists = prev.find(r => r.id === rule.id);
      return exists ? prev.map(r => r.id === rule.id ? rule : r) : [...prev, rule];
    });
    setShowPricingForm(false);
    setEditingRule(null);
    showToast(editingRule ? "Pricing rule updated!" : "Pricing rule created!");
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm("Delete this pricing rule?")) return;
    setDeletingRule(ruleId);
    try {
      await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${ruleId}/`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setRules(prev => prev.filter(r => r.id !== ruleId));
      showToast("Pricing rule deleted.");
    } finally {
      setDeletingRule(null);
    }
  };

  const toggleRuleActive = async (rule) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${rule.id}/`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? (data.rule || data) : r));
        showToast(rule.is_active ? "Rule deactivated." : "Rule activated!");
      }
    } catch {}
  };

  // ── Blocking handlers ─────────────────────────────────────────────────────

  const handleBlockSaved = (block) => {
    setBlocks(prev => {
      const exists = prev.find(b => b.id === block.id);
      return exists ? prev.map(b => b.id === block.id ? block : b) : [...prev, block];
    });
    setShowBlockForm(false);
    setEditingBlock(null);
    showToast(editingBlock ? "Block updated!" : "Block created!");
  };

  const handleDeleteBlock = async (blockId) => {
    if (!window.confirm("Remove this block?")) return;
    setDeletingBlock(blockId);
    try {
      await fetch(`${BASE_URL}/api/grounds/${ground.id}/blocks/${blockId}/`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      setBlocks(prev => prev.filter(b => b.id !== blockId));
      showToast("Block removed.");
    } finally {
      setDeletingBlock(null);
    }
  };

  const toggleBlockActive = async (block) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/blocks/${block.id}/`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ is_active: !block.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlocks(prev => prev.map(b => b.id === block.id ? (data.block || data) : b));
        showToast(block.is_active ? "Block deactivated." : "Block activated!");
      }
    } catch {}
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🏟️</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Ground Found</h2>
          <p className="text-gray-500 mb-6">Register a ground first.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-3 bg-amber-400 text-black font-bold rounded-2xl hover:bg-amber-500 transition">
            Add Ground
          </button>
        </div>
      </div>
    );
  }

  const activeRules    = rules.filter(r => r.is_active);
  const inactiveRules  = rules.filter(r => !r.is_active);
  const activeBlocks   = blocks.filter(b => b.is_active);
  const inactiveBlocks = blocks.filter(b => !b.is_active);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-gray-400 hover:text-gray-700 text-sm font-medium transition flex items-center gap-1">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">Pricing & Availability</span>
        </div>
        <button onClick={fetchData}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Ground info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⚽</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{ground.name}</h1>
              <p className="text-gray-500 text-sm">📍 {ground.location} · Base: Rs {ground.price_per_hour}/hr</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className={`px-3 py-1 rounded-full font-bold border
                ${ground.is_approved
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                {ground.is_approved ? "✓ Live" : "⏳ Pending"}
              </span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100">
            {[
              { label: "Pricing Rules", value: rules.length,  color: "text-amber-600" },
              { label: "Active Blocks", value: activeBlocks.length, color: "text-red-600"   },
              { label: "Total Blocks",  value: blocks.length, color: "text-gray-700"   },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 1: Peak Pricing
        ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <button
            onClick={() => setPricingSection(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="text-amber-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Peak Pricing Rules</p>
                <p className="text-xs text-gray-500">{rules.length} rule{rules.length !== 1 ? "s" : ""} · Override base price during peak hours</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeRules.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                  🔥 {activeRules.length} active
                </span>
              )}
              {pricingSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </div>
          </button>

          {pricingSection && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="pt-5">
                {/* How it works */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                  <strong>How it works:</strong> Peak rules override your base price (Rs {ground.price_per_hour}/hr)
                  for specified hours. Players see the exact rate when booking. Off-peak slots always use the base price.
                </div>

                {/* Form */}
                {(showPricingForm || editingRule) && (
                  <PricingForm
                    groundId={ground.id}
                    rule={editingRule}
                    token={token}
                    onSave={handleRuleSaved}
                    onCancel={() => { setShowPricingForm(false); setEditingRule(null); }}
                  />
                )}

                {/* Add button */}
                {!showPricingForm && !editingRule && (
                  <button onClick={() => setShowPricingForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 border border-amber-300 rounded-xl text-sm font-bold hover:bg-amber-200 transition mb-4">
                    <Plus size={16} /> Add Pricing Rule
                  </button>
                )}

                {/* Active rules */}
                {activeRules.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" /> Active ({activeRules.length})
                    </p>
                    <div className="space-y-3">
                      {activeRules.map(rule => (
                        <div key={rule.id}
                          className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-gray-900">{rule.label}</span>
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                                {DAY_LABELS[String(rule.day_of_week)] || "All Days"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock size={13} /> {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)}
                              </span>
                              <span className="font-black text-amber-700 text-base">Rs {rule.price_per_hour}/hr</span>
                              {ground.price_per_hour && (
                                <span className="text-xs text-gray-400">
                                  {Math.round(((parseFloat(rule.price_per_hour) - parseFloat(ground.price_per_hour)) / parseFloat(ground.price_per_hour)) * 100)}%
                                  {parseFloat(rule.price_per_hour) > parseFloat(ground.price_per_hour) ? " more" : " less"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleRuleActive(rule)}
                              className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
                              Deactivate
                            </button>
                            <button onClick={() => { setEditingRule(rule); setShowPricingForm(false); }}
                              className="p-1.5 text-gray-400 hover:text-amber-600 rounded-lg transition">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive rules */}
                {inactiveRules.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-300 rounded-full" /> Inactive ({inactiveRules.length})
                    </p>
                    <div className="space-y-2">
                      {inactiveRules.map(rule => (
                        <div key={rule.id}
                          className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 opacity-60">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-700 text-sm">{rule.label}</p>
                            <p className="text-xs text-gray-400">
                              {DAY_LABELS[String(rule.day_of_week)]} · {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)} · Rs {rule.price_per_hour}/hr
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleRuleActive(rule)}
                              className="px-2.5 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition font-semibold">
                              Activate
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
                              className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rules.length === 0 && !showPricingForm && (
                  <div className="text-center py-10 text-gray-400">
                    <Tag size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No pricing rules yet</p>
                    <p className="text-sm mt-1">Add rules to charge more during peak hours</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2: Blocked Slots
        ══════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button
            onClick={() => setBlockingSection(v => !v)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <Ban size={20} className="text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-900">Blocked Slots</p>
                <p className="text-xs text-gray-500">{blocks.length} block{blocks.length !== 1 ? "s" : ""} · Close ground for events, maintenance, holidays</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeBlocks.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-bold">
                  🚫 {activeBlocks.length} active
                </span>
              )}
              {blockingSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </div>
          </button>

          {blockingSection && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="pt-5">
                {/* How it works */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-800">
                  <strong>How it works:</strong> Blocked slots prevent players from booking during
                  specified times. Choose a specific date (one-time) or a recurring weekday.
                  Block the full day or a custom hour range. Players see a "Unavailable" message.
                </div>

                {/* Form */}
                {(showBlockForm || editingBlock) && (
                  <BlockForm
                    groundId={ground.id}
                    block={editingBlock}
                    token={token}
                    onSave={handleBlockSaved}
                    onCancel={() => { setShowBlockForm(false); setEditingBlock(null); }}
                  />
                )}

                {/* Add button */}
                {!showBlockForm && !editingBlock && (
                  <button onClick={() => setShowBlockForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-xl text-sm font-bold hover:bg-red-200 transition mb-4">
                    <Plus size={16} /> Add Block
                  </button>
                )}

                {/* Active blocks */}
                {activeBlocks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full" /> Active Blocks ({activeBlocks.length})
                    </p>
                    <div className="space-y-3">
                      {activeBlocks.map(block => (
                        <div key={block.id}
                          className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {block.block_type === "date" ? (
                                <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
                                  <Calendar size={14} /> {block.blocked_date}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-sm font-bold text-gray-900">
                                  <RefreshCw size={14} /> Every {block.day_of_week_display}
                                </span>
                              )}
                              <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">
                                {block.is_full_day ? "Full Day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                              </span>
                            </div>
                            {block.reason && (
                              <p className="text-xs text-red-700 font-medium">📋 {block.reason}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleBlockActive(block)}
                              className="px-2.5 py-1 text-xs font-semibold border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition">
                              Deactivate
                            </button>
                            <button onClick={() => { setEditingBlock(block); setShowBlockForm(false); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive blocks */}
                {inactiveBlocks.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-300 rounded-full" /> Inactive ({inactiveBlocks.length})
                    </p>
                    <div className="space-y-2">
                      {inactiveBlocks.map(block => (
                        <div key={block.id}
                          className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3 opacity-60">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-700 text-sm">
                              {block.block_type === "date"
                                ? block.blocked_date
                                : `Every ${block.day_of_week_display}`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {block.is_full_day ? "Full Day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                              {block.reason ? ` · ${block.reason}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleBlockActive(block)}
                              className="px-2.5 py-1 text-xs bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition font-semibold">
                              Activate
                            </button>
                            <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                              className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg transition disabled:opacity-40">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {blocks.length === 0 && !showBlockForm && (
                  <div className="text-center py-10 text-gray-400">
                    <Ban size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No blocks set</p>
                    <p className="text-sm mt-1">Block specific dates or recurring days</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
