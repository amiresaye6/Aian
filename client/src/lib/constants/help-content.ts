export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export type FaqCategory =
  | "getting-started"
  | "eyes-integrations"
  | "members-roles"
  | "billing"
  | "security";

export interface FaqCategoryMeta {
  key: FaqCategory;
  label: string;
}

export const FAQ_CATEGORIES: FaqCategoryMeta[] = [
  { key: "getting-started", label: "Getting Started" },
  { key: "eyes-integrations", label: "Eyes & Integrations" },
  { key: "members-roles", label: "Members & Roles" },
  { key: "billing", label: "Billing" },
  { key: "security", label: "Security" },
];

export const FAQ_ITEMS: FaqItem[] = [
  // Getting Started
  {
    id: "gs-1",
    category: "getting-started",
    question: "What is AIAN?",
    answer:
      "AIAN is an organizational memory platform. It connects to the tools your team already uses — Slack, Zoom, Jira, GitHub, Trello, and Microsoft Teams — and turns everyday activity into a searchable, explainable knowledge graph so your team never loses context.",
  },
  {
    id: "gs-2",
    category: "getting-started",
    question: "How do I get my organization set up?",
    answer:
      "After creating your account, you'll choose a billing cycle, create your organization, and then connect at least one Eye (provider). Once an Eye is connected and resources are selected, AIAN starts collecting and organizing knowledge automatically.",
  },
  {
    id: "gs-3",
    category: "getting-started",
    question: "What is an \"Eye\"?",
    answer:
      "An Eye is AIAN's term for a connected data source — for example, your Slack workspace or GitHub organization. Each Eye watches selected channels, repositories, projects, or meetings and feeds that activity into your organization's knowledge graph.",
  },

  // Eyes & Integrations
  {
    id: "ei-1",
    category: "eyes-integrations",
    question: "Which providers does AIAN support?",
    answer:
      "AIAN currently supports six integrations: Slack (Chat), Zoom (Meetings), Jira (Tasks), GitHub (Coding), Trello (Tasks), and Microsoft Teams (Meetings). More providers are on our roadmap.",
  },
  {
    id: "ei-2",
    category: "eyes-integrations",
    question: "Does AIAN store my source code?",
    answer:
      "No. For the GitHub Eye, AIAN never collects source code, raw diffs, or file contents. It only tracks repository metadata, pull requests, issues, and comments — the conversation around the code, not the code itself.",
  },
  {
    id: "ei-3",
    category: "eyes-integrations",
    question: "Does AIAN store my meeting recordings?",
    answer:
      "No. For the Zoom Eye, AIAN never stores video files. It saves meeting metadata, transcript text when available, and a link to the original recording — the video itself always stays in Zoom.",
  },
  {
    id: "ei-4",
    category: "eyes-integrations",
    question: "What happens if I disconnect an Eye?",
    answer:
      "Disconnecting an Eye stops new data collection immediately. Previously collected knowledge stays in your organization's memory unless you explicitly request its removal.",
  },

  // Members & Roles
  {
    id: "mr-1",
    category: "members-roles",
    question: "How do I invite a teammate?",
    answer:
      "Go to Members in the sidebar, click Invite Member, enter their email, and choose a role. They'll receive an email invitation and can log in immediately — no waiting for manual approval.",
  },
  {
    id: "mr-2",
    category: "members-roles",
    question: "What's the difference between Owner, Admin, and Member roles?",
    answer:
      "Owner has full control over the organization, billing, and every setting. Admin can manage members, Eyes, and most settings but not billing or organization deletion. Member has read access based on the permissions assigned to their role.",
  },
  {
    id: "mr-3",
    category: "members-roles",
    question: "Can I create custom roles?",
    answer:
      "Yes. Organization Owners and permitted Admins can create custom roles with a specific set of permissions — for example, a \"Senior Engineer\" role with dashboard, Eyes, and integrations read access.",
  },

  // Billing
  {
    id: "bl-1",
    category: "billing",
    question: "How does billing work?",
    answer:
      "AIAN uses monthly or yearly billing cycles selected during onboarding. Your subscription controls access to the platform — an active subscription is required for normal usage.",
  },
  {
    id: "bl-2",
    category: "billing",
    question: "What happens if I reach my plan's member limit?",
    answer:
      "If you try to invite a member beyond your plan's limit, the invite is blocked and you'll see an upgrade prompt instead of an error. Upgrading your plan raises the limit immediately.",
  },

  // Security
  {
    id: "sec-1",
    category: "security",
    question: "How are my connected provider credentials protected?",
    answer:
      "All access and refresh tokens for connected providers are encrypted at rest before being stored. Raw tokens are never exposed in the UI or in API responses.",
  },
  {
    id: "sec-2",
    category: "security",
    question: "Who can see my organization's data?",
    answer:
      "Only members of your organization can access your knowledge graph, and access within the organization is governed by role-based permissions enforced on every backend request — not just hidden in the UI.",
  },
];