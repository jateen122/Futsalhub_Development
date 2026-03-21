import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";

// ── Public ─────────────────────────────────────────────────────
import Home              from "./pages/Home";
import Register          from "./pages/Register";
import Login             from "./pages/Login";
import About             from "./pages/About";
import Grounds           from "./pages/Grounds";
import GroundDetail      from "./pages/GroundDetail";
import NotFound          from "./pages/NotFound";
import VerifyEmail       from "./pages/VerifyEmail";
import ResendVerification from "./pages/ResendVerification";

// ── Shared ─────────────────────────────────────────────────────
import Profile from "./pages/Profile";

// ── Player ─────────────────────────────────────────────────────
import PlayerDashboard      from "./pages/PlayerDashboard";
import BookingPage          from "./pages/BookingPage";
import PlayerMyBookings     from "./pages/PlayerMyBookings";
import PlayerPaymentHistory from "./pages/PlayerPaymentHistory";
import PlayerNotifications  from "./pages/PlayerNotifications";
import PlayerFavorites      from "./pages/PlayerFavorites";

// ── Owner ──────────────────────────────────────────────────────
import OwnerDashboard     from "./pages/OwnerDashboard";
import OwnerAddGround     from "./pages/OwnerAddGround";
import OwnerManageGround  from "./pages/OwnerManageGround";
import OwnerBookings      from "./pages/OwnerBookings";
import OwnerNotifications from "./pages/OwnerNotifications";

// ── Admin ──────────────────────────────────────────────────────
import AdminDashboard      from "./pages/AdminDashboard";
import AdminGroundApproval from "./pages/AdminGroundApproval";
import AdminGroundDetail   from "./pages/AdminGroundDetail";
import AdminUsers          from "./pages/AdminUsers";
import AdminBookings       from "./pages/AdminBookings";
import AdminNotifications  from "./pages/AdminNotifications";

/* ── Route guards ─────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const token = localStorage.getItem("access");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("access");
  const role  = localStorage.getItem("role");
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;
  return children;
}

/* ── App ──────────────────────────────────────────────────────── */
export default function App() {
  const token = localStorage.getItem("access");
  const role  = localStorage.getItem("role");

  const dashboardRedirect =
    role === "admin" ? "/admin-dashboard"  :
    role === "owner" ? "/owner-dashboard"  :
                       "/player-dashboard";

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black">
        <Navbar />
        <Routes>

          {/* ════ PUBLIC ════ */}
          <Route path="/"            element={<Home />} />
          <Route path="/about"       element={<About />} />
          <Route path="/grounds"     element={<Grounds />} />
          <Route path="/grounds/:id" element={<GroundDetail />} />

          {/* Email verification — public, no auth */}
          <Route path="/verify-email/:token"  element={<VerifyEmail />} />
          <Route path="/resend-verification"  element={<ResendVerification />} />

          {/* Redirect logged-in users away from login/register */}
          <Route path="/login"    element={token ? <Navigate to={dashboardRedirect} replace /> : <Login />} />
          <Route path="/register" element={token ? <Navigate to={dashboardRedirect} replace /> : <Register />} />

          {/* ════ SHARED — any logged-in user ════ */}
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/book/:id" element={<RequireAuth><BookingPage /></RequireAuth>} />

          {/* ════ PLAYER ════ */}
          <Route path="/player-dashboard"
            element={<ProtectedRoute allowedRole="player"><PlayerDashboard /></ProtectedRoute>} />
          <Route path="/my-bookings"
            element={<ProtectedRoute allowedRole="player"><PlayerMyBookings /></ProtectedRoute>} />
          <Route path="/my-payments"
            element={<ProtectedRoute allowedRole="player"><PlayerPaymentHistory /></ProtectedRoute>} />
          <Route path="/notifications"
            element={<ProtectedRoute allowedRole="player"><PlayerNotifications /></ProtectedRoute>} />
          <Route path="/my-favorites"
            element={<ProtectedRoute allowedRole="player"><PlayerFavorites /></ProtectedRoute>} />

          {/* ════ OWNER ════ */}
          <Route path="/owner-dashboard"
            element={<ProtectedRoute allowedRole="owner"><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/add-ground"
            element={<ProtectedRoute allowedRole="owner"><OwnerAddGround /></ProtectedRoute>} />
          <Route path="/manage-grounds"
            element={<ProtectedRoute allowedRole="owner"><OwnerManageGround /></ProtectedRoute>} />
          <Route path="/owner-bookings"
            element={<ProtectedRoute allowedRole="owner"><OwnerBookings /></ProtectedRoute>} />
          <Route path="/owner-notifications"
            element={<ProtectedRoute allowedRole="owner"><OwnerNotifications /></ProtectedRoute>} />

          {/* ════ ADMIN ════ */}
          <Route path="/admin-dashboard"
            element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/grounds"
            element={<ProtectedRoute allowedRole="admin"><AdminGroundApproval /></ProtectedRoute>} />
          <Route path="/admin/ground/:id"
            element={<ProtectedRoute allowedRole="admin"><AdminGroundDetail /></ProtectedRoute>} />
          <Route path="/admin/users"
            element={<ProtectedRoute allowedRole="admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/bookings"
            element={<ProtectedRoute allowedRole="admin"><AdminBookings /></ProtectedRoute>} />
          <Route path="/admin/notifications"
            element={<ProtectedRoute allowedRole="admin"><AdminNotifications /></ProtectedRoute>} />

          {/* ════ 404 ════ */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}
