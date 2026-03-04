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
  }, [token]);

  const filteredGrounds = grounds.filter((g) => {
    if (filter === "approved") return g.is_approved;
    if (filter === "pending") return !g.is_approved;
    return true;
  });

  const total = grounds.length;
  const approved = grounds.filter((g) => g.is_approved).length;
  const pending = grounds.filter((g) => !g.is_approved).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black pt-28 px-8 pb-12 text-white">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold text-center mb-12">
          Admin Control Panel 🛠
        </h1>

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <StatCard title="Total Grounds" value={total} />
          <StatCard title="Approved" value={approved} color="green" />
          <StatCard title="Pending" value={pending} color="yellow" />
        </div>

        {/* FILTER */}
        <div className="flex justify-center gap-4 mb-10">
          <FilterButton text="All" active={filter==="all"} onClick={()=>setFilter("all")} />
          <FilterButton text="Approved" active={filter==="approved"} onClick={()=>setFilter("approved")} />
          <FilterButton text="Pending" active={filter==="pending"} onClick={()=>setFilter("pending")} />
        </div>

        {/* GROUNDS GRID */}
        <div className="grid md:grid-cols-3 gap-10">
          {filteredGrounds.map((ground) => (
            <div
              key={ground.id}
              onClick={() => navigate(`/admin/ground/${ground.id}`)}
              className="bg-white text-black rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 cursor-pointer group"
            >

              {/* IMAGE */}
              {ground.image ? (
                <img
                  src={
                    ground.image.startsWith("http")
                      ? ground.image
                      : `${BASE_URL}${ground.image}`
                  }
                  alt={ground.name}
                  className="h-56 w-full object-cover group-hover:scale-105 transition duration-300"
                />
              ) : (
                <div className="h-56 bg-gray-200 flex items-center justify-center">
                  No Image
                </div>
              )}

              {/* CONTENT */}
              <div className="p-6">
                <h2 className="text-xl font-bold">{ground.name}</h2>
                <p className="text-gray-500 mt-2">📍 {ground.location}</p>

                <div className="mt-4">
                  {ground.is_approved ? (
                    <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm">
                      Approved
                    </span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-700 px-4 py-1 rounded-full text-sm">
                      Pending
                    </span>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({ title, value, color }) {
  const bg =
    color === "green"
      ? "bg-green-100 text-green-800"
      : color === "yellow"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-white text-black";

  return (
    <div className={`${bg} rounded-2xl shadow-lg p-8 text-center`}>
      <h2 className="text-lg">{title}</h2>
      <p className="text-4xl font-bold mt-3">{value}</p>
    </div>
  );
}

function FilterButton({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl transition ${
        active
          ? "bg-black text-white"
          : "bg-white text-black hover:bg-gray-200"
      }`}
    >
      {text}
    </button>
  );
}