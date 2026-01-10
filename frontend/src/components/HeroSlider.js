import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./HeroSlider.css";
import bookFutsal from "../assets/bookfutsal.jpg";
import addFutsal from "../assets/addfutsal.jpg";

const slides = [
  {
    badge: "For Players",
    title: "Find Your Perfect Futsal Ground",
    description:
      "Browse, compare prices, and book futsal grounds instantly based on your location and schedule.",
    primary: "View All Futsals",
    secondary: "Player Login",
    image: bookFutsal,
    primaryAction: "/futsals",
    secondaryAction: "/player/login",
  },
  {
    badge: "For Owners",
    title: "List Your Futsal & Grow Your Business",
    description:
      "Add your futsal ground, manage bookings, and reach more players online.",
    primary: "Add Your Futsal",
    secondary: "Owner Login",
    image: addFutsal,
    primaryAction: "/owner/register",
    secondaryAction: "/owner/login",
  },
];

function HeroSlider() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="hero"
      style={{ backgroundImage: `url(${slides[index].image})` }}
    >
      <div className="hero-overlay">
        <span className="badge">{slides[index].badge}</span>
        <h1>{slides[index].title}</h1>
        <p>{slides[index].description}</p>

        <div className="hero-buttons">
          <button
            className="primary-btn"
            onClick={() => navigate(slides[index].primaryAction)}
          >
            {slides[index].primary}
          </button>
          <button
            className="secondary-btn"
            onClick={() => navigate(slides[index].secondaryAction)}
          >
            {slides[index].secondary}
          </button>
        </div>
      </div>

      {/* Slide arrows */}
      <button className="slide-btn left" onClick={prevSlide}>
        ❮
      </button>
      <button className="slide-btn right" onClick={nextSlide}>
        ❯
      </button>

      {/* Dots */}
      <div className="dots">
        {slides.map((_, i) => (
          <span
            key={i}
            className={i === index ? "dot active" : "dot"}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}

export default HeroSlider;
