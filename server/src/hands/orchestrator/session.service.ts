import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type SessionState =
  | 'idle'
  | 'collecting_info'
  | 'confirming'
  | 'executing'
  | 'chaining'
  | 'awaiting_clarification'
  | 'awaiting_chain_confirmation';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateSession(organizationId: string, userId: string) {
    let session = await this.prisma.handsSession.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!session) {
      this.logger.debug(`Creating new session for user ${userId}`);
      session = await this.prisma.handsSession.create({
        data: {
          organizationId,
          userId,
          state: 'idle',
        },
      });
    }

    return session;
  }

  async updateSessionState(
    sessionId: string,
    state: SessionState,
    pendingAction?: any,
  ) {
    this.logger.debug(`Updating session ${sessionId} to state ${state}`);
    return this.prisma.handsSession.update({
      where: { id: sessionId },
      data: {
        state,
        pendingAction: pendingAction || null,
      },
    });
  }
}
