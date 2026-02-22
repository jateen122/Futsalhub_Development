import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
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
    <div className="min-h-screen flex items-center justify-center bg-gray-200 pt-20">
      <div className="bg-white shadow-lg rounded-xl p-8 w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        {message && <p className="text-center text-red-500 mb-4">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" name="email" placeholder="Email" className="w-full border p-2 rounded" onChange={handleChange} required />
          <input type="text" name="full_name" placeholder="Full Name" className="w-full border p-2 rounded" onChange={handleChange} required />
          <input type="text" name="phone" placeholder="Phone" className="w-full border p-2 rounded" onChange={handleChange} />

          <select name="role" className="w-full border p-2 rounded" onChange={handleChange}>
            <option value="player">Player</option>
            <option value="owner">Ground Owner</option>
          </select>

          <input type="password" name="password" placeholder="Password" className="w-full border p-2 rounded" onChange={handleChange} required />
          <input type="password" name="password2" placeholder="Confirm Password" className="w-full border p-2 rounded" onChange={handleChange} required />

          <button className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded transition">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}