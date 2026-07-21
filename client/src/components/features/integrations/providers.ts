import { Activity, Briefcase, FileText, LayoutDashboard, MessageSquare, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Provider {
  key: string;
  name: string;
  category: string;
  tagline: string;
  brand: string;
  status: "connected" | "unhealthy" | "connecting" | "disconnected";
  glyph: LucideIcon;
  health: number;
  knowledgeItems: number;
  lastSyncMin: number;
  nextSyncMin?: number;
  resourceLabel: string;
  resources: number;
  permissions: { title: string; description: string }[];
  scopes: string[];
  workspace?: string;
  sampleResources: { name: string; kind: string; members?: number; activity: string }[];
  connectionId?: string; // dynamically added from backend
  organizationEyeId?: string; // dynamically added from backend
}

export const PROVIDER_GLYPHS: Record<string, LucideIcon> = {
  jira: Briefcase,
  github: FileText,
  slack: MessageSquare,
  zoom: Video,
};

export function getProviderName(key: string): string {
  const names: Record<string, string> = {
    jira: "Jira",
    github: "GitHub",
    slack: "Slack",
    zoom: "Zoom",
  };
  return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatAgo(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export function formatIn(minutes: number | undefined): string {
  if (minutes === undefined) return "N/A";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours} hr`;
  return `in ${Math.floor(hours / 24)} days`;
}
