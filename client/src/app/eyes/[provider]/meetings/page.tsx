import { MeetingsDetails } from "@/components/features/meetings/MeetingDetails";
import { getProviderName } from "@/components/features/integrations/providers";
import { Metadata } from "next";
import { AppLayout } from "@/layouts/AppLayout";
 
export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `meetings ${getProviderName(resolvedParams.provider)} — AIAN`,
  };
}
 
export default async function Page({ params }: { params: Promise<{ provider: string }> }) {
  const resolvedParams = await params;
  return <MeetingsDetails providerKey={resolvedParams.provider} />

}
 