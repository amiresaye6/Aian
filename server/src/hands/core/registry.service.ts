import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

export interface SkillDefinition {
  name: string; // e.g. "MessagingSkill.sendMessage"
  description: string; // What it does, injected into prompt
  schema: z.ZodTypeAny; // The input schema
  destructive: boolean; // Requires human confirmation
  /** Provider keys that MUST be connected for this skill to execute. Missing = fail with user-friendly error. */
  requiredProviders: string[];
  /** Provider keys that are used if available but won't block execution if missing. */
  optionalProviders?: string[];
  handler: (ctx: any, input: any) => Promise<any>;
}

@Injectable()
export class SkillRegistryService {
  private readonly logger = new Logger(SkillRegistryService.name);
  private skills: Map<string, SkillDefinition> = new Map();

  register(definition: SkillDefinition) {
    if (this.skills.has(definition.name)) {
      this.logger.warn(
        `Skill ${definition.name} is already registered, overwriting.`,
      );
    }
    this.skills.set(definition.name, definition);
    this.logger.debug(`Registered skill: ${definition.name}`);
  }

  resolve(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /**
   * Used to generate the tool definitions for the LLM
   */
  getAllDefinitions(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }
}
