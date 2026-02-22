import hero1 from "../assets/hero1.jpg";
import hero2 from "../assets/hero2.jpg";

export default function Home() {
  return (
    <div className="pt-16">

      {/* Section 1 */}
      <section
        className="h-screen bg-cover bg-center relative"
        style={{ backgroundImage: `url(${hero1})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center">
          <div className="max-w-6xl mx-auto px-6 text-white">
            <h2 className="text-5xl font-bold mb-6">
              Find Your Ground
            </h2>
            <p className="text-lg mb-6 max-w-lg">
              Get instant information from every futsal available and suit to your schedule and budget.
            </p>
            <button className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg text-lg transition">
              View All
            </button>
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section
        className="h-screen bg-cover bg-center relative"
        style={{ backgroundImage: `url(${hero2})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center">
          <div className="max-w-6xl mx-auto px-6 text-white">
            <h2 className="text-5xl font-bold mb-6">
              Register Your Futsal
            </h2>
            <p className="text-lg mb-6 max-w-lg">
              List your futsal ground and manage bookings efficiently with real-time updates.
            </p>
            <button className="bg-yellow-400 hover:bg-yellow-500 px-6 py-3 rounded-lg text-black text-lg transition">
              Register Now
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-black text-white text-center py-4">
        © 2026 FutsalHub | Final Year Project
      </footer>
    </div>
  );
}