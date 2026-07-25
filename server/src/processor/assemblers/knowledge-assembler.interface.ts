import { KnowledgeItem, KnowledgeArtifact } from '@prisma/client';

export interface KnowledgeAssembler {
  /**
   * Identifies which provider this assembler is responsible for (e.g., "slack", "github")
   */
  supports(provider: string): boolean;

  /**
   * Groups and transforms raw KnowledgeItems into structured KnowledgeArtifacts.
   * 
   * @param items An array of raw KnowledgeItems that all share the same provider.
   * @returns An array of partial KnowledgeArtifact objects ready to be saved to Postgres.
   */
  assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]>;
}
