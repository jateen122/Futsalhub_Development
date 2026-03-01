import { useEffect, useState } from "react";

const BASE_URL = "http://127.0.0.1:8000";

export default function Grounds() {
  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then((response) => response.json())
      .then((data) => {
        setGrounds(data.results || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching grounds:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="pt-24 text-center text-lg font-semibold">
        Loading grounds...
      </div>
    );
  }

  return (
    <div className="pt-24 px-6 min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-center mb-12">
        Available Grounds ⚽
      </h1>

      {grounds.length === 0 ? (
        <p className="text-center text-gray-600">
          No approved grounds available.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {grounds.map((ground) => (
            <div
              key={ground.id}
              className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-2xl transition duration-300"
            >
              {/* 🔥 IMAGE SECTION */}
              {ground.image ? (
                <img
                  src={
                    ground.image.startsWith("http")
                      ? ground.image
                      : `${BASE_URL}${ground.image}`
                  }
                  alt={ground.name}
                  className="w-full h-56 object-cover"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/400x250?text=No+Image";
                  }}
                />
              ) : (
                <div className="w-full h-56 bg-gray-300 flex items-center justify-center">
                  No Image Available
                </div>
              )}

              {/* 🔥 CARD BODY */}
              <div className="p-6">
                <h2 className="text-2xl font-semibold mb-2">
                  {ground.name}
                </h2>

                <p className="text-gray-600 mb-2">
                  📍 {ground.location}
                </p>

                <p className="text-gray-700 mb-4 line-clamp-3">
                  {ground.description}
                </p>

                <p className="text-red-500 font-bold text-lg">
                  Rs. {ground.price_per_hour} / hour
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}