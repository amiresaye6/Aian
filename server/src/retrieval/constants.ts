export const RETRIEVAL_CONSTANTS = {
  // Graph traversal limits
  GRAPH_MAX_HOPS: 3,

  // Max number of evidence chains to retrieve (top N nodes from graph)
  MAX_EVIDENCE_CHAINS: 15,

  // Ranking weights (multiplier for node importance)
  RANKING_WEIGHTS: {
    Project: 1.0,
    System: 0.9,
    Feature: 0.8,
    API: 0.8,
    Database: 0.8,
    Artifact: 0.7, // Base artifacts like PRs, Tickets, Meetings
    Person: 0.5,
  },

  // Artifact Type specific ranking overrides
  ARTIFACT_TYPE_WEIGHTS: {
    github_pull_request: 1.0, // High impact
    jira_ticket: 0.9,
    zoom_meeting: 0.8,
    slack_conversation: 0.7,
  },
};
