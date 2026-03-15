import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

// ── Public pages ──────────────────────────────────────────────────────────────
import Home          from "./pages/Home";
import Register      from "./pages/Register";
import Login         from "./pages/Login";
import About         from "./pages/About";
import Grounds       from "./pages/Grounds";
import GroundDetail  from "./pages/GroundDetail";
import NotFound      from "./pages/NotFound";

// ── Player pages ──────────────────────────────────────────────────────────────
import PlayerDashboard      from "./pages/PlayerDashboard";
import BookingPage          from "./pages/BookingPage";
import PlayerMyBookings     from "./pages/PlayerMyBookings";
import PlayerPaymentHistory from "./pages/PlayerPaymentHistory";
import PlayerNotifications  from "./pages/PlayerNotifications";

// ── Owner pages ───────────────────────────────────────────────────────────────
import OwnerDashboard       from "./pages/OwnerDashboard";
import AddGround            from "./pages/AddGround";
import OwnerBookings        from "./pages/OwnerBookings";
import OwnerNotifications   from "./pages/OwnerNotifications";

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminDashboard       from "./pages/AdminDashboard";
import AdminGroundDetail    from "./pages/AdminGroundDetail";
import AdminUsers           from "./pages/AdminUsers";
import AdminBookings        from "./pages/AdminBookings";


/* ─────────────────────────────────────────────────────────────────────────────
   PROTECTED ROUTE — only checks login, no role restriction
───────────────────────────────────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const token = localStorage.getItem("access");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROTECTED ROUTE — checks login AND specific role
───────────────────────────────────────────────────────────────────────────── */
function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;
  return children;
}


/* ─────────────────────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────────────────────── */
function App() {
  const token = localStorage.getItem("access");
  const role  = localStorage.getItem("role");

  const dashboardRedirect =
    role === "admin"  ? "/admin-dashboard"  :
    role === "owner"  ? "/owner-dashboard"  :
                        "/player-dashboard";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">

        <Navbar />

        <Routes>

          {/* ══════════════════ PUBLIC ══════════════════ */}

          <Route path="/"        element={<Home />} />
          <Route path="/about"   element={<About />} />
          <Route path="/grounds" element={<Grounds />} />

          {/* Ground detail — public, no login needed */}
          <Route path="/grounds/:id" element={<GroundDetail />} />

          <Route
            path="/login"
            element={token ? <Navigate to={dashboardRedirect} replace /> : <Login />}
          />
          <Route
            path="/register"
            element={token ? <Navigate to={dashboardRedirect} replace /> : <Register />}
          />


          {/* ══════════════════ BOOKING ══════════════════
              Only requires login — NOT role-restricted
              so the role string mismatch never blocks it
          ═══════════════════════════════════════════════ */}
          <Route
            path="/book/:id"
            element={
              <RequireAuth>
                <BookingPage />
              </RequireAuth>
            }
          />


          {/* ══════════════════ PLAYER ══════════════════ */}

          <Route
            path="/player-dashboard"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-bookings"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerMyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-payments"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerPaymentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRole="player">
                <PlayerNotifications />
              </ProtectedRoute>
            }
          />


          {/* ══════════════════ OWNER ══════════════════ */}

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
          <Route
            path="/owner-bookings"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner-notifications"
            element={
              <ProtectedRoute allowedRole="owner">
                <OwnerNotifications />
              </ProtectedRoute>
            }
          />


          {/* ══════════════════ ADMIN ══════════════════ */}

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
            path="/admin/users"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminBookings />
              </ProtectedRoute>
            }
          />


          {/* ══════════════════ FALLBACK ══════════════════ */}
          <Route path="*" element={<NotFound />} />

        </Routes>

      </div>
    </BrowserRouter>
  );
}

export default App;
