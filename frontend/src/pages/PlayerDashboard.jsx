import { useNavigate } from "react-router-dom";

export default function PlayerDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-20 px-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Player Dashboard ⚽</h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-red-500 to-black text-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-2">
          Welcome Back!
        </h2>
        <p>
          Book your favorite futsal ground and manage your reservations easily.
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">

        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-600">Total Bookings</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">5</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-600">Upcoming Matches</h3>
          <p className="text-3xl font-bold text-green-500 mt-2">2</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-600">Cancelled</h3>
          <p className="text-3xl font-bold text-yellow-500 mt-2">1</p>
        </div>

      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>

        <div className="flex flex-wrap gap-4">
          <button className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition">
            Book New Ground
          </button>

          <button className="bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition">
            View My Bookings
          </button>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold mb-4">Recent Bookings</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-3">Ground</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-100">
                <td className="py-3">Arena Futsal</td>
                <td>March 12, 2026</td>
                <td>6:00 PM - 7:00 PM</td>
                <td className="text-green-500 font-semibold">Confirmed</td>
              </tr>

              <tr className="border-b hover:bg-gray-100">
                <td className="py-3">City Sports</td>
                <td>March 10, 2026</td>
                <td>5:00 PM - 6:00 PM</td>
                <td className="text-yellow-500 font-semibold">Pending</td>
              </tr>

              <tr className="hover:bg-gray-100">
                <td className="py-3">Pro Turf</td>
                <td>March 8, 2026</td>
                <td>7:00 PM - 8:00 PM</td>
                <td className="text-red-500 font-semibold">Cancelled</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}