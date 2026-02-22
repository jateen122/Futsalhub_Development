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
      // Step 1: Get JWT token
      const tokenRes = await axios.post(
        "http://127.0.0.1:8000/api/token/",
        formData
      );

      const access = tokenRes.data.access;
      const refresh = tokenRes.data.refresh;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      // Step 2: Get user profile
      const profileRes = await axios.get(
        "http://127.0.0.1:8000/api/accounts/profile/",
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      const role = profileRes.data.role;

      // Step 3: Redirect based on role
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
    <div style={{ padding: "40px" }}>
      <h2>Login</h2>

      {message && <p style={{ color: "red" }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <br /><br />

        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <br /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}