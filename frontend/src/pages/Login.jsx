import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      /* ---------------- STEP 1: Get JWT Token ---------------- */
      const tokenResponse = await fetch(
        "http://127.0.0.1:8000/api/token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!tokenResponse.ok) {
        throw new Error("Invalid credentials");
      }

      const tokenData = await tokenResponse.json();

      const access = tokenData.access;
      const refresh = tokenData.refresh;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      /* ---------------- STEP 2: Get User Profile ---------------- */
      const profileResponse = await fetch(
        "http://127.0.0.1:8000/api/accounts/profile/",
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      const profileData = await profileResponse.json();

      const role = profileData.role;

      localStorage.setItem("role", role);

      /* ---------------- STEP 3: Redirect Based On Role ---------------- */
      if (role === "owner") {
        navigate("/owner-dashboard");
      } else if (role === "player") {
        navigate("/player-dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      }

      window.location.reload(); // refresh navbar

    } catch (error) {
      setMessage("Invalid email or password ❌");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-900 to-black pt-20">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-96">

        <h2 className="text-3xl font-bold text-center mb-6">
          Welcome Back 👋
        </h2>

        {message && (
          <p className="text-center text-red-500 mb-4">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block mb-1 text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-gray-800 text-white py-2 rounded-lg transition duration-300"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="text-center mt-6 text-sm">
          Don’t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-red-500 cursor-pointer"
          >
            Register
          </span>
        </p>

      </div>
    </div>
  );
}