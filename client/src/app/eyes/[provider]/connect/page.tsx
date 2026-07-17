import { IntegrationConnect } from "@/components/features/integrations/IntegrationConnect";
import { getProvider } from "@/components/features/integrations/providers";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `connect ${getProvider(resolvedParams.provider).name} — AIAN`,
  };
}

export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <IntegrationConnect providerKey={resolvedParams.provider} />;
}
