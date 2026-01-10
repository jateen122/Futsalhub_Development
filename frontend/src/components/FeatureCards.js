import "./FeatureCards.css";
import { useNavigate } from "react-router-dom";

function FeatureCards() {
  const navigate = useNavigate();

  return (
    <section className="features">
      <div className="card" onClick={() => navigate("/futsals")}>
        <h3>⚽ Book Futsal</h3>
        <p>Find available futsal grounds and book instantly.</p>
      </div>

      <div className="card" onClick={() => navigate("/owner/register")}>
        <h3>🏟 Add Your Futsal</h3>
        <p>Register your futsal and manage bookings online.</p>
      </div>
    </section>
  );
}

export default FeatureCards;
