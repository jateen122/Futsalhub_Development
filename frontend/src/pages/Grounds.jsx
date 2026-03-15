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
      <div className="pt-32 text-center text-xl font-semibold text-gray-700">
        Loading grounds...
      </div>
    );
  }

  return (
    <div className="pt-24 px-6 min-h-screen bg-gray-100">

      {/* Page Title */}
      <h1 className="text-4xl font-bold text-center mb-12">
        ⚽ Available Futsal Grounds
      </h1>

      {grounds.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">
          No approved grounds available.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">

          {grounds.map((ground) => (
            <div
              key={ground.id}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition duration-300 transform hover:-translate-y-2"
            >

              {/* Image Section */}
              <div className="relative">

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

                {/* Price Badge */}
                <span className="absolute top-4 right-4 bg-red-500 text-white text-sm px-3 py-1 rounded-full font-semibold">
                  Rs. {ground.price_per_hour}/hr
                </span>

              </div>

              {/* Card Body */}
              <div className="p-6">

                <h2 className="text-2xl font-semibold mb-2">
                  {ground.name}
                </h2>

                <p className="text-gray-500 mb-2">
                  📍 {ground.location}
                </p>

                <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                  {ground.description}
                </p>

                {/* Buttons */}
                <div className="flex justify-between items-center">

                  <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
                    Book Now
                  </button>

                  <button className="border border-gray-400 hover:bg-gray-100 px-4 py-2 rounded-lg transition">
                    View Details
                  </button>

                </div>

              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
}