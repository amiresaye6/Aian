export interface LegalSection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

export const termsDocument: LegalDocument = {
  title: "Terms of Service",
  lastUpdated: "August 2026",
  intro:
    "These terms govern your use of AIAN. By creating an account, you agree to the terms below.",
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      content: [
        "By creating an account or using AIAN, you agree to these Terms of Service. If you're accepting on behalf of an organization, you confirm that you have the authority to bind that organization to these terms.",
      ],
    },
    {
      id: "description",
      title: "Description of Service",
      content: [
        "AIAN is an organizational memory platform. It connects to workplace tools you authorize, collects the activity you select for monitoring, and organizes it into a searchable knowledge graph so your team can ask questions and get evidence-backed answers about your organization's work.",
        "AIAN currently supports the following integrations:",
      ],
      bullets: ["Slack", "Zoom", "Jira", "GitHub", "Trello", "Microsoft Teams"],
    },
    {
      id: "accounts",
      title: "Accounts & Responsibilities",
      content: [
        "You're responsible for keeping your account credentials secure and for activity that happens under your account. Organization owners are responsible for managing member access and permissions within their organization.",
      ],
      bullets: [
        "Provide accurate information when creating an account or organization.",
        "Notify us if you suspect unauthorized access to your account.",
        "Assign roles and permissions to members responsibly.",
      ],
    },
    {
      id: "billing",
      title: "Subscription & Billing",
      content: [
        "AIAN is offered on a subscription basis with a monthly or yearly billing cycle, chosen during onboarding. Access to core features requires an active subscription. If a payment fails or a subscription lapses, some functionality may be paused until it's resolved.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable Use",
      content: ["You agree not to:"],
      bullets: [
        "Use AIAN for any unlawful purpose.",
        "Attempt to access another organization's data or knowledge graph.",
        "Attempt to bypass rate limits, authentication, or other security controls.",
        "Reverse-engineer or misuse the platform to disrupt its normal operation.",
      ],
    },
    {
      id: "data-ownership",
      title: "Data Ownership",
      content: [
        "Your organization owns the data it connects to AIAN and the knowledge graph derived from it. We don't claim ownership over your Slack messages, tickets, code, or meeting content — we process it on your organization's behalf to power the platform.",
      ],
    },
    {
      id: "termination",
      title: "Termination",
      content: [
        "You may stop using AIAN and request removal of your organization's data at any time. We may suspend or terminate accounts that violate these terms, misuse the platform, or pose a security risk to other organizations.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      content: [
        "AIAN is provided as a graduation project. It is offered \"as is\" without warranties of any kind. To the fullest extent permitted by applicable law, we are not liable for indirect, incidental, or consequential damages arising from your use of the platform.",
      ],
    },
    {
      id: "changes",
      title: "Changes to These Terms",
      content: [
        "We may update these terms as the platform evolves. Material changes will be reflected by updating the \"Last updated\" date at the top of this page.",
      ],
    },
    {
      id: "governing-law",
      title: "Governing Law",
      content: [
        "These terms are provided for the purposes of this academic project and do not reference a specific jurisdiction's law. A production deployment of AIAN would require this section to be reviewed and finalized by legal counsel.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      content: [
        "Questions about these terms? You can reach us through the contact page linked below.",
      ],
    },
  ],
};

export const privacyDocument: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "August 2026",
  intro:
    "This policy explains what information AIAN collects, how it's used, and the choices you have. It reflects how the platform is actually built today, not generic boilerplate.",
  sections: [
    {
      id: "overview",
      title: "Overview",
      content: [
        "AIAN processes organizational activity in order to build a searchable knowledge graph for your team. This section-by-section policy describes exactly what that involves.",
      ],
    },
    {
      id: "collect",
      title: "Information We Collect",
      content: [
        "We collect only the following categories of information, and nothing beyond what's needed to operate the platform:",
      ],
      bullets: [
        "Account information — your full name, email, and organization details, provided at signup.",
        "Organizational activity — messages, tickets, pull requests, and meeting content from the providers your organization connects.",
        "Session information — basic technical data needed to keep you securely signed in.",
      ],
    },
    {
      id: "scope",
      title: "How We Use Your Information",
      content: [
        "We use the information we collect to build and maintain your organization's knowledge graph, power search and question-answering, manage your account and subscription, and keep the platform secure. We only collect activity from the specific channels, repositories, projects, or meeting sources your organization explicitly selects during setup — not an entire workspace by default.",
      ],
    },
    {
      id: "retention",
      title: "Data Retention",
      content: [
        "AIAN's ingestion pipeline temporarily stores the raw events it collects from connected providers — for example, a Slack message or a GitHub webhook payload — before turning them into your organization's knowledge graph.",
        "Once an ingestion batch has been fully processed and acknowledged, the underlying raw and pending items are automatically deleted after a configurable retention period, 15 days by default.",
        "This retention window applies to temporary ingestion data only. The knowledge artifacts and graph entities derived from it remain part of your organization's memory until you delete them or close your account.",
      ],
    },
    {
      id: "sharing",
      title: "Data Sharing",
      content: [
        "We do not sell your data, and we do not share it with third parties for advertising or marketing purposes. The only external systems your data touches are the providers you explicitly connect — Slack, Zoom, Jira, GitHub, Trello, and Microsoft Teams — and only to the extent needed to collect the activity you've asked AIAN to monitor.",
      ],
    },
    {
      id: "security",
      title: "Data Security",
      content: [
        "Provider access credentials are encrypted at rest, every request is checked against your role and permissions, incoming webhooks are cryptographically verified, and each organization's data is isolated at the database layer.",
        "For more detail on how this works, see our Security page.",
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      content: ["You can, at any time:"],
      bullets: [
        "Access the data associated with your account or organization.",
        "Request deletion of your account and associated data.",
        "Disconnect any provider integration, which stops further collection from it immediately.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      content: [
        "AIAN uses only the minimal, functional session storage needed to keep you signed in. We don't use third-party advertising trackers.",
      ],
    },
    {
      id: "children",
      title: "Children's Privacy",
      content: [
        "AIAN is a workplace tool intended for organizations and their employees. It is not directed at, and should not be used by, children.",
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      content: [
        "We may update this policy as the platform evolves. Material changes will be reflected by updating the \"Last updated\" date at the top of this page.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      content: [
        "Questions about this policy? You can reach us through the contact page linked below.",
      ],
    },
  ],
};