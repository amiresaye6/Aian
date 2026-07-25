import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeItem, KnowledgeArtifact, ArtifactType } from '@prisma/client';
import { KnowledgeAssembler } from '../../processor/assemblers/knowledge-assembler.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ZoomClientService } from './zoom-client.service';

@Injectable()
export class SlackAssemblerService implements KnowledgeAssembler {
    private readonly logger= new Logger(SlackAssemblerService.name)
    constructor(
        private readonly prismaService:PrismaService,
        private readonly zoomClientService:ZoomClientService
    ){}
    
    supports(provider: string): boolean {
        return provider.toLowerCase() === 'zoom';
    }

    async assemble(items: KnowledgeItem[]): Promise<Partial<KnowledgeArtifact>[]>{

        if (items.length === 0) return [];

        let artifacts:Partial<KnowledgeArtifact>[] = [];
        items.forEach(async(item:KnowledgeItem)=>{
            const organizationId= item.organizationId;

            const metadata:any= item?.metadata
            const knowledgeArtifact:Partial<KnowledgeArtifact> = {
                organizationId,
                type: 'meeting_outcome',
                provider: 'zoom',
                title: 'zoom meeting data',
                content: metadata?.summarization || item.content,
                participants: item.participants,
                metadata: item.metadata,
            }

            artifacts.push(knowledgeArtifact)
        })
        return artifacts;
    }

    
}
