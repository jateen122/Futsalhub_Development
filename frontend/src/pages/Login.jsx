import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      // STEP 1: Get token
      const tokenRes = await axios.post(
        "http://127.0.0.1:8000/api/token/",
        formData
      );

      const access = tokenRes.data.access;
      const refresh = tokenRes.data.refresh;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      // STEP 2: Get profile using token
      const profileRes = await axios.get(
        "http://127.0.0.1:8000/api/accounts/profile/",
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      const role = profileRes.data.role;

      // STEP 3: Redirect based on role
      if (role === "player") {
        navigate("/player-dashboard");
      } else if (role === "owner") {
        navigate("/owner-dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      }

    } catch (error) {
      setMessage("Invalid email or password ❌");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-200 pt-20">
      <div className="bg-white shadow-lg rounded-xl p-8 w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        {message && (
          <p className="text-center text-red-500 mb-4">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="w-full border p-2 rounded"
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full border p-2 rounded"
            onChange={handleChange}
            required
          />

          <button className="w-full bg-black hover:bg-gray-800 text-white py-2 rounded transition">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}