import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphService } from './graph.service';
import { GraphUpdateService } from './graph-update.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GraphController } from './graph.controller';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [GraphController],
  providers: [GraphService, GraphUpdateService],
  exports: [GraphService, GraphUpdateService],
})
export class GraphModule {}
