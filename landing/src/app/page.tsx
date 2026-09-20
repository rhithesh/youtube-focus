import { Cost } from "@/components/Cost";
import { FinalCTA, Footer } from "@/components/Closing";
import { Demo } from "@/components/Demo";
import { FAQ } from "@/components/FAQ";
import { Features } from "@/components/Features";
import { Hero } from "@/components/Hero";
import { Install } from "@/components/Install";
import { Navbar } from "@/components/Navbar";
import { Signals } from "@/components/Signals";
import { Strip } from "@/components/Strip";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <Navbar />
      <main>
        <Hero />
        <Strip />
        <Demo />
        {/*<Signals />*/}
        {/*<Features />*/}
        {/*<Cost />*/}
        <Install />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
