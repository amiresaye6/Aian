import { IntegrationIndex } from "@/components/features/integrations/IntegrationIndex";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Eyes — AIAN",
  description: "Connect your organization's systems as living AI Eyes for AIAN.",
};

export default function EyesIndexPage() {
  return <IntegrationIndex />;
}
