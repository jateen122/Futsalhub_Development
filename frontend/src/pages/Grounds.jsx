import { useEffect, useState } from "react";

export default function Grounds() {
  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/grounds/")
      .then((response) => response.json())
      .then((data) => {
        // IMPORTANT: because pagination
        setGrounds(data.results);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching grounds:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="pt-20 text-center">Loading...</div>;
  }

  return (
    <div className="pt-20 px-6 min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-center mb-10">
        Available Grounds ⚽
      </h1>

      {grounds.length === 0 ? (
        <p className="text-center">No approved grounds available.</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {grounds.map((ground) => (
            <div
              key={ground.id}
              className="bg-white shadow-lg rounded-xl p-6"
            >
              <h2 className="text-2xl font-semibold mb-2">
                {ground.name}
              </h2>

              <p className="text-gray-600 mb-2">
                📍 {ground.location}
              </p>

              <p className="text-gray-700 mb-4">
                {ground.description}
              </p>

              <p className="text-red-500 font-bold">
                Rs. {ground.price_per_hour} / hour
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}