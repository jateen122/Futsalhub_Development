import Navbar from "../components/Navbar";
import "./Form.css";

function PlayerLogin() {
  return (
    <>
      <Navbar />
      <div className="form-container">
        <h2>Player Login</h2>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button>Login</button>
        <p>
          New player? <a href="/player/register">Register here</a>
        </p>
      </div>
    </>
  );
}

export default PlayerLogin;
