import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav className="bg-black text-white px-8 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-red-500">
        FutsalHub
      </h1>

      <div className="space-x-6">

        {/* PUBLIC NAVBAR */}
        {!role && (
          <>
            <Link to="/">Home</Link>
            <Link to="/grounds">Grounds</Link>
            <Link to="/about">About</Link>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}

        {/* PLAYER NAVBAR */}
        {role === "player" && (
          <>
            <Link to="/">Home</Link>
            <Link to="/grounds">Grounds</Link>
            <Link to="/player-dashboard">Dashboard</Link>
            <button onClick={handleLogout} className="text-red-400">
              Logout
            </button>
          </>
        )}

        {/* OWNER NAVBAR */}
        {role === "owner" && (
          <>
            <Link to="/owner-dashboard">Dashboard</Link>
            <Link to="/add-ground">Add Ground</Link>
            <Link to="/manage-ground">Manage Ground</Link>
            <Link to="/owner-bookings">Bookings</Link>
            <button onClick={handleLogout} className="text-red-400">
              Logout
            </button>
          </>
        )}

        {/* ADMIN NAVBAR */}
        {role === "admin" && (
          <>
            <Link to="/admin-dashboard">Admin Panel</Link>
            <button onClick={handleLogout} className="text-red-400">
              Logout
            </button>
          </>
        )}

      </div>
    </nav>
  );
}