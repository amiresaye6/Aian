import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeAssembler } from './knowledge-assembler.interface';

@Injectable()
export class AssemblerFactory {
  private readonly logger = new Logger(AssemblerFactory.name);
  private readonly assemblers: KnowledgeAssembler[] = [];

  register(assembler: KnowledgeAssembler) {
    this.assemblers.push(assembler);
    this.logger.log(`Registered KnowledgeAssembler. Total: ${this.assemblers.length}`);
  }

  getAssembler(provider: string): KnowledgeAssembler | undefined {
    return this.assemblers.find((a) => a.supports(provider));
  }
}
