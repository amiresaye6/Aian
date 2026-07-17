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
}

export const PROVIDER_LIST: Provider[] = [
  {
    key: "jira",
    name: "Jira",
    category: "Engineering",
    tagline: "Sync issues, epics, and comments to provide context on ongoing engineering tasks.",
    brand: "#0052CC",
    status: "disconnected",
    glyph: Briefcase,
    health: 0,
    knowledgeItems: 0,
    lastSyncMin: 0,
    resourceLabel: "Projects",
    resources: 0,
    permissions: [
      { title: "Read issues & comments", description: "Read-only access to all issues, epics, and comments." },
      { title: "Read project metadata", description: "Access to project names, keys, and configurations." }
    ],
    scopes: ["read:jira-work", "read:jira-user"],
    workspace: "Acme Corp Jira",
    sampleResources: [
      { name: "Frontend Architecture", kind: "public", activity: "High" },
      { name: "Backend APIs", kind: "private", members: 12, activity: "Medium" }
    ]
  },
  {
    key: "github",
    name: "GitHub",
    category: "Engineering",
    tagline: "Ingest repositories, PRs, and commit history for deep codebase understanding.",
    brand: "#24292e",
    status: "connected",
    glyph: FileText,
    health: 98,
    knowledgeItems: 1450,
    lastSyncMin: 5,
    nextSyncMin: 55,
    resourceLabel: "Repositories",
    resources: 24,
    permissions: [
      { title: "Read repository contents", description: "Access to code, commits, and pull requests." },
      { title: "Read metadata", description: "Access to repository configurations and webhooks." }
    ],
    scopes: ["repo", "read:user"],
    workspace: "AcmeCorp GitHub Organization",
    sampleResources: [
      { name: "aian-core", kind: "private", members: 45, activity: "Very High" },
      { name: "aian-frontend", kind: "public", activity: "High" }
    ]
  },
  {
    key: "slack",
    name: "Slack",
    category: "Communication",
    tagline: "Index messages and threads to keep AIAN updated on team conversations.",
    brand: "#E01E5A",
    status: "unhealthy",
    glyph: MessageSquare,
    health: 65,
    knowledgeItems: 45200,
    lastSyncMin: 120,
    nextSyncMin: 0,
    resourceLabel: "Channels",
    resources: 142,
    permissions: [
      { title: "Read messages", description: "Access to messages and threads in public and private channels." },
      { title: "Read channel metadata", description: "Access to channel lists and user directories." }
    ],
    scopes: ["channels:history", "groups:history", "im:history", "mpim:history"],
    workspace: "Acme Corp Workspace",
    sampleResources: [
      { name: "#engineering", kind: "public", members: 89, activity: "Very High" },
      { name: "#leadership", kind: "private", members: 8, activity: "Low" }
    ]
  },
  {
    key: "zoom",
    name: "Zoom",
    category: "Meetings",
    tagline: "Transcribe and analyze meetings to capture verbal decisions and knowledge.",
    brand: "#2D8CFF",
    status: "disconnected",
    glyph: Video,
    health: 0,
    knowledgeItems: 0,
    lastSyncMin: 0,
    resourceLabel: "Recordings",
    resources: 0,
    permissions: [
      { title: "Read meeting recordings", description: "Access to cloud recordings and transcripts." },
      { title: "Read meeting metadata", description: "Access to meeting schedules and participant lists." }
    ],
    scopes: ["recording:read", "meeting:read"],
    workspace: "Acme Corp Zoom Account",
    sampleResources: [
      { name: "Weekly All Hands", kind: "public", members: 120, activity: "Weekly" },
      { name: "Exec Sync", kind: "private", members: 5, activity: "Bi-weekly" }
    ]
  }
];

export function getProvider(key: string): Provider {
  const provider = PROVIDER_LIST.find((p) => p.key === key);
  if (!provider) {
    return PROVIDER_LIST[0]; 
  }
  return provider;
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
