import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

export default function Grounds() {

  const navigate = useNavigate();

  const [grounds, setGrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(5000);

  const [facilities, setFacilities] = useState({
    parking: false,
    shower: false,
    wifi: false,
    restaurant: false,
  });

  /* Fetch */
  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.results || data || [];
        setGrounds(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* Filters */
  const filteredGrounds = useMemo(() => {
    let results = [...grounds];

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (g) =>
          g.name?.toLowerCase().includes(q) ||
          g.location?.toLowerCase().includes(q)
      );
    }

    results = results.filter(
      (g) => Number(g.price_per_hour) <= Number(maxPrice)
    );

    Object.keys(facilities).forEach((key) => {
      if (facilities[key]) {
        results = results.filter((g) =>
          (g.facilities || "").toLowerCase().includes(key)
        );
      }
    });

    return results;
  }, [grounds, search, maxPrice, facilities]);

  const handleFacilityChange = (e) => {
    setFacilities((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  /* Loading */
  if (loading) {
    return (
      <div className="pt-32 text-center text-2xl font-semibold text-gray-500">
        Loading futsal grounds...
      </div>
    );
  }

  return (
    <div className="pt-24 bg-gradient-to-b from-gray-100 to-gray-200 min-h-screen px-6 lg:px-16">

      {/* 🔍 SEARCH */}
      <div className="flex justify-center mb-12">
        <div className="flex w-full max-w-4xl bg-white rounded-full shadow-lg overflow-hidden border border-gray-200">

          <input
            type="text"
            placeholder="Search futsal by name or location..."
            className="flex-1 px-6 py-4 text-lg outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="bg-green-600 text-white px-8 font-semibold hover:bg-green-700 transition">
            Search
          </button>

        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">

        {/* 🧾 FILTER */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white p-6 rounded-2xl shadow-md sticky top-28 border">

            <h2 className="text-2xl font-bold mb-6">Filters</h2>

            {/* Price */}
            <div className="mb-8">
              <h3 className="font-semibold mb-2">Price Range</h3>

              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full accent-blue-600"
              />

              <div className="flex justify-between text-sm mt-2 text-gray-500">
                <span>Rs 500</span>
                <span className="font-semibold text-black">Rs {maxPrice}</span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-semibold mb-3">Amenities</h3>

              <div className="space-y-2">
                {["parking", "shower", "wifi", "restaurant"].map((item) => (
                  <label key={item} className="flex items-center gap-2 text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      name={item}
                      onChange={handleFacilityChange}
                      className="accent-blue-600"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* 🏟️ GROUNDS */}
        <div className="col-span-12 lg:col-span-9">

          <h1 className="text-3xl font-bold mb-8">
            {filteredGrounds.length} futsals found
          </h1>

          {filteredGrounds.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <p className="text-xl font-semibold">No results found</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">

            {filteredGrounds.map((ground) => (
              <div
                key={ground.id}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition duration-300"
              >

                {/* Image */}
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
                    />
                  ) : (
                    <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                      No Image
                    </div>
                  )}

                  <span className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 text-sm rounded-full font-semibold">
                    Rs {ground.price_per_hour}/hr
                  </span>
                </div>

                {/* Body */}
                <div className="p-5">

                  <h3 className="text-lg font-bold mb-1">{ground.name}</h3>

                  <p className="text-sm text-gray-500 mb-2">
                    {ground.location}
                  </p>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {ground.description}
                  </p>

                  <div className="flex justify-between gap-2">

                    <button
                      onClick={() => navigate(`/book/${ground.id}`)}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition text-sm font-semibold"
                    >
                      Book Now
                    </button>

                    <button
                      onClick={() => navigate(`/grounds/${ground.id}`)}
                      className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
                    >
                      Details
                    </button>

                  </div>

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}