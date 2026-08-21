import { MarketingLayout } from "@/layouts/MarketingLayout";
import { LegalPageLayout } from "@/components/features/legal/LegalPageLayout";
import { termsDocument } from "@/components/features/legal/legal-content";

export const metadata = {
  title: "Terms of Service — AIAN",
  description: "The terms that govern your use of AIAN.",
};

export default function TermsPage() {
  return (
    <MarketingLayout>
      <LegalPageLayout doc={termsDocument} />
    </MarketingLayout>
  );
}