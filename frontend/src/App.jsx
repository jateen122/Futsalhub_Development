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

/* =====================================================
   PROTECTED ROUTE COMPONENT
   - Checks login
   - Checks role
===================================================== */
function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role");

  // Not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/* =====================================================
   MAIN APP
===================================================== */
function App() {
  const token = localStorage.getItem("access");
  const role = localStorage.getItem("role");

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">

        {/* NAVBAR */}
        <Navbar />

        {/* ROUTES */}
        <Routes>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              token ? (
                role === "admin" ? (
                  <Navigate to="/admin-dashboard" />
                ) : role === "owner" ? (
                  <Navigate to="/owner-dashboard" />
                ) : (
                  <Navigate to="/player-dashboard" />
                )
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/register"
            element={token ? <Navigate to="/" /> : <Register />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/grounds" element={<Grounds />} />

          {/* ================= PLAYER ROUTE ================= */}
          <Route
            path="/player-dashboard"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />

          {/* ================= OWNER ROUTES ================= */}
          <Route
            path="/owner-dashboard"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerDashboard />
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

          {/* ================= ADMIN ROUTES ================= */}
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

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;