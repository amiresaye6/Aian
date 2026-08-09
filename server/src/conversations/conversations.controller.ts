import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SearchConversationsDto } from './dto/search-conversations.dto';
import { AuthGaurd } from '../auth/auth.gaurd';
import { RolesGuards } from '../roles_permissions/roles.guard';
import { RequiredPermissions } from '../decorators/required-permissions.decorator';

@Controller('conversations')
@UseGuards(AuthGaurd, RolesGuards)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @RequiredPermissions('chat.use')
  async createConversation(
    @Request() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    return this.conversationsService.createConversation(organizationId, userId, dto.title);
  }

  @Get()
  @RequiredPermissions('chat.use')
  async getConversations(@Request() req: any) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    return this.conversationsService.getConversations(organizationId, userId);
  }

  @Get('search')
  @RequiredPermissions('chat.use')
  async searchConversations(
    @Request() req: any,
    @Query() query: SearchConversationsDto,
  ) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    return this.conversationsService.searchConversations(organizationId, userId, query.q);
  }

  @Get(':id')
  @RequiredPermissions('chat.use')
  async getConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    return this.conversationsService.getConversation(organizationId, userId, id);
  }

  @Delete(':id')
  @RequiredPermissions('chat.use')
  async deleteConversation(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    return this.conversationsService.deleteConversation(organizationId, userId, id);
  }
}
