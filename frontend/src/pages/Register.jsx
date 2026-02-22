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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await axios.post(
        "http://127.0.0.1:8000/api/accounts/register/",
        formData
      );

      setMessage("Registration Successful ✅ Redirecting to login...");

      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      if (error.response) {
        setMessage(JSON.stringify(error.response.data));
      } else {
        setMessage("Server error ❌");
      }
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Register</h2>

      {message && <p style={{ color: "red" }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <br /><br />

        <input type="text" name="full_name" placeholder="Full Name" onChange={handleChange} required />
        <br /><br />

        <input type="text" name="phone" placeholder="Phone" onChange={handleChange} />
        <br /><br />

        <select name="role" onChange={handleChange}>
          <option value="player">Player</option>
          <option value="owner">Ground Owner</option>
        </select>
        <br /><br />

        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <br /><br />

        <input type="password" name="password2" placeholder="Confirm Password" onChange={handleChange} required />
        <br /><br />

        <button type="submit">Register</button>
      </form>
    </div>
  );
}