import about1 from "../assets/aboutpg1.jpg";
import about2 from "../assets/aboutpg2.jpg";

export default function About() {
  return (
    <div className="bg-gray-50 text-gray-800">

      {/* HERO SECTION */}
      <section className="pt-28 pb-24 text-center bg-gray-100 px-6">

        <h1 className="text-6xl md:text-7xl font-extrabold mb-6 tracking-tight">
          About FutsalHub
        </h1>

        <p className="max-w-5xl mx-auto text-2xl text-gray-600 leading-relaxed">
          FutsalHub is a modern platform designed to simplify futsal court booking.
          Players can easily discover available futsal grounds while owners manage
          schedules, bookings, and revenue through a powerful digital dashboard.
        </p>

      </section>


      {/* MISSION SECTION */}
      <section className="w-full px-10 lg:px-28 py-24 grid lg:grid-cols-2 gap-20 items-center">

        {/* Image */}
        <div className="overflow-hidden rounded-2xl shadow-2xl">
          <img
            src={about1}
            alt="Futsal Game"
            className="w-full h-[460px] object-cover hover:scale-105 transition duration-500"
          />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-5xl font-bold mb-8">
            Our Mission
          </h2>

          <p className="text-xl text-gray-600 mb-6 leading-relaxed">
            In Nepal, futsal bookings are often handled manually through
            phone calls and social media messages. This leads to confusion,
            double bookings, and wasted time for both players and futsal owners.
          </p>

          <p className="text-xl text-gray-600 leading-relaxed">
            FutsalHub solves this problem by providing a centralized digital
            platform where players can check real-time availability, book courts
            instantly, and make payments online. Owners gain powerful tools to
            manage bookings, schedules, and revenue efficiently.
          </p>
        </div>

      </section>


      {/* WHY SECTION */}
      <section className="bg-white py-24">

        <div className="w-full px-10 lg:px-28 grid lg:grid-cols-2 gap-20 items-center">

          {/* Text */}
          <div>
            <h2 className="text-5xl font-bold mb-8">
              Why FutsalHub?
            </h2>

            <p className="text-xl text-gray-600 mb-6 leading-relaxed">
              Futsal is rapidly growing in Nepal, but most courts still rely
              on manual booking systems. This creates inefficiencies,
              scheduling conflicts, and poor record keeping.
            </p>

            <p className="text-xl text-gray-600 leading-relaxed">
              With FutsalHub, players can easily search futsal courts,
              compare prices, and book available slots instantly. The platform
              ensures transparency, reduces manual work, and brings the entire
              futsal community onto a modern digital ecosystem.
            </p>
          </div>

          {/* Image */}
          <div className="overflow-hidden rounded-2xl shadow-2xl">
            <img
              src={about2}
              alt="Futsal Goal"
              className="w-full h-[460px] object-cover hover:scale-105 transition duration-500"
            />
          </div>

        </div>

      </section>


      {/* FEATURES */}
      <section className="py-24 px-10 lg:px-28 bg-gray-100">

        <h2 className="text-5xl font-bold text-center mb-16">
          What We Offer
        </h2>

        <div className="grid md:grid-cols-3 gap-14 text-center">

          <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-4">
              Easy Booking
            </h3>

            <p className="text-lg text-gray-600">
              Instantly check futsal availability and reserve courts
              in real time without making phone calls.
            </p>
          </div>


          <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-4">
              Owner Dashboard
            </h3>

            <p className="text-lg text-gray-600">
              Futsal owners can manage bookings, schedules,
              and track their earnings from one dashboard.
            </p>
          </div>


          <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-2xl transition">
            <h3 className="text-2xl font-semibold mb-4">
              Secure Payments
            </h3>

            <p className="text-lg text-gray-600">
              Integrated payment systems allow safe and
              transparent online transactions.
            </p>
          </div>

        </div>

      </section>


      {/* FOOTER */}
      <footer className="bg-black text-white text-center py-5 text-lg">
        © 2026 FutsalHub | Final Year Project
      </footer>

    </div>
  );
}