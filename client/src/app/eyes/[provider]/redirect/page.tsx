import { IntegrationRedirect } from "@/components/features/integrations/IntegrationRedirect";
import { getProviderName } from "@/components/features/integrations/providers";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `redirect ${getProviderName(resolvedParams.provider)} — AIAN`,
  };
}

export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <IntegrationRedirect providerKey={resolvedParams.provider} />;
}
