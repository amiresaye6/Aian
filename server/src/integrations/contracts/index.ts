/**
 * Barrel export for all shared provider contracts.
 *
 * Usage:
 * ```ts
 * import { Provider, EyeType, KnowledgeItem, ProviderAdapter } from '../integrations/contracts';
 * ```
 */

// Enums
export { Provider } from './provider.enum';
export { EyeType } from './eye-type.enum';

// Core data shape
export type { KnowledgeItem } from './knowledge-item.interface';

// Connection & Resources
export type {
  ProviderConnection,
  ConnectionVerificationResult,
  RefreshedCredentials,
} from './provider-connection.interface';
export type { ProviderResource } from './provider-resource.interface';
export type { ProviderCursor } from './provider-cursor.interface';

// Adapter & Collection
export type {
  ProviderAdapter,
  ProviderEventInput,
} from './provider-adapter.interface';
export type { CollectionStrategy } from './collection-strategy.interface';
export type { ProviderClient } from './provider-client.interface';
export type {
  CollectionResult,
  CollectionStats,
} from './collection-result.interface';

// Errors
export { ProviderErrorCode, ProviderError } from './provider-errors';

// Processor
export type {
  KnowledgeProcessorGateway,
  ProcessorHandoffResult,
} from './processor-gateway.interface';
