import { MarketingLayout } from "@/layouts/MarketingLayout";
import { SecurityHero } from "@/components/features/security/SecurityHero";
import { SecurityPillars } from "@/components/features/security/SecurityPillars";
import { ResponsibleDisclosure } from "@/components/features/security/ResponsibleDisclosure";
import { VulnerabilityReporting } from "@/components/features/security/VulnerabilityReporting";

export const metadata = {
  title: "Security — AIAN",
  description:
    "How AIAN protects your organization's data — encryption, access control, verified webhooks, and responsible vulnerability disclosure.",
};

export default function SecurityPage() {
  return (
    <MarketingLayout>
      <SecurityHero />
      <SecurityPillars />
      <ResponsibleDisclosure />
      <VulnerabilityReporting />
    </MarketingLayout>
  );
}