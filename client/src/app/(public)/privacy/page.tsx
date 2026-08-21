import { MarketingLayout } from "@/layouts/MarketingLayout";
import { LegalPageLayout } from "@/components/features/legal/LegalPageLayout";
import { privacyDocument } from "@/components/features/legal/legal-content";

export const metadata = {
  title: "Privacy Policy — AIAN",
  description: "What AIAN collects, how it's used, and your rights.",
};

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <LegalPageLayout doc={privacyDocument} />
    </MarketingLayout>
  );
}