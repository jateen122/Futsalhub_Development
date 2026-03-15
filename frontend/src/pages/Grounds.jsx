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

  /* ───────────────── Fetch Grounds ───────────────── */
  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.results || data || [];
        setGrounds(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching grounds:", err);
        setLoading(false);
      });
  }, []);

  /* ───────────────── Filters ───────────────── */
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

  /* ───────────────── Facility Filter ───────────────── */
  const handleFacilityChange = (e) => {
    setFacilities((prev) => ({
      ...prev,
      [e.target.name]: e.target.checked,
    }));
  };

  /* ───────────────── Loading Screen ───────────────── */
  if (loading) {
    return (
      <div className="pt-32 text-center text-3xl font-semibold text-gray-700">
        Loading futsal grounds...
      </div>
    );
  }

  /* ───────────────── UI ───────────────── */
  return (
    <div className="pt-24 bg-gray-100 min-h-screen px-12 lg:px-20">

      {/* SEARCH BAR */}
      <div className="flex justify-center mb-16">
        <div className="flex w-full max-w-5xl bg-white shadow-xl rounded-xl overflow-hidden">

          <input
            type="text"
            placeholder="Search futsal by name or location..."
            className="flex-1 p-5 text-lg outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button className="bg-green-600 text-white px-10 text-lg font-semibold hover:bg-green-700 transition">
            Search
          </button>

        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">

        {/* FILTER SIDEBAR */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white p-8 rounded-2xl shadow-lg sticky top-28">

            <h2 className="text-3xl font-bold mb-10">Filters</h2>

            {/* PRICE FILTER */}
            <div className="mb-12">
              <h3 className="text-lg font-semibold mb-3">Price Range</h3>

              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full"
              />

              <div className="flex justify-between mt-3 text-gray-600">
                <span>Rs 500</span>
                <span className="font-semibold">Rs {maxPrice}</span>
              </div>
            </div>

            {/* AMENITIES */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Amenities</h3>
              <div className="space-y-3 text-gray-700">

                {["parking", "shower", "wifi", "restaurant"].map((item) => (
                  <label key={item} className="flex gap-2 capitalize cursor-pointer">
                    <input
                      type="checkbox"
                      name={item}
                      onChange={handleFacilityChange}
                    />
                    {item}
                  </label>
                ))}

              </div>
            </div>

          </div>
        </div>

        {/* GROUNDS LIST */}
        <div className="col-span-12 lg:col-span-9">

          <h1 className="text-4xl font-bold mb-10 flex items-center gap-2">
            ⚽ {filteredGrounds.length} futsals found
          </h1>

          {/* Empty state */}
          {filteredGrounds.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <p className="text-5xl mb-4">🏟️</p>
              <p className="text-xl font-semibold">No grounds match your filters</p>
              <p className="text-sm mt-2">Try adjusting the price range or amenities</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-10">

            {filteredGrounds.map((ground) => (

              <div
                key={ground.id}
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 hover:-translate-y-1"
              >

                {/* IMAGE */}
                <div className="relative">
                  {ground.image ? (
                    <img
                      src={
                        ground.image.startsWith("http")
                          ? ground.image
                          : `${BASE_URL}${ground.image}`
                      }
                      alt={ground.name}
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-5xl">
                      ⚽
                    </div>
                  )}

                  <span className="absolute top-4 right-4 bg-red-500 text-white px-4 py-1 rounded-full font-semibold">
                    Rs {ground.price_per_hour}/hr
                  </span>
                </div>

                {/* CARD BODY */}
                <div className="p-6">

                  <h3 className="text-xl font-bold mb-2">{ground.name}</h3>

                  <p className="text-gray-500 mb-2">📍 {ground.location}</p>

                  <p className="text-gray-600 mb-6 line-clamp-3">
                    {ground.description}
                  </p>

                  <div className="flex justify-between gap-3">

                    {/* ✅ FIXED: /book/:id  (was /booking/:id) */}
                    <button
                      onClick={() => navigate(`/book/${ground.id}`)}
                      className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition font-semibold"
                    >
                      Book Now
                    </button>

                    {/* ✅ FIXED: /grounds/:id  (was /ground/:id) */}
                    <button
                      onClick={() => navigate(`/grounds/${ground.id}`)}
                      className="border border-gray-400 px-5 py-2 rounded-lg hover:bg-gray-100 transition"
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
