import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

export default function AdminGroundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("access");

  const [ground, setGround] = useState(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/admin/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setGround(data))
      .catch((err) => console.error(err));
  }, [id, token]);

  const handleApproval = (status) => {
    fetch(`${BASE_URL}/api/grounds/${id}/approve/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_approved: status }),
    })
      .then(() => navigate("/admin-dashboard"));
  };

  if (!ground) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black pt-28 px-6 pb-12">

      <div className="max-w-5xl mx-auto bg-white text-black rounded-3xl shadow-2xl overflow-hidden">

        {/* IMAGE */}
        {ground.image && (
          <img
            src={
              ground.image.startsWith("http")
                ? ground.image
                : `${BASE_URL}${ground.image}`
            }
            alt={ground.name}
            className="w-full h-[450px] object-cover"
          />
        )}

        {/* CONTENT */}
        <div className="p-10">
          <h1 className="text-3xl font-bold mb-4">
            {ground.name}
          </h1>

          <p className="text-gray-600 mb-2">
            📍 {ground.location}
          </p>

          <p className="text-lg font-semibold mb-4">
            Rs {ground.price_per_hour} / hour
          </p>

          <p className="text-gray-700 mb-6">
            {ground.description}
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Owner: {ground.owner}
          </p>

          {/* ACTION BUTTONS */}
          <div className="flex gap-6">
            <button
              onClick={() => handleApproval(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl transition"
            >
              Approve
            </button>

            <button
              onClick={() => handleApproval(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl transition"
            >
              Reject
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}