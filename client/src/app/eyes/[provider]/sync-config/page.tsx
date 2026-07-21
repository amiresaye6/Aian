import { IntegrationSyncConfig } from "@/components/features/integrations/IntegrationSyncConfig";
import { getProviderName } from "@/components/features/integrations/providers";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `sync config ${getProviderName(resolvedParams.provider)} — AIAN`,
  };
}

export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <IntegrationSyncConfig providerKey={resolvedParams.provider} />;
}
