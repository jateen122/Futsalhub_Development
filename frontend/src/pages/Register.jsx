import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import login1 from "../assets/login1.jpg";
import login2 from "../assets/login2.jpg";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone: "",
    role: "player",
    password: "",
    password2: "",
  });

  const [message, setMessage] = useState("");

  // 🔥 image slider
  const images = [login1, login2];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/accounts/register/",
        formData
      );
      setMessage("Registration Successful ✅");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setMessage("Registration Failed ❌");
    }
  };

  return (
    <div className="min-h-screen flex bg-black text-white pt-16">

      {/* LEFT IMAGE */}
      <div className="hidden lg:flex w-1/2 h-[calc(100vh-64px)] relative overflow-hidden">
        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt="register"
            className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* RIGHT FORM */}
      <div className="w-full lg:w-1/2 h-[calc(100vh-64px)] flex items-center justify-center px-10 lg:px-20">

        <div className="w-full max-w-lg">

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-2xl">

            <h2 className="text-4xl font-bold text-center mb-8">
              Create Account
            </h2>

            {message && (
              <p className="text-center text-red-400 mb-4">
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              <input
                type="email"
                name="email"
                placeholder="Email"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="full_name"
                placeholder="Full Name"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="phone"
                placeholder="Phone"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
              />

              <select
                name="role"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
              >
                <option value="player">Player</option>
                <option value="owner">Ground Owner</option>
              </select>

              <input
                type="password"
                name="password"
                placeholder="Password"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
                required
              />

              <input
                type="password"
                name="password2"
                placeholder="Confirm Password"
                className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                onChange={handleChange}
                required
              />

              <button className="w-full bg-amber-400 text-black font-semibold py-4 rounded-lg hover:bg-amber-300 transition text-lg">
                Register
              </button>

            </form>

            <p className="text-center mt-6 text-gray-400">
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                className="text-amber-400 cursor-pointer hover:underline"
              >
                Login
              </span>
            </p>

          </div>

        </div>
      </div>
    </div>
  );
}