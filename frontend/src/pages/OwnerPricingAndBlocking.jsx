// frontend/src/pages/OwnerPricingAndBlocking.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Edit3, Clock, DollarSign, Ban,
  RefreshCw, Tag, ChevronDown, ChevronUp, MapPin,
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const DAY_LABELS = {
  "-1": "All Days", "0": "Monday", "1": "Tuesday", "2": "Wednesday",
  "3": "Thursday", "4": "Friday", "5": "Saturday", "6": "Sunday",
};

const DAY_OPTIONS = [
  { value: 0, label: "Monday" }, { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" }, { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" }, { value: 5, label: "Saturday" },
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

const SELECT_CLS = "w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 bg-white";
const INPUT_CLS  = "w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400";

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-xl
      text-sm font-semibold whitespace-nowrap border transition-all
      ${type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
      {msg}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, toggle, isOpen }) {
  return (
    <button onClick={toggle}
      className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition rounded-t-3xl">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600">
          {icon}
        </div>
        <div className="text-left">
          <p className="font-bold text-gray-900 text-xl">{title}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

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
          start_hour:     parseInt(form.start_hour, 10),
          end_hour:       parseInt(form.end_hour, 10),
          price_per_hour: parseFloat(form.price_per_hour),
          rule_type:      ruleType,
        }),
      });
      const data = await res.json();
      if (res.ok) onSave(data.rule || data);
      else setErrors(data);
    } catch { setErrors({ api: "Network error." }); }
    finally   { setSaving(false); }
  };

  const bgCls  = isPeak ? "bg-yellow-50 border-yellow-300" : "bg-blue-50 border-blue-300";
  const btnCls = isPeak ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-blue-500 hover:bg-blue-600 text-white";

  const discount = basePrice && form.price_per_hour && !isPeak
    ? Math.round(((parseFloat(basePrice) - parseFloat(form.price_per_hour)) / parseFloat(basePrice)) * 100)
    : null;
  const premium  = basePrice && form.price_per_hour && isPeak
    ? Math.round(((parseFloat(form.price_per_hour) - parseFloat(basePrice)) / parseFloat(basePrice)) * 100)
    : null;

  return (
    <div className={`border-2 rounded-3xl p-8 mb-8 ${bgCls}`}>
      <h3 className="font-bold text-xl text-gray-900 mb-2">
        {rule ? `Edit ${isPeak ? "Peak" : "Off-Peak"} Rule` : `New ${isPeak ? "Peak Pricing" : "Off-Peak Discount"} Rule`}
      </h3>
      <p className={`text-sm mb-6 ${isPeak ? "text-amber-700" : "text-blue-700"}`}>
        {isPeak
          ? `🔥 Set a higher price during busy hours. Base is Rs ${basePrice}/hr.`
          : `💰 Set a discounted price during slow hours. Must be less than Rs ${basePrice}/hr.`}
      </p>
      {errors.api && <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm mb-6">{errors.api}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">APPLY ON</label>
            <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} className={SELECT_CLS}>
              {Object.entries(DAY_LABELS).map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">RULE LABEL</label>
            <input type="text" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={isPeak ? "Evening Peak" : "Morning Discount"}
              className={`${INPUT_CLS} ${errors.label ? "border-red-400" : ""}`} />
            {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">START TIME</label>
            <select value={form.start_hour} onChange={(e) => setForm((f) => ({ ...f, start_hour: parseInt(e.target.value, 10) }))} className={SELECT_CLS}>
              {HOUR_OPTIONS.slice(0, 24).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">END TIME</label>
            <select value={form.end_hour} onChange={(e) => setForm((f) => ({ ...f, end_hour: parseInt(e.target.value, 10) }))}
              className={`${SELECT_CLS} ${errors.end_hour ? "border-red-400" : ""}`}>
              {HOUR_OPTIONS.slice(1).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            {errors.end_hour && <p className="text-red-500 text-xs mt-1">{errors.end_hour}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 mb-2">
              {isPeak ? "PEAK" : "OFF-PEAK"} PRICE PER HOUR (Rs)
            </label>
            <div className={`flex border rounded-2xl overflow-hidden ${errors.price_per_hour ? "border-red-400" : "border-gray-200"}`}>
              <span className="px-4 py-3 bg-gray-50 text-gray-500 text-sm font-semibold border-r border-gray-200">Rs</span>
              <input type="number" min="1" step="0.01" value={form.price_per_hour}
                onChange={(e) => setForm((f) => ({ ...f, price_per_hour: e.target.value }))}
                placeholder={isPeak ? "2000" : "800"} className="flex-1 px-4 py-3 text-sm focus:outline-none" />
              {basePrice && form.price_per_hour && (
                <span className={`px-4 py-3 text-sm font-bold border-l border-gray-200
                  ${isPeak
                    ? premium > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-400"
                    : discount > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-500"}`}>
                  {isPeak
                    ? premium != null ? (premium > 0 ? `+${premium}%` : `${premium}%`) : ""
                    : discount != null ? (discount > 0 ? `-${discount}%` : `+${Math.abs(discount)}%`) : ""}
                </span>
              )}
            </div>
            {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">{errors.price_per_hour}</p>}
            {basePrice && <p className="text-gray-400 text-xs mt-1">Base price: Rs {basePrice}/hr</p>}
          </div>
          <div className="flex items-center gap-4">
            <button type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.is_active ? (isPeak ? "bg-yellow-400" : "bg-blue-400") : "bg-gray-200"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-base font-semibold text-gray-700">{form.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button type="button" onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition text-base">Cancel</button>
          <button type="submit" disabled={saving} className={`flex-1 py-4 font-semibold rounded-2xl transition text-base ${btnCls}`}>
            {saving ? "Saving…" : rule ? "Update Rule" : "Create Rule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function BlockForm({ groundId, block, onSave, onCancel, token }) {
  const [form, setForm] = useState({
    block_type:   block?.block_type   ?? "date",
    blocked_date: block?.blocked_date ?? "",
    day_of_week:  block?.day_of_week  ?? 0,
    full_day:     block ? block.start_hour == null : true,
    start_hour:   block?.start_hour   ?? 8,
    end_hour:     block?.end_hour     ?? 22,
    reason:       block?.reason       ?? "",
    is_active:    block?.is_active    ?? true,
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
      block_type: form.block_type, reason: form.reason, is_active: form.is_active,
      start_hour: form.full_day ? null : parseInt(form.start_hour, 10),
      end_hour:   form.full_day ? null : parseInt(form.end_hour, 10),
    };
    if (form.block_type === "date")      payload.blocked_date = form.blocked_date;
    if (form.block_type === "recurring") payload.day_of_week  = parseInt(form.day_of_week, 10);

    const url    = block ? `${BASE_URL}/api/grounds/${groundId}/blocks/${block.id}/` : `${BASE_URL}/api/grounds/${groundId}/blocks/`;
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
    } catch { setErrors({ api: "Network error." }); }
    finally   { setSaving(false); }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-8 mb-8">
      <h3 className="font-bold text-xl text-gray-900 mb-6">{block ? "Edit Blocked Slot" : "Block a Slot"}</h3>
      {errors.api && <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm mb-6">{errors.api}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 mb-2">BLOCK TYPE</label>
            <div className="flex gap-3">
              {[{ value: "date", label: "Specific Date" }, { value: "recurring", label: "Recurring Weekday" }].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, block_type: opt.value }))}
                  className={`flex-1 py-4 rounded-2xl border-2 font-semibold transition text-sm
                    ${form.block_type === opt.value ? "border-red-500 bg-red-100 text-red-700" : "border-gray-200 bg-white hover:border-red-300"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.block_type === "date" ? (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">DATE TO BLOCK</label>
              <input type="date" min={todayStr} value={form.blocked_date}
                onChange={(e) => setForm((f) => ({ ...f, blocked_date: e.target.value }))}
                className={`${INPUT_CLS} ${errors.blocked_date ? "border-red-400" : ""}`} />
              {errors.blocked_date && <p className="text-red-500 text-xs mt-1">{errors.blocked_date}</p>}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">DAY OF WEEK</label>
              <select value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))} className={SELECT_CLS}>
                {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">REASON (shown to players)</label>
            <input type="text" value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Maintenance, Private event..." className={INPUT_CLS} />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-4">
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, full_day: !f.full_day }))}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.full_day ? "bg-red-500" : "bg-gray-200"}`}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.full_day ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-base font-semibold text-gray-700">
                {form.full_day ? "Block Full Day" : "Block Specific Hours"}
              </span>
            </div>
            {!form.full_day && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">FROM</label>
                  <select value={form.start_hour}
                    onChange={(e) => setForm((f) => ({ ...f, start_hour: parseInt(e.target.value, 10) }))}
                    className={SELECT_CLS}>
                    {HOUR_OPTIONS.slice(0, 24).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">TO</label>
                  <select value={form.end_hour}
                    onChange={(e) => setForm((f) => ({ ...f, end_hour: parseInt(e.target.value, 10) }))}
                    className={`${SELECT_CLS} ${errors.end_hour ? "border-red-400" : ""}`}>
                    {HOUR_OPTIONS.slice(1).map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                  </select>
                  {errors.end_hour && <p className="text-red-500 text-xs mt-1">{errors.end_hour}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button type="button" onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition text-base">Cancel</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition text-base">
            {saving ? "Saving…" : block ? "Update Block" : "Create Block"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function OwnerPricingAndBlocking() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,        setGround]        = useState(null);
  const [rules,         setRules]         = useState([]);
  const [blocks,        setBlocks]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState({ msg: "", type: "" });
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [pricingFormType, setPricingFormType] = useState("peak");
  const [editingRule,   setEditingRule]   = useState(null);
  const [deletingRule,  setDeletingRule]  = useState(null);
  const [pricingSection, setPricingSection] = useState(true);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlock,  setEditingBlock]  = useState(null);
  const [deletingBlock, setDeletingBlock] = useState(null);
  const [blockingSection, setBlockingSection] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  };

  const fetchData = async () => {
    if (!token) { navigate("/login"); return; }
    try {
      const gRes = await fetch(`${BASE_URL}/api/grounds/my/`, { headers: { Authorization: `Bearer ${token}` } });
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
      setRules(pData.rules || []);
      setBlocks(bData.blocks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRuleSaved = (rule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === rule.id);
      return exists ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule];
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
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast("Pricing rule deleted.");
    } finally { setDeletingRule(null); }
  };

  const toggleRuleActive = async (rule) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${rule.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? (data.rule || data) : r)));
        showToast(rule.is_active ? "Rule deactivated." : "Rule activated!");
      }
    } catch {}
  };

  const handleBlockSaved = (block) => {
    setBlocks((prev) => {
      const exists = prev.find((b) => b.id === block.id);
      return exists ? prev.map((b) => (b.id === block.id ? block : b)) : [...prev, block];
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
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      showToast("Block removed.");
    } finally { setDeletingBlock(null); }
  };

  const toggleBlockActive = async (block) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/blocks/${block.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !block.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlocks((prev) => prev.map((b) => (b.id === block.id ? (data.block || data) : b)));
        showToast(block.is_active ? "Block deactivated." : "Block activated!");
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <Tag size={64} className="mx-auto mb-6 text-amber-400" />
          <h2 className="text-3xl font-bold text-gray-900 mb-3">No Ground Found</h2>
          <p className="text-gray-500 mb-8">Register a ground first to manage pricing & blocking.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-4 bg-yellow-500 text-white font-bold rounded-2xl hover:bg-yellow-600 transition text-lg">
            Add Ground
          </button>
        </div>
      </div>
    );
  }

  const peakRules        = rules.filter((r) => r.rule_type !== "off_peak");
  const offPeakRules     = rules.filter((r) => r.rule_type === "off_peak");
  const activePeakRules  = peakRules.filter((r) => r.is_active);
  const inactivePeakRules = peakRules.filter((r) => !r.is_active);
  const activeOffPeakRules = offPeakRules.filter((r) => r.is_active);
  const inactiveOffPeakRules = offPeakRules.filter((r) => !r.is_active);
  const activeBlocks     = blocks.filter((b) => b.is_active);
  const inactiveBlocks   = blocks.filter((b) => !b.is_active);

  const RuleCard = ({ rule }) => {
    const isPeak = rule.rule_type !== "off_peak";
    return (
      <div className={`border-2 rounded-2xl p-6 flex items-center justify-between
        ${isPeak ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-gray-900">{rule.label}</span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium
              ${isPeak ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"}`}>
              {DAY_LABELS[String(rule.day_of_week)]}
            </span>
            {isPeak
              ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">🔥 Peak</span>
              : <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">💰 Off-Peak</span>}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)} · Rs {rule.price_per_hour}/hr
            {ground?.price_per_hour && (
              <span className={`ml-2 text-xs font-bold ${isPeak ? "text-amber-600" : "text-blue-600"}`}>
                ({parseFloat(rule.price_per_hour) > parseFloat(ground.price_per_hour)
                  ? `+${Math.round(((parseFloat(rule.price_per_hour) - parseFloat(ground.price_per_hour)) / parseFloat(ground.price_per_hour)) * 100)}%`
                  : `-${Math.round(((parseFloat(ground.price_per_hour) - parseFloat(rule.price_per_hour)) / parseFloat(ground.price_per_hour)) * 100)}%`})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleRuleActive(rule)}
            className="px-4 py-2 text-xs font-semibold border border-gray-300 text-gray-600 rounded-2xl hover:bg-gray-100 transition">
            Deactivate
          </button>
          <button onClick={() => { setEditingRule(rule); setShowPricingForm(false); setPricingFormType(rule.rule_type || "peak"); }}
            className="px-3 py-2 text-gray-500 hover:text-amber-600 transition"><Edit3 size={18} /></button>
          <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
            className="px-3 py-2 text-gray-500 hover:text-red-600 transition"><Trash2 size={18} /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20 pb-16">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/owner-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium">
              <ArrowLeft size={18} />Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-semibold">Pricing &amp; Availability</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/owner-analytics")}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-100 transition">
              📊 View Analytics
            </button>
            <button onClick={fetchData}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition">
              <RefreshCw size={16} />Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Ground Header */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-4xl">🏟️</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{ground.name}</h1>
              <p className="text-gray-500 flex items-center gap-1 mt-1"><MapPin size={18} />{ground.location}</p>
              <p className="text-emerald-600 font-semibold mt-2">Base rate: Rs {ground.price_per_hour}/hr</p>
            </div>
            <div className={`px-5 py-2 rounded-3xl text-sm font-bold border
              ${ground.is_approved ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-amber-100 border-amber-200 text-amber-700"}`}>
              {ground.is_approved ? "LIVE" : "PENDING"}
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm mb-10 overflow-hidden">
          <SectionHeader
            icon={<DollarSign size={24} />}
            title="Dynamic Pricing Rules"
            subtitle={`${rules.length} rule${rules.length !== 1 ? "s" : ""} · Peak surcharges & off-peak discounts`}
            toggle={() => setPricingSection((v) => !v)}
            isOpen={pricingSection}
          />

          {pricingSection && (
            <div className="px-8 pb-8 border-t border-gray-100 pt-6">
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                  <p className="font-bold mb-1">🔥 Peak Pricing</p>
                  <p>Override base price with a higher rate during busy hours.</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
                  <p className="font-bold mb-1">💰 Off-Peak Discount</p>
                  <p>Offer a lower rate during slow hours to attract more bookings.</p>
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
                <div className="flex gap-3 mb-8">
                  <button onClick={() => { setPricingFormType("peak"); setShowPricingForm(true); }}
                    className="flex items-center gap-2 px-5 py-3.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-2xl text-sm font-bold hover:bg-amber-200 transition">
                    <Plus size={18} />🔥 Add Peak Rule
                  </button>
                  <button onClick={() => { setPricingFormType("off_peak"); setShowPricingForm(true); }}
                    className="flex items-center gap-2 px-5 py-3.5 bg-blue-100 text-blue-700 border border-blue-300 rounded-2xl text-sm font-bold hover:bg-blue-200 transition">
                    <Plus size={18} />💰 Add Off-Peak Discount
                  </button>
                </div>
              )}

              {activePeakRules.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-3">🔥 ACTIVE PEAK RULES</p>
                  <div className="space-y-3">{activePeakRules.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
                </div>
              )}

              {activeOffPeakRules.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">💰 ACTIVE OFF-PEAK DISCOUNTS</p>
                  <div className="space-y-3">{activeOffPeakRules.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
                </div>
              )}

              {(inactivePeakRules.length > 0 || inactiveOffPeakRules.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">INACTIVE RULES</p>
                  <div className="space-y-3">
                    {[...inactivePeakRules, ...inactiveOffPeakRules].map((rule) => (
                      <div key={rule.id} className="border border-gray-200 bg-gray-50 rounded-2xl p-5 flex items-center justify-between opacity-60">
                        <div>
                          <p className="font-semibold text-gray-700">{rule.label}
                            <span className="ml-2 text-xs text-gray-400">({rule.rule_type === "off_peak" ? "off-peak" : "peak"})</span>
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {DAY_LABELS[String(rule.day_of_week)]} · {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)} · Rs {rule.price_per_hour}/hr
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleRuleActive(rule)}
                            className="px-4 py-2 text-xs font-semibold border border-green-300 text-green-600 rounded-2xl hover:bg-green-50 transition">
                            Activate
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} disabled={deletingRule === rule.id}
                            className="px-3 py-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blocking Section */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={<Ban size={24} />}
            title="Blocked Slots"
            subtitle={`${blocks.length} block${blocks.length !== 1 ? "s" : ""} · Prevent bookings during maintenance or events`}
            toggle={() => setBlockingSection((v) => !v)}
            isOpen={blockingSection}
          />

          {blockingSection && (
            <div className="px-8 pb-8 border-t border-gray-100 pt-6">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 text-sm text-red-800">
                Blocked slots prevent players from booking. Players will see the slot as unavailable.
              </div>

              {(showBlockForm || editingBlock) && (
                <BlockForm
                  groundId={ground.id} block={editingBlock} token={token}
                  onSave={handleBlockSaved}
                  onCancel={() => { setShowBlockForm(false); setEditingBlock(null); }}
                />
              )}

              {!showBlockForm && !editingBlock && (
                <button onClick={() => setShowBlockForm(true)}
                  className="flex items-center gap-2 px-6 py-4 bg-red-100 text-red-700 border border-red-300 rounded-2xl text-sm font-bold hover:bg-red-200 transition mb-6">
                  <Plus size={18} />Add Blocked Slot
                </button>
              )}

              {activeBlocks.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">ACTIVE BLOCKS</p>
                  <div className="space-y-4">
                    {activeBlocks.map((block) => (
                      <div key={block.id} className="border border-red-200 bg-red-50 rounded-2xl p-6 flex items-center justify-between">
                        <div>
                          {block.block_type === "date"
                            ? <p className="font-semibold text-gray-900">{block.blocked_date}</p>
                            : <p className="font-semibold text-gray-900">Every {DAY_LABELS[block.day_of_week]}</p>}
                          <p className="text-sm text-gray-600 mt-1">
                            {block.is_full_day ? "Full day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                            {block.reason && ` · ${block.reason}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleBlockActive(block)}
                            className="px-4 py-2 text-xs font-semibold border border-gray-300 text-gray-600 rounded-2xl hover:bg-gray-50 transition">
                            Deactivate
                          </button>
                          <button onClick={() => { setEditingBlock(block); setShowBlockForm(false); }}
                            className="px-3 py-2 text-gray-400 hover:text-amber-600 transition"><Edit3 size={18} /></button>
                          <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                            className="px-3 py-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {inactiveBlocks.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">INACTIVE BLOCKS</p>
                  <div className="space-y-4">
                    {inactiveBlocks.map((block) => (
                      <div key={block.id} className="border border-gray-200 bg-gray-50 rounded-2xl p-6 flex items-center justify-between opacity-70">
                        <div>
                          {block.block_type === "date"
                            ? <p className="font-semibold text-gray-900">{block.blocked_date}</p>
                            : <p className="font-semibold text-gray-900">Every {DAY_LABELS[block.day_of_week]}</p>}
                          <p className="text-sm text-gray-600 mt-1">
                            {block.is_full_day ? "Full day" : `${fmtHour(block.start_hour)} – ${fmtHour(block.end_hour)}`}
                            {block.reason && ` · ${block.reason}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleBlockActive(block)}
                            className="px-4 py-2 text-xs font-semibold border border-green-300 text-green-600 rounded-2xl hover:bg-green-50 transition">
                            Activate
                          </button>
                          <button onClick={() => handleDeleteBlock(block.id)} disabled={deletingBlock === block.id}
                            className="px-3 py-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
