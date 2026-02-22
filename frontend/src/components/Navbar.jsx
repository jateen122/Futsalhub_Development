import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-black text-white fixed w-full z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
        <h1 className="text-xl font-bold text-red-500">FutsalHub</h1>

        <div className="space-x-6">
          <Link to="/" className="hover:text-red-500">Home</Link>
          <Link to="/register" className="hover:text-red-500">Register</Link>
          <Link to="/login" className="hover:text-red-500">Login</Link>
          <Link to="/about" className="hover:text-red-500">About</Link>
        </div>
      </div>
    </nav>
  );
}