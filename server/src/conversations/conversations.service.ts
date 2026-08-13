import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(organizationId: string, userId: string, title: string) {
    return this.prisma.conversation.create({
      data: {
        organizationId,
        userId,
        title,
      },
    });
  }

  async getConversations(organizationId: string, userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        organizationId,
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getConversation(organizationId: string, userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
        organizationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async deleteConversation(organizationId: string, userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: {
        id: conversationId,
        organizationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return { success: true };
  }

  async searchConversations(organizationId: string, userId: string, query: string) {
    // Basic search across conversation titles and message contents
    const conversations = await this.prisma.conversation.findMany({
      where: {
        organizationId,
        userId,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            messages: {
              some: {
                content: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          where: {
            content: {
              contains: query,
              mode: 'insensitive',
            },
          },
          take: 1, // Include just one matching message for context
        },
      },
    });

    return conversations;
  }

  async addMessageToConversation(conversationId: string, role: 'user' | 'assistant', content: string) {
    // We update the conversation's updatedAt timestamp whenever a message is added
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversationId,
          role,
          content,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    });
  }
}
