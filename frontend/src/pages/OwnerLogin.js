import Navbar from "../components/Navbar";
import "./Form.css";

function OwnerLogin() {
  return (
    <>
      <Navbar />
      <div className="form-container">
        <h2>Owner Login</h2>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button>Login</button>
        <p>
          New owner? <a href="/owner/register">Register here</a>
        </p>
      </div>
    </>
  );
}

export default OwnerLogin;
