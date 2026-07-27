import { Injectable } from '@nestjs/common';
import { EvidenceNode } from './evidence-chain.service';

@Injectable()
export class ContextBuilderService {
  buildContext(evidenceChains: EvidenceNode[]): string {
    if (!evidenceChains || evidenceChains.length === 0) {
      return 'No relevant evidence found in the organizational knowledge graph.';
    }

    let contextString =
      'Below is the chronological Evidence Chain retrieved from the organizational knowledge graph:\n\n';

    evidenceChains.forEach((node, index) => {
      contextString += `--- [Evidence Node ${index + 1}] ---\n`;
      contextString += `Timestamp: ${node.timestamp.toISOString()}\n`;
      contextString += `Source: ${node.provider} (${node.type})\n`;

      if (node.title) {
        contextString += `Title: ${node.title}\n`;
      }

      contextString += `Content:\n${node.content || 'No content available.'}\n\n`;
    });

    contextString += '--- End of Evidence Chain ---\n';

    return contextString;
  }
}
