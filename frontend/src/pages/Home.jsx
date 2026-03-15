import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import hero1 from "../assets/hero1.jpg";
import hero2 from "../assets/hero2.jpg";

export default function Home() {

  const navigate = useNavigate();

  const slides = [
    {
      image: hero1,
      title: "Find Your Ground",
      description:
        "Get instant information from every futsal available and suit your schedule and budget.",
      button: "View All",
      buttonColor: "bg-red-500 hover:bg-red-600 text-white",
      link: "/grounds"
    },
    {
      image: hero2,
      title: "Register Your Futsal",
      description:
        "List your futsal ground and manage bookings efficiently with real-time updates.",
      button: "Register Now",
      buttonColor: "bg-yellow-400 hover:bg-yellow-500 text-black",
      link: "/register-ground"
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 4000);

    return () => clearInterval(interval);
  }, [currentSlide]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  return (
    <div className="flex flex-col min-h-screen">

      <section
        className="flex-1 bg-cover bg-center relative flex items-center justify-center transition-all duration-700"
        style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
      >

        <div className="absolute inset-0 bg-black/60"></div>

        <div className="relative text-center text-white px-6">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {slides[currentSlide].title}
          </h2>

          <p className="text-lg mb-8 max-w-xl mx-auto text-gray-200">
            {slides[currentSlide].description}
          </p>

          <button
            onClick={() => navigate(slides[currentSlide].link)}
            className={`px-6 py-3 rounded-lg text-lg font-semibold transition ${slides[currentSlide].buttonColor}`}
          >
            {slides[currentSlide].button}
          </button>
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black"
        >
          ❮
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full hover:bg-black"
        >
          ❯
        </button>

        <div className="absolute bottom-8 flex space-x-3">
          {slides.map((slide, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-3 w-3 rounded-full ${
                currentSlide === index ? "bg-white" : "bg-gray-400"
              }`}
            ></button>
          ))}
        </div>

      </section>

      <footer className="bg-black text-white text-center py-3">
        © 2026 FutsalHub | Final Year Project
      </footer>

    </div>
  );
}