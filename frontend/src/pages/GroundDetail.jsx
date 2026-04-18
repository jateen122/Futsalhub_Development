// frontend/src/pages/GroundDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Users, 
  IndianRupee 
} from "lucide-react";

import FavoriteButton from "../components/FavoriteButton";
import GroundMap from "../components/GroundMap";

const BASE_URL = "http://127.0.0.1:8000";

const toLabel = (t) => {
  if (!t) return "—";
  const h = parseInt(t.split(":")[0], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:00 ${ampm}`;
};

export default function GroundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then(r => r.json())
      .then(data => {
        const list = data.results || data || [];
        const found = list.find(g => String(g.id) === String(id));
        setGround(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ground not found</h2>
          <button 
            onClick={() => navigate("/grounds")}
            className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition"
          >
            Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  const imgSrc = ground.image
    ? ground.image.startsWith("http") ? ground.image : `${BASE_URL}${ground.image}`
    : null;

  const facilitiesList = ground.facilities
    ? ground.facilities.split(",").map(f => f.trim()).filter(Boolean)
    : [];

  const hasLocation = ground.latitude != null && ground.longitude != null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 pt-20">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 lg:px-12 xl:px-24 py-5">
        <div className="flex items-center gap-3 text-sm max-w-7xl mx-auto">
          <button 
            onClick={() => navigate("/grounds")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition"
          >
            <ArrowLeft size={20} /> Grounds
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900 truncate">{ground.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 xl:px-24 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT COLUMN - Image + Map */}
          <div className="lg:col-span-5 space-y-6">

            {/* Main Image */}
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
              {imgSrc ? (
                <img 
                  src={imgSrc} 
                  alt={ground.name} 
                  className="w-full aspect-[16/10] object-cover" 
                />
              ) : (
                <div className="w-full aspect-[16/10] bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-7xl text-amber-200">
                  GROUND
                </div>
              )}
            </div>

            {/* Map Section */}
            {hasLocation && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                  <MapPin size={22} className="text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{ground.location}</p>
                    <p className="text-xs text-gray-400">Exact location</p>
                  </div>
                </div>
                <div className="p-2">
                  <GroundMap
                    lat={ground.latitude}
                    lng={ground.longitude}
                    name={ground.name}
                    location={ground.location}
                    height="300px"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Details */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 lg:p-10">

              {/* Title + Favorite */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 leading-tight">{ground.name}</h1>
                  <p className="flex items-center gap-2 text-gray-500 mt-3">
                    <MapPin size={18} />
                    {ground.location}
                  </p>
                </div>
                <FavoriteButton groundId={ground.id} size="lg" />
              </div>

              {/* Price */}
              <div className="flex items-center gap-3 mb-8">
                <IndianRupee size={28} className="text-emerald-600" />
                <div>
                  <p className="text-4xl font-bold text-emerald-700">Rs {ground.price_per_hour}</p>
                  <p className="text-gray-400 text-sm">per hour</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                {ground.ground_size && (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-5 py-2 rounded-2xl text-sm font-semibold">
                    <Users size={18} />
                    {ground.ground_size}v{ground.ground_size}
                  </div>
                )}
                {ground.ground_type && (
                  <div className="px-5 py-2 rounded-2xl text-sm font-semibold bg-purple-100 text-purple-700">
                    {ground.ground_type === "indoor" ? "Indoor" : "Outdoor"}
                  </div>
                )}
              </div>

              {/* Facilities */}
              {facilitiesList.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Facilities</p>
                  <div className="flex flex-wrap gap-2">
                    {facilitiesList.map(f => (
                      <span 
                        key={f} 
                        className="px-4 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-2xl text-sm font-medium capitalize"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {ground.description && (
                <div className="mb-10">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About this ground</p>
                  <p className="text-gray-600 leading-relaxed">{ground.description}</p>
                </div>
              )}

              {/* Book Button */}
              <div className="flex gap-4">
                <button 
                  onClick={() => navigate(`/book/${ground.id}`)}
                  className="flex-1 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-lg rounded-2xl transition shadow-sm"
                >
                  Book This Ground
                </button>
                <button 
                  onClick={() => navigate("/grounds")}
                  className="px-8 py-4 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}