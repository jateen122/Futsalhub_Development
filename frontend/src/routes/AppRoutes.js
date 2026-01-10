import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import PlayerLogin from "../pages/PlayerLogin";
import PlayerRegister from "../pages/PlayerRegister";
import OwnerLogin from "../pages/OwnerLogin";
import OwnerRegister from "../pages/OwnerRegister";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Player */}
        <Route path="/player/login" element={<PlayerLogin />} />
        <Route path="/player/register" element={<PlayerRegister />} />

        {/* Owner */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/register" element={<OwnerRegister />} />

        <Route path="/futsals" element={<h2>All Futsals Page</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
