import { FinalCTA, Footer } from "@/components/Closing";
import { FAQ } from "@/components/FAQ";
import { GoalLanes } from "@/components/GoalLanes";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Install } from "@/components/Install";
import { MotionRoot } from "@/components/MotionRoot";
import { Navbar } from "@/components/Navbar";
import { Platforms } from "@/components/Platforms";

export default function Home() {
  return (
    <MotionRoot>
      <Navbar />
      <main>
        <Hero />
        <GoalLanes />
        <HowItWorks />
        <Platforms />
        <Install />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </MotionRoot>
  );
}
