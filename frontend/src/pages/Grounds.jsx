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

  if (loading) {
    return (
      <div className="pt-32 text-center text-xl text-gray-400 bg-black min-h-screen">
        Loading futsal grounds...
      </div>
    );
  }

  return (
    <div className="pt-24 bg-black text-white min-h-screen px-6 lg:px-16">

      {/* 🔍 SEARCH */}
      <div className="flex justify-center mb-12">
        <div className="flex w-full max-w-4xl bg-white/5 border border-white/10 rounded-full overflow-hidden backdrop-blur-lg">

          <input
            type="text"
            placeholder="Search futsal by name or location..."
            className="flex-1 px-6 py-4 bg-transparent outline-none text-white placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="bg-amber-400 text-black px-8 font-semibold hover:bg-amber-300 transition">
            Search
          </button>

        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">

        {/* 🧾 FILTER */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl sticky top-28">

            <h2 className="text-2xl font-semibold mb-8">Filters</h2>

            {/* Price */}
            <div className="mb-10">
              <p className="text-sm text-gray-400 mb-3">Price Range</p>

              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full accent-amber-400"
              />

              <div className="flex justify-between text-sm mt-2 text-gray-400">
                <span>Rs 500</span>
                <span className="text-white font-semibold">
                  Rs {maxPrice}
                </span>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <p className="text-sm text-gray-400 mb-4">Amenities</p>

              <div className="space-y-3">
                {["parking", "shower", "wifi", "restaurant"].map((item) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer text-gray-300 capitalize">
                    <input
                      type="checkbox"
                      name={item}
                      onChange={handleFacilityChange}
                      className="accent-amber-400"
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

          {/* Title */}
          <h1 className="text-3xl font-bold mb-8">
            {filteredGrounds.length} Grounds Found
          </h1>

          {/* Empty */}
          {filteredGrounds.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              No results found
            </div>
          )}

          {/* Cards */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8">

            {filteredGrounds.map((ground) => (
              <div
                key={ground.id}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl hover:scale-105 hover:shadow-2xl transition duration-300"
              >

                {/* Image */}
                <div className="relative group">
                  {ground.image ? (
                    <img
                      src={
                        ground.image.startsWith("http")
                          ? ground.image
                          : `${BASE_URL}${ground.image}`
                      }
                      alt={ground.name}
                      className="w-full h-52 object-cover group-hover:scale-110 transition duration-300"
                    />
                  ) : (
                    <div className="h-52 bg-gray-800 flex items-center justify-center">
                      No Image
                    </div>
                  )}

                  {/* Price */}
                  <div className="absolute top-3 right-3 bg-amber-400 text-black text-xs px-3 py-1 rounded-full font-semibold">
                    Rs {ground.price_per_hour}/hr
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">

                  <h3 className="text-lg font-semibold mb-1">
                    {ground.name}
                  </h3>

                  <p className="text-sm text-gray-400 mb-2">
                    {ground.location}
                  </p>

                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                    {ground.description}
                  </p>

                  <div className="flex gap-2">

                    <button
                      onClick={() => navigate(`/book/${ground.id}`)}
                      className="flex-1 bg-amber-400 text-black py-2 rounded-lg text-sm font-semibold hover:bg-amber-300"
                    >
                      Book Now
                    </button>

                    <button
                      onClick={() => navigate(`/grounds/${ground.id}`)}
                      className="flex-1 border border-white/20 py-2 rounded-lg text-sm hover:bg-white/10"
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