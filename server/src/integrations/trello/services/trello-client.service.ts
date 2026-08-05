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
  CreateTaskInput,
  UpdateTaskInput,
  AssignTaskInput,
  MoveTaskInput,
  CommentTaskInput,
  DeleteTaskInput,
  ListTasksInput,
  GetTaskInput,
} from '../../../hands/skills/schemas';

export class TrelloIntegrationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
    public readonly details?: any,
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
    const connection = await this.providerConnectionRepo.findByOrganizationEyeId(organizationId);
    if (!connection) throw new Error(`No connected Trello connection found for org: ${organizationId}`);
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
    data?: any,
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

  async onResourcesSelected(connection: ProviderConnection, selectedResources: any[]): Promise<void> {
    const apiUrl = this.configService.get<string>('TRELLO_API_URL') || this.configService.get<string>('API_URL') || this.configService.get<string>('JIRA_API_URL');
    if (!apiUrl) {
      this.logger.error('API_URL is missing, cannot register Trello webhooks');
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

  async onResourcesDeselected(connection: ProviderConnection, deselectedResources: any[]): Promise<void> {
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
    resource: any,
    fromDate: Date,
    cursor: string | undefined,
    savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
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
          data: a,
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

  async createCard(connection: ProviderConnection, data: any): Promise<any> {
    return this.executeRequest<any>(connection, 'POST', '/cards', data);
  }

  async updateCard(connection: ProviderConnection, cardId: string, data: any): Promise<any> {
    return this.executeRequest<any>(connection, 'PUT', `/cards/${cardId}`, data);
  }

  // --- Business Methods ---

  async createTask(organizationId: string, input: CreateTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    let listId = '';

    if (input.projectKey) {
      const lists = await this.getLists(connection, input.projectKey);
      if (lists.length > 0) {
        listId = lists[0].id;
      }
    }

    if (!listId) {
      throw new Error('Cannot create Trello card: A valid projectKey (boardId) with lists is required.');
    }

    return this.createCard(connection, {
      name: input.title,
      desc: input.description || '',
      idList: listId,
    });
  }

  async updateTask(organizationId: string, input: UpdateTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    const data: any = {};
    if (input.fields?.title) data.name = input.fields.title;
    if (input.fields?.description) data.desc = input.fields.description;
    
    return this.updateCard(connection, input.taskId, data);
  }

  async assignTask(organizationId: string, input: AssignTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    return this.executeRequest(connection, 'POST', `/cards/${input.taskId}/idMembers`, {
      value: input.assignee
    });
  }

  async moveTask(organizationId: string, input: MoveTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    return this.updateCard(connection, input.taskId, { idList: input.targetStatus });
  }

  async commentTask(organizationId: string, input: CommentTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    return this.executeRequest(connection, 'POST', `/cards/${input.taskId}/actions/comments`, {
      text: input.text
    });
  }

  async archiveTask(organizationId: string, input: DeleteTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    return this.updateCard(connection, input.taskId, { closed: true });
  }

  async listTasks(organizationId: string, input: ListTasksInput): Promise<any[]> {
    const connection = await this.getConnection(organizationId);
    if (!input.projectKey) {
      throw new Error('projectKey (boardId) is required to list Trello tasks.');
    }
    return this.executeRequest<any[]>(connection, 'GET', `/boards/${input.projectKey}/cards/visible`);
  }

  async getTask(organizationId: string, input: GetTaskInput): Promise<any> {
    const connection = await this.getConnection(organizationId);
    return this.getCard(connection, input.taskId);
  }
}
