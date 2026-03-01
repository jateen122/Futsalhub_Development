import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminDashboard() {
  const token = localStorage.getItem("access");
  const navigate = useNavigate();

  const [grounds, setGrounds] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/admin/all/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("ADMIN RESPONSE:", data);

        // 🔥 FIX: Handle pagination properly
        if (Array.isArray(data)) {
          setGrounds(data);
        } else if (data.results) {
          setGrounds(data.results);
        } else {
          setGrounds([]);
        }
      })
      .catch((err) => {
        console.error("Admin fetch error:", err);
        setGrounds([]);
      });
  }, []);

  // ==========================
  // FILTER SAFE (NO CRASH)
  // ==========================
  const filteredGrounds = grounds.filter((g) => {
    if (filter === "approved") return g.is_approved;
    if (filter === "pending") return !g.is_approved;
    return true;
  });

  const total = grounds.length;
  const approved = grounds.filter((g) => g.is_approved).length;
  const pending = grounds.filter((g) => !g.is_approved).length;

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-10 pb-10">

      <h1 className="text-4xl font-bold text-center mb-10">
        Admin Control Panel 🛠
      </h1>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <StatCard title="Total" value={total} />
        <StatCard title="Approved" value={approved} color="green" />
        <StatCard title="Pending" value={pending} color="yellow" />
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex justify-center gap-4 mb-8">
        <FilterButton text="All" active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterButton text="Approved" active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <FilterButton text="Pending" active={filter==="pending"} onClick={()=>setFilter("pending")} />
      </div>

      {/* GROUNDS */}
      <div className="grid md:grid-cols-3 gap-8">
        {filteredGrounds.map((ground) => (
          <div
            key={ground.id}
            onClick={() => navigate(`/admin/ground/${ground.id}`)}
            className="bg-white shadow hover:shadow-xl transition rounded-xl overflow-hidden cursor-pointer"
          >
            {ground.image ? (
              <img
                src={`${BASE_URL}${ground.image}`}
                alt={ground.name}
                className="h-52 w-full object-cover"
              />
            ) : (
              <div className="h-52 bg-gray-200 flex items-center justify-center">
                No Image
              </div>
            )}

            <div className="p-5">
              <h2 className="text-xl font-semibold">{ground.name}</h2>
              <p className="text-gray-500 mt-1">📍 {ground.location}</p>

              <div className="mt-3">
                {ground.is_approved ? (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    Approved
                  </span>
                ) : (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                    Pending
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ title, value, color }) {
  const bg =
    color === "green"
      ? "bg-green-100"
      : color === "yellow"
      ? "bg-yellow-100"
      : "bg-white";

  return (
    <div className={`${bg} shadow rounded-xl p-6 text-center`}>
      <h2 className="text-gray-600">{title}</h2>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}

function FilterButton({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded ${
        active ? "bg-black text-white" : "bg-white shadow"
      }`}
    >
      {text}
    </button>
  );
}