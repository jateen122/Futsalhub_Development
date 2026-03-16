import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[120px] font-black text-white/5 leading-none select-none">404</p>
        <p className="text-6xl -mt-8 mb-4">⚽</p>
        <h1 className="text-3xl font-black text-white mb-2">Page Not Found</h1>
        <p className="text-white/40 mb-8">Looks like this page kicked out of bounds.</p>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-3 bg-amber-400 text-black font-black rounded-xl hover:bg-amber-300 transition"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
