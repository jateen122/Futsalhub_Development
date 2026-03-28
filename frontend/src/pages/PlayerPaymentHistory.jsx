import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Calendar, Clock, IndianRupee, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const METHOD_CONFIG = {
  esewa: { 
    icon: CreditCard, 
    label: "eSewa",  
    color: "text-green-600",  
    bg: "bg-green-100",  
    border: "border-green-200"  
  },
  cash:  { 
    icon: IndianRupee, 
    label: "Cash",   
    color: "text-blue-600",   
    bg: "bg-blue-100",   
    border: "border-blue-200"   
  },
};

const STATUS_CONFIG = {
  success:  { 
    color: "text-emerald-700", 
    bg: "bg-emerald-100", 
    border: "border-emerald-200" 
  },
  failed:   { 
    color: "text-red-700",     
    bg: "bg-red-100",     
    border: "border-red-200"     
  },
  refunded: { 
    color: "text-amber-700",   
    bg: "bg-amber-100",   
    border: "border-amber-200"   
  },
};

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function PlayerPaymentHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!token) { 
      navigate("/login"); 
      return; 
    }
    fetch(`${BASE_URL}/api/payments/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { 
        setPayments(d.results || d || []); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" 
    ? payments 
    : payments.filter((p) => p.status === filter);

  const totalSpent = payments
    .filter((p) => p.status === "success")
    .reduce((s, p) => s + parseFloat(p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/player-dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition text-sm font-medium"
            >
              <ArrowLeft size={18} />
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <h1 className="text-2xl font-semibold text-gray-900">Payment History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-3xl p-8 shadow border border-gray-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center">
                <IndianRupee size={28} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 tracking-widest">TOTAL SPENT</p>
                <p className="text-4xl font-bold text-gray-900 tracking-tight">Rs {totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow border border-gray-100 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-emerald-600" />
            </div>
            <p className="text-4xl font-bold text-emerald-600">
              {payments.filter(p => p.status === "success").length}
            </p>
            <p className="text-gray-500 font-medium mt-1">Successful Payments</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow border border-gray-100 text-center">
            <div className="mx-auto w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-gray-600" />
            </div>
            <p className="text-4xl font-bold text-gray-900">{payments.length}</p>
            <p className="text-gray-500 font-medium mt-1">Total Transactions</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-3xl shadow-sm w-fit">
          {["all", "success", "failed", "refunded"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-8 py-3 rounded-2xl font-semibold capitalize transition-all text-sm
                ${filter === f 
                  ? "bg-yellow-500 text-white shadow" 
                  : "bg-transparent hover:bg-gray-100 text-gray-600"}`}
            >
              {f === "all" ? "All Transactions" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 mt-4">Loading payment history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl py-24 text-center shadow">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard size={42} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800">No payments found</h3>
            <p className="text-gray-500 mt-2">You haven’t made any payments yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => {
              const mCfg = METHOD_CONFIG[p.payment_method] || METHOD_CONFIG.cash;
              const sCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.success;
              const isOpen = expanded === p.id;
              const MethodIcon = mCfg.icon;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow overflow-hidden hover:shadow-xl transition-all"
                >
                  <div 
                    className="p-6 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 ${mCfg.bg} ${mCfg.border} border rounded-2xl flex items-center justify-center`}>
                        <MethodIcon size={28} className={mCfg.color} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-lg truncate">{p.ground_name}</p>
                        <p className="text-gray-400 text-sm font-mono mt-0.5">{p.transaction_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-2xl font-bold text-emerald-600">Rs {p.amount}</p>
                        <span className={`inline-block px-4 py-1 text-xs font-bold rounded-2xl border ${sCfg.color} ${sCfg.bg} ${sCfg.border}`}>
                          {p.status}
                        </span>
                      </div>

                      {isOpen ? 
                        <ChevronUp size={22} className="text-gray-400" /> : 
                        <ChevronDown size={22} className="text-gray-400" />
                      }
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-6 py-6 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10 text-sm">
                      {[
                        ["Date", p.booking_date],
                        ["Time", `${fmt12(p.booking_start_time)} – ${fmt12(p.booking_end_time)}`],
                        ["Payment Method", p.payment_method_display || mCfg.label],
                        ["Paid At", new Date(p.paid_at).toLocaleString()],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between md:block">
                          <p className="text-gray-500 font-medium">{label}</p>
                          <p className="text-gray-800 font-semibold mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}