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
      const response = await axios.post(
        "http://127.0.0.1:8000/api/token/",
        formData
      );

      // Save tokens
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      setMessage("Login Successful ✅");

      // Redirect to profile (or home)
      setTimeout(() => {
        navigate("/profile");
      }, 1000);

    } catch (error) {
      if (error.response) {
        setMessage("Invalid email or password ❌");
      } else {
        setMessage("Server error ❌");
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Login</h2>

      {message && (
        <p style={{ color: "red", marginBottom: "10px" }}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
          required
        />

        <br /><br />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          required
        />

        <br /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}