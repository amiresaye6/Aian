import {
  Hero,
  Sources,
  Pipeline,
  Agents,
  OrgMemory,
  AskAian,
  Reports,
  SearchEverything,
  WhyAian,
  Architecture,
  FeatureGrid,
  Testimonials,
  Pricing,
  FinalCTA,
} from "./sections";
import { MarketingLayout } from "@/layouts/MarketingLayout";

export function LandingScreen() {
  return (
    <MarketingLayout>
      <Hero />
      <Sources />
      <Pipeline />
      <Agents />
      <OrgMemory />
      <AskAian />
      <Reports />
      <SearchEverything />
      <WhyAian />
      <Architecture />
      <FeatureGrid />
      <Testimonials />
      <Pricing />
      <FinalCTA />
    </MarketingLayout>
  );
}

export default LandingScreen;
