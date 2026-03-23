import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import login1 from "../assets/login1.jpg";
import login2 from "../assets/login2.jpg";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const images = [login1, login2];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const tokenResponse = await fetch(
        "http://127.0.0.1:8000/api/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!tokenResponse.ok) throw new Error();

      const tokenData = await tokenResponse.json();

      localStorage.setItem("access", tokenData.access);
      localStorage.setItem("refresh", tokenData.refresh);

      const profileResponse = await fetch(
        "http://127.0.0.1:8000/api/accounts/profile/",
        {
          headers: { Authorization: `Bearer ${tokenData.access}` },
        }
      );

      const profileData = await profileResponse.json();
      const role = profileData.role;

      localStorage.setItem("role", role);

      if (role === "owner") navigate("/owner-dashboard");
      else if (role === "player") navigate("/player-dashboard");
      else if (role === "admin") navigate("/admin-dashboard");

      window.location.reload();

    } catch {
      setMessage("Invalid email or password ❌");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-black text-white pt-16">

      {/* LEFT IMAGE */}
      <div className="hidden lg:flex w-1/2 h-[calc(100vh-64px)] relative overflow-hidden">
        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt="login"
            className={`absolute w-full h-full object-cover transition-opacity duration-1000 ${
              index === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* RIGHT SIDE (FULL SPACE USED) */}
      <div className="w-full lg:w-1/2 h-[calc(100vh-64px)] flex items-center justify-center px-10 lg:px-20">

        {/* FORM (WIDER + CLEAN) */}
        <div className="w-full max-w-lg">

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-12 shadow-2xl">

            <h2 className="text-4xl font-bold text-center mb-8">
              Login
            </h2>

            {message && (
              <p className="text-center text-red-400 mb-4">
                {message}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block mb-2 text-gray-300">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block mb-2 text-gray-300">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="w-full bg-black/40 border border-white/10 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 text-black font-semibold py-4 rounded-lg hover:bg-amber-300 transition text-lg"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

            </form>

            <p className="text-center mt-6 text-gray-400">
              Don’t have an account?{" "}
              <span
                onClick={() => navigate("/register")}
                className="text-amber-400 cursor-pointer hover:underline"
              >
                Register
              </span>
            </p>

          </div>

        </div>

      </div>
    </div>
  );
}