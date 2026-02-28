import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import About from "./pages/About";
import Grounds from "./pages/Grounds";

import PlayerDashboard from "./pages/PlayerDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGroundDetail from "./pages/AdminGroundDetail";
import AddGround from "./pages/AddGround";

/* ------------------------------
   Protected Route Component
--------------------------------*/
function ProtectedRoute({ children, allowedRole }) {
  const role = localStorage.getItem("role");

  if (!role) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">

        {/* Navbar */}
        <Navbar />

        {/* Main Content */}
        <Routes>

          {/* ---------------- PUBLIC ROUTES ---------------- */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/grounds" element={<Grounds />} />

          {/* ---------------- PLAYER ROUTE ---------------- */}
          <Route
            path="/player-dashboard"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ---------------- OWNER ROUTE ---------------- */}
          <Route
            path="/owner-dashboard"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ---------------- ADMIN ROUTE ---------------- */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
  path="/admin/ground/:id"
  element={
    <ProtectedRoute allowedRole="admin">
      <AdminGroundDetail />
    </ProtectedRoute>
  }
/>
          <Route
  path="/add-ground"
  element={
    <ProtectedRoute allowedRole="owner">
      <AddGround />
    </ProtectedRoute>
  }
/>

          {/* ---------------- UNKNOWN ROUTE ---------------- */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;