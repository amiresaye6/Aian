import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphQueryDto } from './dto/graph-query.dto';
import { AuthGaurd } from '../auth/auth.gaurd';

@UseGuards(AuthGaurd)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get('visualize')
  async visualizeGraph(@Request() req: any, @Query() query: GraphQueryDto) {
    const orgId = req.user?.organizationId;
    return this.graphService.getRankedGraph(orgId, query);
  }

  @Get('nodes/:id/neighbors')
  async getNodeNeighbors(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user?.organizationId;
    return this.graphService.getNodeNeighbors(orgId, id);
  }

  @Get('nodes/:id/details')
  async getNodeDetails(@Request() req: any, @Param('id') id: string) {
    const orgId = req.user?.organizationId;
    return this.graphService.getNodeDetails(orgId, id);
  }
}
