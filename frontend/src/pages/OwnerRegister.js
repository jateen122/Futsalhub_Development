import Navbar from "../components/Navbar";
import "./Form.css";

function OwnerRegister() {
  return (
    <>
      <Navbar />
      <div className="form-container">
        <h2>Futsal Owner Registration</h2>

        <input type="text" placeholder="Full Name" />
        <input type="email" placeholder="Email" />
        <input type="text" placeholder="Phone Number" />
        <input type="text" placeholder="Futsal Name" />
        <input type="text" placeholder="Location" />
        <input type="password" placeholder="Password" />

        <button>Register</button>
        <p>
          Already registered? <a href="/owner/login">Login</a>
        </p>
      </div>
    </>
  );
}

export default OwnerRegister;
