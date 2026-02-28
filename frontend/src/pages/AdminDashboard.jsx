import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const [grounds, setGrounds] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/grounds/admin/all/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.results) setGrounds(data.results);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 pt-24 p-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Admin Panel 🛠
      </h1>

      <div className="grid md:grid-cols-3 gap-6">
        {grounds.map((ground) => (
          <div
            key={ground.id}
            onClick={() => navigate(`/admin/ground/${ground.id}`)}
            className="bg-white shadow-lg rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition"
          >
            {ground.image && (
              <img
                src={`http://127.0.0.1:8000${ground.image}`}
                alt="ground"
                className="w-full h-48 object-cover"
              />
            )}

            <div className="p-4">
              <h2 className="text-xl font-semibold">
                {ground.name}
              </h2>

              <p className="text-gray-600">
                📍 {ground.location}
              </p>

              <p className="mt-2">
                {ground.is_approved ? (
                  <span className="text-green-600 font-semibold">
                    Approved
                  </span>
                ) : (
                  <span className="text-yellow-600 font-semibold">
                    Pending
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}