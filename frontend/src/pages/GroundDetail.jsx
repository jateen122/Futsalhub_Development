import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE_URL = "http://127.0.0.1:8000";

const fmt12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

export default function GroundDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ground, setGround] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/grounds/`)
      .then((r) => r.json())
      .then((data) => {
        const list = data.results || data || [];
        const found = list.find((g) => String(g.id) === String(id));
        setGround(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const imgSrc = ground?.image
    ? ground.image.startsWith("http")
      ? ground.image
      : `${BASE_URL}${ground.image}`
    : null;

  const facilitiesList = ground?.facilities
    ? ground.facilities
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ground) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-white text-center">
        <div>
          <p className="text-5xl mb-4">●</p>
          <p className="text-2xl font-bold mb-4">Ground not found</p>
          <button
            onClick={() => navigate("/grounds")}
            className="px-6 py-2 bg-amber-400 text-black font-bold rounded-xl"
          >
            Back to Grounds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[320px]">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={ground.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center text-8xl">
            ●
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/40 to-transparent" />

        {/* Back */}
        <button
          onClick={() => navigate("/grounds")}
          className="absolute top-6 left-6 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm hover:bg-black/70 transition"
        >
          ← Back
        </button>

        {/* Price badge */}
        <div className="absolute top-6 right-6 bg-amber-400 text-black px-5 py-2 rounded-full font-black text-lg">
          Rs {ground.price_per_hour}/hr
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 pb-20 relative z-10">
        <div className="bg-[#0f1623] border border-white/10 rounded-3xl overflow-hidden">
          {/* Title section */}
          <div className="p-8 border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-white">
                  {ground.name}
                </h1>
                <p className="text-white/50 mt-2">{ground.location}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold rounded-full">
                ✓ Approved
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/10 border-b border-white/10">
            {[
              {
                label: "Opens",
                value: fmt12(ground.opening_time?.slice(0, 5)),
              },
              {
                label: "Closes",
                value: fmt12(ground.closing_time?.slice(0, 5)),
              },
              { label: "Rate", value: `Rs ${ground.price_per_hour}/hr` },
              { label: "Owner", value: ground.owner || "—" },
            ].map((item) => (
              <div key={item.label} className="p-5 text-center">
                <p className="text-white/40 text-xs uppercase tracking-widest">
                  {item.label}
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="p-8 border-b border-white/10">
            <h2 className="text-white/40 text-xs uppercase tracking-widest mb-3">
              About
            </h2>
            <p className="text-white/80 leading-relaxed">
              {ground.description || "No description provided."}
            </p>
          </div>

          {/* Facilities */}
          {facilitiesList.length > 0 && (
            <div className="p-8 border-b border-white/10">
              <h2 className="text-white/40 text-xs uppercase tracking-widest mb-4">
                Facilities
              </h2>
              <div className="flex flex-wrap gap-2">
                {facilitiesList.map((f) => (
                  <span
                    key={f}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-full text-sm capitalize"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="p-8">
            <button
              onClick={() => navigate(`/book/${ground.id}`)}
              className="w-full py-5 bg-amber-400 text-black font-black text-xl rounded-2xl hover:bg-amber-300 transition"
            >
              Book This Ground
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
