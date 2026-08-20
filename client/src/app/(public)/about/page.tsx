import { MarketingLayout } from "@/layouts/MarketingLayout";
import { AboutHero } from "@/components/features/about/AboutHero";
import { MissionVision } from "@/components/features/about/MissionVision";
import { ProblemSolved } from "@/components/features/about/ProblemSolved";
import { HowItWorks } from "@/components/features/about/HowItWorks";
import { ConnectedTools } from "@/components/features/about/ConnectedTools";
import { AboutCTA } from "@/components/features/about/AboutCTA";

export const metadata = {
  title: "About — AIAN",
  description:
    "AIAN is the organizational memory platform that turns scattered Slack threads, tickets, and meetings into one explainable knowledge graph.",
};

export default function AboutPage() {
  return (
    <MarketingLayout>
      <AboutHero />
      <MissionVision />
      <ProblemSolved />
      <HowItWorks />
      <ConnectedTools />
      <AboutCTA />
    </MarketingLayout>
  );
}