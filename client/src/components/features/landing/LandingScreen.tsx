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
  SecurityTrust,
  Testimonials,
  Pricing,
  FinalCTA,
  IntegrationsMarquee,
} from "./sections";
import { MarketingLayout } from "@/layouts/MarketingLayout";

export function LandingScreen() {
  return (
    <MarketingLayout>
      <Hero />
      <IntegrationsMarquee />
      <Sources />
      <Pipeline />
      <Agents />
      <OrgMemory />
      <AskAian />
      <Reports />
      <SearchEverything />
      <WhyAian />
      <Architecture />
      <SecurityTrust />
      <FeatureGrid />
      <Testimonials />
      <Pricing />
      <FinalCTA />
    </MarketingLayout>
  );
}

export default LandingScreen;
