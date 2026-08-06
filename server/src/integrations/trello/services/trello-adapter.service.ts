import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ProviderAdapter,
  ProviderEventInput,
  KnowledgeItem,
  Provider,
  EyeType,
} from '../../contracts';

@Injectable()
export class TrelloAdapterService implements ProviderAdapter {
  private readonly logger = new Logger(TrelloAdapterService.name);

  normalizeEvent(input: ProviderEventInput): KnowledgeItem[] {
    const payload = input.rawPayload as Record<string, unknown>;
    
    // Trello webhooks deliver actions wrapped in an 'action' object
    const action = payload.action as Record<string, unknown> | undefined;

    if (!action) {
      this.logger.warn(`Received Trello payload without an action object: ${input.rawEventReference}`);
      return [];
    }

    const actionType = action.type as string | undefined;

    if (!actionType || typeof actionType !== 'string') {
      this.logger.warn(`Received Trello action without a valid type: ${input.rawEventReference}`);
      return [];
    }

    const items: KnowledgeItem[] = [];
    const eventType = this.mapEventType(actionType);

    this.logger.debug(`Normalizing Trello event: ${actionType} -> ${eventType}`);

    try {
      // 1. Card Events
      if (
        actionType === 'createCard' ||
        actionType === 'updateCard' ||
        actionType === 'deleteCard' ||
        actionType === 'moveCardToBoard' ||
        actionType === 'moveCardFromBoard' ||
        actionType === 'copyCard' ||
        actionType === 'emailCard'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.card) {
            items.push(this.mapCard(input, data.card as Record<string, unknown>, action, eventType));
          }
        }
      }

      // 2. Comment Events
      if (
        actionType === 'commentCard' ||
        actionType === 'updateComment' ||
        actionType === 'deleteComment'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.card && data.text) { // new comments use data.text, update uses data.action.text
            items.push(this.mapComment(input, data.card as Record<string, unknown>, data as Record<string, unknown>, action, eventType));
          } else if (data.card && data.action) {
            const commentAction = data.action as Record<string, unknown>;
            items.push(this.mapComment(input, data.card as Record<string, unknown>, commentAction, action, eventType));
          }
        }
      }

      // 3. Attachment Events
      if (
        actionType === 'addAttachmentToCard' ||
        actionType === 'deleteAttachmentFromCard'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.card && data.attachment) {
            items.push(this.mapAttachment(input, data.card as Record<string, unknown>, data.attachment as Record<string, unknown>, action, eventType));
          }
        }
      }

      // 4. Member Assignment Events
      if (
        actionType === 'addMemberToCard' ||
        actionType === 'removeMemberFromCard'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.card && action.member) {
            items.push(this.mapMemberAction(input, data.card as Record<string, unknown>, action.member as Record<string, unknown>, action, eventType));
          }
        }
      }

      // 5. List Events
      if (
        actionType === 'createList' ||
        actionType === 'updateList' ||
        actionType === 'moveListFromBoard' ||
        actionType === 'moveListToBoard'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.list) {
            items.push(this.mapList(input, data.list as Record<string, unknown>, action, eventType));
          }
        }
      }

      // 6. Board Events
      if (actionType === 'updateBoard') {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.board) {
            items.push(this.mapBoard(input, data.board as Record<string, unknown>, action, eventType));
          }
        }
      }

      // 7. Label Events
      if (
        actionType === 'addLabelToCard' ||
        actionType === 'removeLabelFromCard'
      ) {
        if (action.data) {
          const data = action.data as Record<string, unknown>;
          if (data.card && data.label) {
            items.push(this.mapLabel(input, data.card as Record<string, unknown>, data.label as Record<string, unknown>, action, eventType));
          }
        }
      }

      if (items.length === 0) {
        this.logger.debug(`Unsupported or empty Trello event: ${actionType}`);
      }

      return items;
    } catch (error) {
      this.logger.error(`Error normalizing Trello payload for action ${actionType}`, error);
      // Gracefully return whatever was successfully mapped, or empty
      return items;
    }
  }

  private mapEventType(actionType: string): string {
    switch (actionType) {
      case 'createCard':
      case 'copyCard':
      case 'emailCard':
        return 'card_created';
      case 'updateCard':
      case 'moveCardToBoard':
      case 'moveCardFromBoard':
        return 'card_updated';
      case 'deleteCard':
        return 'card_deleted';
      case 'commentCard':
        return 'comment_created';
      case 'updateComment':
        return 'comment_updated';
      case 'deleteComment':
        return 'comment_deleted';
      case 'addAttachmentToCard':
        return 'attachment_created';
      case 'deleteAttachmentFromCard':
        return 'attachment_deleted';
      case 'createList':
        return 'list_created';
      case 'updateList':
      case 'moveListFromBoard':
      case 'moveListToBoard':
        return 'list_updated';
      case 'updateBoard':
        return 'board_updated';
      case 'addMemberToCard':
        return 'member_added';
      case 'removeMemberFromCard':
        return 'member_removed';
      case 'addLabelToCard':
        return 'label_added';
      case 'removeLabelFromCard':
        return 'label_removed';
      default:
        return actionType; // Fallback to raw string if unsupported mapping
    }
  }

  private mapCard(
    input: ProviderEventInput,
    card: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const data = action.data as Record<string, unknown> | undefined;
    const board = data?.board as Record<string, unknown> | undefined;
    const list = data?.list as Record<string, unknown> | undefined;
    
    const title = card.name as string | undefined;
    const description = card.desc as string | undefined;
    const url = card.shortUrl as string | undefined;
    const id = card.id as string | undefined;

    let content = '';
    let displayTitle = title || 'Untitled Card';
    const actionType = action.type as string;

    if (actionType === 'updateCard') {
      const old = data?.old as Record<string, unknown> | undefined;
      const listAfter = data?.listAfter as Record<string, unknown> | undefined;
      const listBefore = data?.listBefore as Record<string, unknown> | undefined;
      
      if (old?.idList && listAfter && listBefore) {
        displayTitle = `Card moved to list: ${listAfter.name}`;
        content = `Card "${title}" was moved from list "${listBefore.name}" to "${listAfter.name}".`;
      } else if (old?.closed !== undefined) {
        const isClosed = card.closed as boolean;
        displayTitle = `Card ${isClosed ? 'Archived' : 'Unarchived'}: ${title}`;
        content = `Card "${title}" was ${isClosed ? 'archived' : 'unarchived'}.`;
      } else if (old?.desc !== undefined) {
        displayTitle = `Card Description Updated: ${title}`;
        content = `Description updated.\nNew Description: ${description || '(empty)'}`;
      } else if (old?.name !== undefined) {
        displayTitle = `Card Renamed to: ${title}`;
        content = `Card was renamed from "${old.name}" to "${title}".`;
      } else {
        displayTitle = `Card Updated: ${title}`;
        content = `Card "${title}" was updated.`;
      }
    } else if (actionType === 'createCard') {
      displayTitle = `Card Created: ${title}`;
      content = `Card created in list "${list?.name || 'Unknown'}".\nTitle: ${title || ''}`;
      if (description) {
        content += `\nDescription: ${description}`;
      }
    } else {
      displayTitle = `${actionType}: ${title}`;
      content = `Title: ${title || ''}\n`;
      if (description) {
        content += `\nDescription: ${description}`;
      }
    }

    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();

    const participants = [];
    if (memberCreator) {
      participants.push({
        externalId: memberCreator.id as string,
        name: (memberCreator.fullName as string) || (memberCreator.username as string) || 'Unknown',
      });
    }
    const member = action.member as Record<string, unknown> | undefined;
    if (member && actionType === 'addMemberToCard') {
        participants.push({
            externalId: member.id as string,
            name: (member.fullName as string) || (member.username as string) || (member.name as string) || 'Unknown',
        });
    }

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'card',
      eventType,
      externalResourceId: id || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (board?.id as string | undefined) || (list?.id as string | undefined) || null,
      title: displayTitle,
      content: content.trim(),
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: participants,
      contextLocation: board?.name ? `Board: ${board.name}${list?.name ? ` -> List: ${list.name}` : ''}` : null,
      sourceUrl: url || null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        cardId: card.id,
        boardId: board?.id,
        boardName: board?.name,
        listId: list?.id,
        listName: list?.name,
        closed: card.closed,
        due: card.due,
        dueComplete: card.dueComplete,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapComment(
    input: ProviderEventInput,
    card: Record<string, unknown>,
    commentData: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const text = commentData.text as string | undefined;
    const data = action.data as Record<string, unknown> | undefined;
    const board = data?.board as Record<string, unknown> | undefined;
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'comment',
      eventType,
      externalResourceId: (action.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (card.id as string | undefined) || null,
      title: `Comment on Card: ${card.name || 'Unknown'}`,
      content: text || '[Empty Comment]',
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: memberCreator ? [{
        externalId: (memberCreator.id as string) || '',
        name: (memberCreator.fullName as string) || (memberCreator.username as string) || 'Unknown',
      }] : [],
      contextLocation: board?.name ? `Board: ${board.name}` : null,
      sourceUrl: null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        commentId: commentData.id,
        cardId: card.id,
        cardName: card.name,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapAttachment(
    input: ProviderEventInput,
    card: Record<string, unknown>,
    attachment: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const name = attachment.name as string | undefined;
    const url = attachment.url as string | undefined;
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'attachment',
      eventType,
      externalResourceId: (attachment.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (card.id as string | undefined) || null,
      title: `Attachment: ${name || 'Untitled'}`,
      content: `Attached file/link: ${url || 'Unknown URL'}\nTo Card: ${card.name}`,
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: [],
      contextLocation: null,
      sourceUrl: url || null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        attachmentId: attachment.id,
        cardId: card.id,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapMemberAction(
    input: ProviderEventInput,
    card: Record<string, unknown>,
    member: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();
    const actionType = action.type as string;

    const actionText = actionType === 'addMemberToCard' ? 'added to' : 'removed from';

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'card_member',
      eventType,
      externalResourceId: (member.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (card.id as string | undefined) || null,
      title: `Member ${actionText} Card: ${card.name}`,
      content: `Member ${(member.name as string) || (member.username as string) || 'Unknown'} was ${actionText} the card.`,
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: [
        {
          externalId: (member.id as string) || '',
          name: (member.fullName as string) || (member.username as string) || (member.name as string) || 'Unknown',
        }
      ],
      contextLocation: null,
      sourceUrl: null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        memberId: member.id,
        cardId: card.id,
        action: actionType,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapLabel(
    input: ProviderEventInput,
    card: Record<string, unknown>,
    label: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();
    const actionType = action.type as string;

    const actionText = actionType === 'addLabelToCard' ? 'added to' : 'removed from';
    const labelName = (label.name as string) || (label.color as string) || 'Unknown Label';

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'label',
      eventType,
      externalResourceId: (label.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (card.id as string | undefined) || null,
      title: `Label ${actionText} Card: ${card.name || 'Untitled'}`,
      content: `Label "${labelName}" was ${actionText} the card.`,
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: [],
      contextLocation: null,
      sourceUrl: null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        labelId: label.id,
        labelName: label.name,
        labelColor: label.color,
        cardId: card.id,
        action: actionType,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapList(
    input: ProviderEventInput,
    list: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const data = action.data as Record<string, unknown> | undefined;
    const board = data?.board as Record<string, unknown> | undefined;
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'list',
      eventType,
      externalResourceId: (list.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: (board?.id as string | undefined) || null,
      title: `List: ${list.name || 'Untitled'}`,
      content: `List state changed on Board: ${board?.name || 'Unknown'}`,
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: [],
      contextLocation: board?.name ? `Board: ${board.name}` : null,
      sourceUrl: null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        listId: list.id,
        boardId: board?.id,
        closed: list.closed,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  private mapBoard(
    input: ProviderEventInput,
    board: Record<string, unknown>,
    action: Record<string, unknown>,
    eventType: string,
  ): KnowledgeItem {
    const memberCreator = action.memberCreator as Record<string, unknown> | undefined;
    const actionDate = (action.date as string) || new Date().toISOString();

    return {
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      eyeType: 'task_management' as EyeType,
      provider: Provider.TRELLO,
      sourceType: 'board',
      eventType,
      externalResourceId: (board.id as string | undefined) || 'unknown',
      externalEventId: (action.id as string | undefined) || null,
      parentExternalResourceId: null,
      title: `Board: ${board.name || 'Untitled'}`,
      content: `Board settings were updated.`,
      author: {
        externalId: (memberCreator?.id as string) || '',
        name: (memberCreator?.fullName as string) || (memberCreator?.username as string) || 'Unknown',
        email: undefined,
      },
      participants: [],
      contextLocation: null,
      sourceUrl: (board.shortUrl as string | undefined) || null,
      occurredAt: new Date(actionDate),
      receivedAt: new Date(),
      visibility: 'ORGANIZATION',
      metadata: {
        boardId: board.id,
        closed: board.closed,
      },
      rawPayloadReference: input.rawEventReference,
      version: '1',
    };
  }

  getIdempotencyKey(item: KnowledgeItem): string {
    const org = item.organizationId;
    const id = item.externalEventId || 'unknown';

    if (item.sourceType === 'card' || item.sourceType === 'list' || item.sourceType === 'board') {
      const updated = item.occurredAt.getTime();
      return `trello:${org}:${item.sourceType}:${id}:${updated}`;
    }

    if (item.sourceType === 'comment' || item.sourceType === 'attachment' || item.sourceType === 'card_member') {
      return `trello:${org}:${item.sourceType}:${id}`;
    }

    return `trello:${org}:${item.sourceType}:${id}`;
  }

  getExternalResourceId(input: ProviderEventInput): string {
    const payload = input.rawPayload as Record<string, unknown>;
    const action = payload.action as Record<string, unknown> | undefined;
    if (!action) return 'unknown';

    const data = action.data as Record<string, unknown> | undefined;
    if (!data) return 'unknown';

    if (data.card) {
      return (data.card as Record<string, unknown>).id as string;
    }
    if (data.list) {
      return (data.list as Record<string, unknown>).id as string;
    }
    if (data.board) {
      return (data.board as Record<string, unknown>).id as string;
    }

    return 'unknown';
  }

  getExternalEventId(input: ProviderEventInput): string | null {
    const payload = input.rawPayload as Record<string, unknown>;
    const action = payload.action as Record<string, unknown> | undefined;
    if (action?.id) {
      return action.id.toString();
    }
    return null;
  }
}
