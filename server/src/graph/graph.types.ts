export interface GraphNode {
  id: string;            // Neo4j elementId or your app-level entity id
  label: string;         // short display name
  type: string;          // 'PERSON' | 'SYSTEM' | 'ORG' | ...
  degree: number;        // relationship count, used for sizing/prioritization
  artifactCount?: number; // cheap count, avoids fetching full artifact list up front
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;          // relationship type, e.g. 'REPORTS_TO'
  weight?: number;
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  meta: {
    truncated: boolean;   // true if more nodes exist beyond this page
    totalNodeCount: number;
  };
}
