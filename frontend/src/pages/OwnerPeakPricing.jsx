// frontend/src/pages/OwnerPeakPricing.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Plus, Trash2, Edit3, ArrowLeft, Clock, DollarSign } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

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

const HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const ampm = i >= 12 ? "PM" : "AM";
  const h12  = i % 12 === 0 ? 12 : i % 12;
  return { value: i, label: `${h12}:00 ${ampm}` };
});

function RuleForm({ groundId, rule, onSave, onCancel }) {
  const token = localStorage.getItem("access");
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
    if (form.start_hour >= form.end_hour) e.end_hour = "End hour must be after start hour.";
    if (!form.price_per_hour || parseFloat(form.price_per_hour) <= 0) e.price_per_hour = "Enter a valid price.";
    if (!form.label.trim()) e.label = "Label is required.";
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
        body:    JSON.stringify({
          ...form,
          day_of_week:    parseInt(form.day_of_week, 10),
          start_hour:     parseInt(form.start_hour,  10),
          end_hour:       parseInt(form.end_hour,    10),
          price_per_hour: parseFloat(form.price_per_hour),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSave(data.rule || data);
      } else {
        setErrors(data);
      }
    } catch {
      setErrors({ api: "Network error." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl border-2 border-amber-300 p-8 shadow-lg">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        {rule ? "Edit Pricing Rule" : "New Pricing Rule"}
      </h3>

      {errors.api && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-5 text-sm">
          {errors.api}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">

        {/* Day of week */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Apply On</label>
          <select
            value={form.day_of_week}
            onChange={(e) => setForm(f => ({ ...f, day_of_week: e.target.value }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-400"
          >
            {Object.entries(DAY_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rule Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="e.g. Evening Peak, Weekend Rate"
            className={`w-full border rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-400 ${errors.label ? "border-red-400" : "border-gray-200"}`}
          />
          {errors.label && <p className="text-red-500 text-xs mt-1">⚠ {errors.label}</p>}
        </div>

        {/* Start hour */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Peak Start Time</label>
          <select
            value={form.start_hour}
            onChange={(e) => setForm(f => ({ ...f, start_hour: parseInt(e.target.value, 10) }))}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-400"
          >
            {HOUR_OPTIONS.slice(0, 24).map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>

        {/* End hour */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Peak End Time</label>
          <select
            value={form.end_hour}
            onChange={(e) => setForm(f => ({ ...f, end_hour: parseInt(e.target.value, 10) }))}
            className={`w-full border rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-400 ${errors.end_hour ? "border-red-400" : "border-gray-200"}`}
          >
            {HOUR_OPTIONS.slice(1).map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          {errors.end_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.end_hour}</p>}
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Peak Price per Hour (Rs)</label>
          <div className={`flex border rounded-2xl overflow-hidden focus-within:border-amber-400 ${errors.price_per_hour ? "border-red-400" : "border-gray-200"}`}>
            <span className="px-4 py-3 bg-gray-50 text-gray-500 font-medium border-r border-gray-200">Rs</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.price_per_hour}
              onChange={(e) => setForm(f => ({ ...f, price_per_hour: e.target.value }))}
              placeholder="2000"
              className="flex-1 px-4 py-3 focus:outline-none"
            />
          </div>
          {errors.price_per_hour && <p className="text-red-500 text-xs mt-1">⚠ {errors.price_per_hour}</p>}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors
              ${form.is_active ? "bg-amber-400" : "bg-gray-200"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform
              ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {form.is_active ? "Rule is active" : "Rule is inactive"}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-2xl transition disabled:opacity-50">
          {saving ? "Saving…" : rule ? "Update Rule" : "Create Rule"}
        </button>
      </div>
    </form>
  );
}

export default function OwnerPeakPricing() {
  const navigate = useNavigate();
  const token    = localStorage.getItem("access");

  const [ground,       setGround]       = useState(null);
  const [rules,        setRules]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editingRule,  setEditingRule]  = useState(null);
  const [deleting,     setDeleting]     = useState(null);
  const [toast,        setToast]        = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchData = async () => {
    if (!token) { navigate("/login"); return; }

    // Get owner's ground first
    const gRes  = await fetch(`${BASE_URL}/api/grounds/my/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const gData = await gRes.json();
    const myGrounds = gData.results || gData || [];
    if (myGrounds.length === 0) { setLoading(false); return; }
    const g = myGrounds[0];
    setGround(g);

    // Get pricing rules
    const pRes  = await fetch(`${BASE_URL}/api/grounds/${g.id}/pricing/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pData = await pRes.json();
    setRules(pData.rules || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaved = (rule) => {
    setRules((prev) => {
      const exists = prev.find((r) => r.id === rule.id);
      if (exists) return prev.map((r) => r.id === rule.id ? rule : r);
      return [...prev, rule];
    });
    setShowForm(false);
    setEditingRule(null);
    showToast(editingRule ? "Rule updated!" : "Rule created!");
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm("Delete this pricing rule?")) return;
    setDeleting(ruleId);
    try {
      await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${ruleId}/`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast("Rule deleted.");
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (rule) => {
    try {
      const res  = await fetch(`${BASE_URL}/api/grounds/${ground.id}/pricing/${rule.id}/`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ is_active: !rule.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? (data.rule || data) : r));
        showToast(data.rule?.is_active ? "Rule activated." : "Rule deactivated.");
      }
    } catch {}
  };

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
          <p className="text-gray-500 mb-6">You need to register a ground first.</p>
          <button onClick={() => navigate("/add-ground")}
            className="px-8 py-3 bg-amber-400 text-black font-bold rounded-2xl hover:bg-amber-500 transition">
            Add Ground
          </button>
        </div>
      </div>
    );
  }

  const activeRules  = rules.filter((r) => r.is_active);
  const inactiveRules = rules.filter((r) => !r.is_active);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">

      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-white border border-amber-300 text-amber-700 px-6 py-3 rounded-2xl shadow-xl text-sm font-semibold whitespace-nowrap">
          ✅ {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/owner-dashboard")}
            className="text-gray-400 hover:text-gray-700 text-sm font-medium transition flex items-center gap-1">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-semibold text-sm">Dynamic Pricing</span>
        </div>

        {!showForm && !editingRule && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-black font-bold rounded-2xl hover:bg-amber-500 transition text-sm"
          >
            <Plus size={18} /> Add Rule
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Ground info */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-7 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Tag size={24} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
              <p className="text-gray-500 text-sm">{ground.name} · Base price: Rs {ground.price_per_hour}/hr</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 text-sm leading-relaxed">
              <strong>How it works:</strong> Peak pricing rules override the base price during specified hours.
              When players book during a peak window, they'll see the peak rate clearly on the booking page.
              Off-peak slots always use your base price of Rs {ground.price_per_hour}/hr.
            </p>
          </div>
        </div>

        {/* Form */}
        {(showForm || editingRule) && (
          <div className="mb-8">
            <RuleForm
              groundId={ground.id}
              rule={editingRule}
              onSave={handleSaved}
              onCancel={() => { setShowForm(false); setEditingRule(null); }}
            />
          </div>
        )}

        {/* Active rules */}
        {activeRules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded-full" />
              Active Rules ({activeRules.length})
            </h2>
            <div className="space-y-4">
              {activeRules.map((rule) => (
                <div key={rule.id}
                  className="bg-white rounded-2xl border-2 border-amber-200 p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-black text-lg text-gray-900">{rule.label}</span>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                          🔥 Active
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
                          {DAY_LABELS[String(rule.day_of_week)] || "All Days"}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm flex-wrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock size={15} />
                          <span className="font-medium">
                            {HOUR_OPTIONS[rule.start_hour]?.label} – {HOUR_OPTIONS[rule.end_hour]?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <DollarSign size={15} />
                          <span className="font-black text-lg">Rs {rule.price_per_hour}/hr</span>
                        </div>
                        {ground.price_per_hour && (
                          <span className="text-xs text-gray-400">
                            Base: Rs {ground.price_per_hour}/hr
                            · {Math.round(((parseFloat(rule.price_per_hour) - parseFloat(ground.price_per_hour)) / parseFloat(ground.price_per_hour)) * 100)}% {parseFloat(rule.price_per_hour) > parseFloat(ground.price_per_hour) ? "more" : "less"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(rule)}
                        className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition"
                      >
                        Deactivate
                      </button>
                      <button
                        onClick={() => { setEditingRule(rule); setShowForm(false); }}
                        className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleting === rule.id}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive rules */}
        {inactiveRules.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-300 rounded-full" />
              Inactive Rules ({inactiveRules.length})
            </h2>
            <div className="space-y-3">
              {inactiveRules.map((rule) => (
                <div key={rule.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-700">{rule.label}</p>
                      <p className="text-sm text-gray-400">
                        {DAY_LABELS[String(rule.day_of_week)]} · {HOUR_OPTIONS[rule.start_hour]?.label} – {HOUR_OPTIONS[rule.end_hour]?.label} · Rs {rule.price_per_hour}/hr
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(rule)}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-xl hover:bg-green-100 transition"
                      >
                        Activate
                      </button>
                      <button onClick={() => handleDelete(rule.id)} disabled={deleting === rule.id}
                        className="p-2 text-gray-300 hover:text-red-400 rounded-xl transition disabled:opacity-40">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {rules.length === 0 && !showForm && (
          <div className="bg-white rounded-3xl py-24 text-center shadow border border-gray-100">
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Tag size={42} className="text-amber-300" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800">No pricing rules yet</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Set peak and off-peak rates to maximize revenue during busy hours.
            </p>
            <button onClick={() => setShowForm(true)}
              className="mt-8 px-8 py-4 bg-amber-400 text-black font-bold rounded-2xl hover:bg-amber-500 transition flex items-center gap-2 mx-auto">
              <Plus size={20} /> Create First Rule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
