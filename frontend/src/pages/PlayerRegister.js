import Navbar from "../components/Navbar";
import "./Form.css";

function PlayerRegister() {
  return (
    <>
      <Navbar />
      <div className="form-container">
        <h2>Player Registration</h2>

        <input type="text" placeholder="Full Name" />
        <input type="email" placeholder="Email Address" />
        <input type="password" placeholder="Password" />
        <input type="password" placeholder="Confirm Password" />

        <button>Register</button>

        <p>
          Already have an account?{" "}
          <a href="/player/login">Login here</a>
        </p>
      </div>
    </>
  );
}

export default PlayerRegister;
