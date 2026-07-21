import { IntegrationDetails } from "@/components/features/integrations/IntegrationDetails";
import { getProviderName } from "@/components/features/integrations/providers";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `details ${getProviderName(resolvedParams.provider)} — AIAN`,
  };
}

export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <IntegrationDetails providerKey={resolvedParams.provider} />;
}
