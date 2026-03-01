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
      .then((data) => setGround(data));
  }, [id]);

  const handleApproval = (status) => {
    fetch(`${BASE_URL}/api/grounds/${id}/approve/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_approved: status }),
    })
      .then((res) => res.json())
      .then(() => {
        navigate("/admin-dashboard");
      });
  };

  if (!ground) return <div className="pt-24 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pt-24 px-20 pb-10">
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">

        {ground.image && (
          <img
            src={`${BASE_URL}${ground.image}`}
            alt={ground.name}
            className="w-full h-96 object-cover"
          />
        )}

        <div className="p-8">
          <h1 className="text-3xl font-bold">{ground.name}</h1>

          <p className="text-gray-500 mt-2">
            📍 {ground.location}
          </p>

          <p className="mt-4 text-lg">
            Rs {ground.price_per_hour} / hour
          </p>

          <p className="mt-4 text-gray-600">
            {ground.description}
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Owner: {ground.owner}
          </p>

          {/* APPROVE / REJECT PANEL */}
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => handleApproval(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
            >
              Approve
            </button>

            <button
              onClick={() => handleApproval(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}