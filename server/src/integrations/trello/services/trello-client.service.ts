import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderConnectionRepository } from '../../../ingestion/repositories/provider-connection.repository';
import { EncryptionService } from '../../../common/encryption.service';
import { ConfigService } from '@nestjs/config';
import {
  ProviderClient,
  ProviderConnection,
  ConnectionVerificationResult,
  ProviderResource,
  RefreshedCredentials,
} from '../../contracts';

import {
  TrelloCreateTaskInput,
  TrelloUpdateTaskInput,
  TrelloAssignTaskInput,
  TrelloMoveTaskInput,
  TrelloCommentTaskInput,
  TrelloDeleteTaskInput,
  TrelloListTasksInput,
  TrelloGetTaskInput,
} from '../../../hands/skills/schemas';

export class TrelloIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'TrelloIntegrationError';
  }
}

@Injectable()
export class TrelloClientService implements ProviderClient {
  private readonly logger = new Logger(TrelloClientService.name);
  private readonly TRELLO_BASE_URL = 'https://api.trello.com/1';

  constructor(
    private readonly encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly providerConnectionRepo: ProviderConnectionRepository,
    private readonly configService: ConfigService,
  ) {}

  private async getConnection(organizationId: string): Promise<ProviderConnection> {
    const provider = await this.prisma.provider.findUnique({
      where: { key: 'trello' },
    });

    if (!provider) {
      throw new Error('Trello provider configuration not found in the system.');
    }

    const connection = await this.prisma.providerConnection.findFirst({
      where: {
        providerId: provider.id,
        status: 'connected',
        organizationEye: {
          organizationId: organizationId,
        },
      },
      include: {
        organizationEye: true,
      }
    });

    if (!connection) {
      throw new Error(`No connected Trello connection found for org: ${organizationId}`);
    }

    return connection as any;
  }

  private async buildAuthParams(connection: ProviderConnection): Promise<{ key: string, token: string }> {
    const key = this.configService.get<string>('TRELLO_CLIENT_ID') || this.configService.get<string>('TRELLO_API_KEY');
    if (!key) throw new Error('TRELLO_CLIENT_ID or TRELLO_API_KEY is missing');
    if (!connection.accessTokenEncrypted) throw new Error('Connection missing access token');
    
    const token = this.encryptionService.decrypt(connection.accessTokenEncrypted);
    return { key, token };
  }

  private async executeRequest<T>(
    connection: ProviderConnection,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: Record<string, unknown>,
    retries = 3
  ): Promise<T> {
    const { key, token } = await this.buildAuthParams(connection);
    
    // Trello authentication is typically passed via query params
    const urlObj = new URL(`${this.TRELLO_BASE_URL}${endpoint}`);
    urlObj.searchParams.append('key', key);
    urlObj.searchParams.append('token', token);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios({
          method,
          url: urlObj.toString(),
          data,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          
          if (status === 429 && attempt < retries) {
            await new Promise(res => setTimeout(res, 1000 * attempt));
            continue;
          }
          if (status === 401 || status === 403) {
            throw new TrelloIntegrationError('UNAUTHORIZED', 'Invalid or expired Trello token', false, error.response?.data);
          }
          if (status === 404) {
            throw new TrelloIntegrationError('NOT_FOUND', 'Trello resource not found', false, error.response?.data);
          }
          if (status && status >= 500 && attempt < retries) {
            await new Promise(res => setTimeout(res, 1000 * attempt));
            continue;
          }
          if (status === 400) {
            throw new TrelloIntegrationError('BAD_REQUEST', `Trello API rejected the request: ${typeof error.response?.data === 'string' ? error.response.data : JSON.stringify(error.response?.data) || error.message}`, false, error.response?.data);
          }
        }
        throw new TrelloIntegrationError('TRELLO_API_ERROR', 'Failed to communicate with Trello', false, error);
      }
    }
    throw new Error('Trello request failed after max retries');
  }

  async verifyConnection(connection: ProviderConnection): Promise<ConnectionVerificationResult> {
    try {
      const user = await this.executeRequest<any>(connection, 'GET', '/members/me');
      return {
        isValid: true,
        message: 'Connection verified successfully.',
        accountName: user.fullName,
        accountId: user.id,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to verify Trello connection ${connection.id}`, error);
      if (error instanceof TrelloIntegrationError && error.code === 'UNAUTHORIZED') {
        return { isValid: false, message: 'Unauthorized: Token is invalid.' };
      }
      return { isValid: false, message: 'Failed to communicate with Trello API.' };
    }
  }

  async getResources(connection: ProviderConnection): Promise<ProviderResource[]> {
    try {
      const boards = await this.executeRequest<any[]>(connection, 'GET', '/members/me/boards');
      return boards.map(b => ({
        externalResourceId: b.id,
        name: b.name,
        resourceType: 'board',
        metadata: { url: b.shortUrl, closed: b.closed },
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch boards for ${connection.id}`, error);
      throw new Error('Failed to fetch Trello resources.');
    }
  }

  async onResourcesSelected(connection: ProviderConnection, selectedResources: ProviderResource[]): Promise<void> {
    const apiUrl = this.configService.get<string>('JIRA_API_URL');
    if (!apiUrl) {
      this.logger.error('Public API_URL is missing, cannot register Trello webhooks');
      return;
    }

    const webhookUrl = `${apiUrl}/integrations/trello/events?connectionId=${connection.id}`;
    const createdWebhookIds: string[] = [];

    for (const res of selectedResources) {
      const boardId = res.externalResourceId;
      try {
        const webhook = await this.executeRequest<any>(connection, 'POST', '/webhooks', {
          description: `AIAN Webhook for Board ${boardId}`,
          callbackURL: webhookUrl,
          idModel: boardId,
        });
        createdWebhookIds.push(webhook.id);
      } catch (err) {
        this.logger.warn(`Failed to create Trello webhook for board ${boardId}: ${err}`);
      }
    }

    const currentMetadata = connection.connectionMetadata as any;
    const existingWebhooks = currentMetadata?.webhookIds || [];

    await this.providerConnectionRepo.updateConnectionMetadata(connection.id, {
      ...currentMetadata,
      webhookIds: [...existingWebhooks, ...createdWebhookIds],
    });

    this.logger.log(`Registered ${createdWebhookIds.length} webhooks for Trello connection ${connection.id}`);
  }

  async onResourcesDeselected(connection: ProviderConnection, deselectedResources: ProviderResource[]): Promise<void> {
    // Trello doesn't easily let us query webhooks by idModel safely without hitting /tokens/{token}/webhooks
    // For now, we will track them globally and clean them up if they match
    try {
      const { token } = await this.buildAuthParams(connection);
      const webhooks = await this.executeRequest<any[]>(connection, 'GET', `/tokens/${token}/webhooks`);
      
      const toDelete = webhooks.filter(w => deselectedResources.some(r => r.externalResourceId === w.idModel));
      
      for (const w of toDelete) {
        await this.executeRequest(connection, 'DELETE', `/webhooks/${w.id}`);
      }

      this.logger.log(`Deleted ${toDelete.length} webhooks for Trello connection ${connection.id}`);
    } catch (err) {
      this.logger.warn(`Failed to cleanup Trello webhooks during deselection: ${err}`);
    }
  }

  async revokeCredentials(connection: ProviderConnection): Promise<void> {
    try {
      const currentMetadata = connection.connectionMetadata as any;
      const webhookIds: string[] = currentMetadata?.webhookIds || [];
      
      for (const id of webhookIds) {
        try {
          await this.executeRequest(connection, 'DELETE', `/webhooks/${id}`);
        } catch (err) {}
      }

      await this.providerConnectionRepo.update(connection.id, {
        status: 'disconnected',
        accessTokenEncrypted: '',
        refreshTokenEncrypted: null,
      });

      await this.prisma.organizationEye.updateMany({
        where: { id: connection.organizationEyeId },
        data: { status: 'disconnected' },
      });
    } catch (error) {
      this.logger.error(`Failed to revoke Trello credentials for connection ${connection.id}`, error);
    }
  }

  async syncHistoricalResource(
    connection: ProviderConnection,
    resource: ProviderResource,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: Record<string, unknown>[], nextCursor?: string) => Promise<void>,
  ): Promise<void> {
    this.logger.log(`Starting historical sync for Trello board ${resource.externalResourceId}`);
    
    // Trello action pagination uses 'since' and 'before' IDs.
    // For initial simplicity, we fetch up to 1000 actions at once if needed, or page using before cursor.
    try {
      const endpoint = `/boards/${resource.externalResourceId}/actions?limit=1000${cursor ? `&before=${cursor}` : ''}`;
      const actions = await this.executeRequest<any[]>(connection, 'GET', endpoint);
      
      if (actions.length > 0) {
        const nextCursor = actions[actions.length - 1].id;
        const rawEvents = actions.map(a => ({
          type: 'trello_historical_action',
          action: a, 
          model: { id: resource.externalResourceId },
          occurredAt: new Date(a.date),
        }));
        
        // Check if oldest action is still newer than fromDate
        const oldestDate = new Date(actions[actions.length - 1].date);
        if (oldestDate > fromDate && actions.length === 1000) {
          await savePageCallback(rawEvents, nextCursor);
        } else {
          await savePageCallback(rawEvents, undefined);
        }
      }
    } catch (err) {
      this.logger.error(`Historical sync failed for board ${resource.externalResourceId}`, err);
    }
  }

  async refreshCredentials(connection: ProviderConnection): Promise<RefreshedCredentials> {
    // Trello OAuth 1.0a tokens don't expire unless revoked
    throw new Error('Trello tokens do not support refresh flows.');
  }

  // --- REST Operations ---

  async getBoards(connection: ProviderConnection): Promise<any[]> {
    return this.executeRequest<any[]>(connection, 'GET', '/members/me/boards');
  }

  async getBoard(connection: ProviderConnection, boardId: string): Promise<any> {
    return this.executeRequest<any>(connection, 'GET', `/boards/${boardId}`);
  }

  async getLists(connection: ProviderConnection, boardId: string): Promise<any[]> {
    return this.executeRequest<any[]>(connection, 'GET', `/boards/${boardId}/lists`);
  }

  async getLabels(connection: ProviderConnection, boardId: string): Promise<any[]> {
    return this.executeRequest<any[]>(connection, 'GET', `/boards/${boardId}/labels`);
  }

  async getCard(connection: ProviderConnection, cardId: string): Promise<any> {
    return this.executeRequest<any>(connection, 'GET', `/cards/${cardId}`);
  }

  async createCard(connection: ProviderConnection, data: Record<string, unknown>): Promise<any> {
    return this.executeRequest<any>(connection, 'POST', '/cards', data);
  }

  async updateCard(connection: ProviderConnection, cardId: string, data: Record<string, unknown>): Promise<any> {
    return this.executeRequest<any>(connection, 'PUT', `/cards/${cardId}`, data);
  }

  // --- Business Methods ---

  async createTask(organizationId: string, input: TrelloCreateTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    let listId = await this.resolveList(connection, input.boardName, input.listName);

    if (!listId) {
      throw new Error('Cannot create Trello card: Could not resolve the specified board and list.');
    }

    const payload: any = {
      name: input.title,
      desc: input.description || '',
      idList: listId,
    };

    if (input.assignee) {
      payload.idMembers = [await this.resolveAssignee(connection, input.assignee)];
    }

    return this.createCard(connection, payload);
  }

  async updateTask(organizationId: string, input: TrelloUpdateTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    return this.updateCard(connection, cardId, input.fields || {});
  }

  async assignTask(organizationId: string, input: TrelloAssignTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    const memberId = await this.resolveAssignee(connection, input.assignee);
    return this.executeRequest(connection, 'POST', `/cards/${cardId}/idMembers`, {
      value: memberId
    });
  }

  async moveTask(organizationId: string, input: TrelloMoveTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    // For Trello, moving a card means changing its idList. TargetStatus is the list name or ID.
    // Try to resolve the list ID. We don't have boardName here, so if targetStatus isn't an ID, it might fail unless we fetch the card's board first.
    let targetListId = input.targetStatus;
    if (!/^[a-f0-9]{24}$/i.test(targetListId)) {
      try {
        const card = await this.getCard(connection, cardId);
        targetListId = await this.resolveList(connection, card.idBoard, targetListId);
      } catch (e) {
        this.logger.warn(`Could not resolve target list name ${targetListId} for moveTask. Proceeding directly.`);
      }
    }
    return this.updateCard(connection, cardId, { idList: targetListId });
  }

  async commentTask(organizationId: string, input: TrelloCommentTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    return this.executeRequest(connection, 'POST', `/cards/${cardId}/actions/comments`, {
      text: input.text
    });
  }

  async archiveTask(organizationId: string, input: TrelloDeleteTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    const result = await this.updateCard(connection, cardId, { closed: true });
    console.log("result from deletion is ", {systemMessage: "ticket deleted successfully", ...result})
    return {systemMessage: "ticket deleted successfully", ...result};
  }

  async listTasks(
    organizationId: string,
    input: TrelloListTasksInput,
  ): Promise<any[]> {
    const connection = await this.getConnection(organizationId);
    if (!input.boardName) {
      throw new Error('boardName is required to list Trello tasks.');
    }
    const boardId = await this.resolveBoard(connection, input.boardName);
    const url = input.listName
      ? `/lists/${await this.resolveList(connection, input.boardName, input.listName)}/cards`
      : `/boards/${boardId}/cards/visible`;

    const result = await this.executeRequest<any[]>(connection, 'GET', url);

    return result.map((card) => {
      const desc = typeof card.desc === 'string' ? card.desc.trim() : '';
      const hasRealDesc =
        desc.length > 0 && !/^(coming soon|tbd|todo|n\/a)\b/i.test(desc);

      const missing: string[] = [];
      if (!hasRealDesc) missing.push('description');
      if (!card.due) missing.push('due');
      if (!card.idMembers?.length) missing.push('members');
      if (!card.idLabels?.length) missing.push('labels');

      return {
        id: card.id,
        shortId: card.idShort,
        name: card.name,
        description: hasRealDesc ? desc : null,
        url: card.shortUrl ?? card.url,
        boardId: card.idBoard,
        listId: card.idList,
        archived: !!card.closed,
        due: card.due,
        dueComplete: !!card.dueComplete,
        labels: (card.labels ?? []).map((l: any) => l.name).filter(Boolean),
        memberIds: card.idMembers ?? [],
        lastActivity: card.dateLastActivity,
        activity: {
          comments: card.badges?.comments ?? 0,
          attachments: card.badges?.attachments ?? 0,
          checklist: card.badges?.checkItems
            ? {
                completed: card.badges.checkItemsChecked ?? 0,
                total: card.badges.checkItems,
              }
            : null,
        },
        missing,
      };
    });
  }

  async getTask(organizationId: string, input: TrelloGetTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const cardId = await this.resolveCard(connection, input.taskIdentifier);
    return this.getCard(connection, cardId);
  }

  // --- Private Resolvers ---

  private async resolveBoard(connection: ProviderConnection, boardNameOrId: string): Promise<string> {
    if (/^[a-f0-9]{24}$/i.test(boardNameOrId)) return boardNameOrId;
    const boards = await this.getBoards(connection);
    const lowerBoard = boardNameOrId.toLowerCase();
    
    const exactBoard = boards.find(b => b.name.toLowerCase() === lowerBoard);
    if (exactBoard) return exactBoard.id;
    
    const partialBoard = boards.find(b => b.name.toLowerCase().includes(lowerBoard));
    if (partialBoard) return partialBoard.id;
    
    throw new Error(`Board not found: "${boardNameOrId}". Please ask the user to clarify the correct board name.`);
  }

  private async resolveList(connection: ProviderConnection, boardNameOrId: string, listName: string): Promise<string> {
    if (/^[a-f0-9]{24}$/i.test(listName)) return listName;
    const boardId = await this.resolveBoard(connection, boardNameOrId);
    const lists = await this.getLists(connection, boardId);
    
    const lowerList = listName.toLowerCase();
    const exactList = lists.find(l => l.name.toLowerCase() === lowerList);
    if (exactList) return exactList.id;
    
    const partialList = lists.find(l => l.name.toLowerCase().includes(lowerList));
    if (partialList) return partialList.id;
    
    throw new Error(`List not found: "${listName}" on board "${boardNameOrId}". Please ask the user to clarify the correct list name.`);
  }

  private async resolveCard(connection: ProviderConnection, taskIdentifier: string): Promise<string> {
    if (/^[a-f0-9]{24}$/i.test(taskIdentifier)) return taskIdentifier;
    
    try {
      const searchUrl = `/search?query="${encodeURIComponent(taskIdentifier)}"&modelTypes=cards&card_fields=id,name,idBoard`;
      const response = await this.executeRequest<{cards: any[]}>(connection, 'GET', searchUrl);
      
      const cards = response.cards || [];
      if (cards.length > 0) {
        return cards[0].id;
      }
    } catch (e) {
      this.logger.warn(`Failed to search Trello card by name: ${taskIdentifier}`);
    }
    
    return taskIdentifier;
  }

  private async resolveAssignee(connection: ProviderConnection, assigneeName: string): Promise<string> {
    if (/^[a-f0-9]{24}$/i.test(assigneeName)) return assigneeName;
    
    try {
      const searchUrl = `/search?query="${encodeURIComponent(assigneeName)}"&modelTypes=members&member_fields=id,fullName,username`;
      const response = await this.executeRequest<{members: any[]}>(connection, 'GET', searchUrl);
      
      const members = response.members || [];
      if (members.length > 0) {
        return members[0].id;
      }
    } catch (e) {
      this.logger.warn(`Failed to search Trello member by name: ${assigneeName}`);
    }
    
    return assigneeName;
  }
}
