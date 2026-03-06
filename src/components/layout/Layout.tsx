import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import FloatingParticles from "@/components/tools/FloatingParticles";

const Layout = () => {
  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0a3d24 0%, #0F5132 30%, #1a5c3a 60%, #0d4a2e 100%)",
      }}
    >
      <FloatingParticles />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
