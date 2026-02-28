import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function AdminGroundDetail() {
  const { id } = useParams();
  const token = localStorage.getItem("access");
  const [ground, setGround] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/grounds/admin/all/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const selected = data.results.find(
          (g) => g.id === parseInt(id)
        );
        setGround(selected);
      });
  }, [id]);

  const handleApproval = async (value) => {
    await fetch(
      `http://127.0.0.1:8000/api/grounds/${id}/approve/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_approved: value }),
      }
    );

    setGround({ ...ground, is_approved: value });
  };

  if (!ground) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 pt-24 p-10">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">

        {ground.image && (
          <img
            src={`http://127.0.0.1:8000${ground.image}`}
            alt="ground"
            className="w-full h-80 object-cover"
          />
        )}

        <div className="p-8">
          <h1 className="text-3xl font-bold mb-4">
            {ground.name}
          </h1>

          <p><strong>Owner:</strong> {ground.owner}</p>
          <p><strong>Location:</strong> {ground.location}</p>
          <p><strong>Price:</strong> Rs {ground.price_per_hour}</p>
          <p><strong>Open:</strong> {ground.opening_time}</p>
          <p><strong>Close:</strong> {ground.closing_time}</p>
          <p><strong>Facilities:</strong> {ground.facilities}</p>
          <p className="mt-4">{ground.description}</p>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => handleApproval(true)}
              className="bg-green-600 text-white px-6 py-2 rounded"
            >
              Approve
            </button>

            <button
              onClick={() => handleApproval(false)}
              className="bg-red-600 text-white px-6 py-2 rounded"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}