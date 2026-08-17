import { IntegrationError } from "@/components/features/integrations/IntegrationError";
import { getProviderName } from "@/components/features/integrations/providers";
import { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Connection Error — ${getProviderName(resolvedParams.provider)} | AIAN`,
  };
}

export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <IntegrationError providerKey={resolvedParams.provider} />;
}
