import { OrchestratorService, HandleDMInput } from '../orchestrator.service';
import { ForbiddenException } from '@nestjs/common';
import { AiGatewayService } from '../../../ai/ai-gateway.service';
import { SkillRegistryService } from '../../core/registry.service';
import { SessionService } from '../session.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';
import { ConnectionResolverService } from '../../core/connection-resolver.service';
import { UserResolverService } from '../../core/user-resolver.service';

describe('OrchestratorService - Chaining Regression', () => {
  let orchestrator: OrchestratorService;

  let aiGatewayMock: jest.Mocked<Partial<AiGatewayService>>;
  let skillRegistryMock: jest.Mocked<Partial<SkillRegistryService>>;
  let sessionServiceMock: jest.Mocked<Partial<SessionService>>;
  let prismaMock: any;
  let clientFactoryMock: jest.Mocked<Partial<ProviderClientFactory>>;
  let connectionResolverMock: jest.Mocked<Partial<ConnectionResolverService>>;
  let userResolverMock: jest.Mocked<Partial<UserResolverService>>;
  let providerClientMock: any;

  const defaultInput: HandleDMInput = {
    organizationId: 'org-1',
    connectionId: 'conn-1',
    teamId: 'team-1',
    userId: 'user-1',
    channelId: 'channel-1',
    text: 'Hello',
    threadTs: 'ts-1',
  };

  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      id: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      state: 'idle',
      pendingAction: null,
    };

    aiGatewayMock = {
      generateToolCalls: jest.fn(),
    };

    skillRegistryMock = {
      getAllDefinitions: jest.fn().mockReturnValue([]),
      resolve: jest.fn(),
    };

    sessionServiceMock = {
      getOrCreateSession: jest.fn().mockResolvedValue(mockSession),
      updateSessionState: jest
        .fn()
        .mockImplementation((id: string, state: string, ctx?: any) => {
          mockSession.state = state;
          if (ctx !== undefined) {
            mockSession.pendingAction = ctx;
          }
          return Promise.resolve(mockSession);
        }),
    };

    prismaMock = {
      providerConnection: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'conn-1', providerId: 'slack' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          fullName: 'Test User',
          email: 'test@example.com',
        }),
      },
      handsSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    providerClientMock = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    };

    clientFactoryMock = {
      getClient: jest.fn().mockReturnValue(providerClientMock),
    };

    connectionResolverMock = {
      resolveForSkill: jest
        .fn()
        .mockResolvedValue({ connections: [], missing: [] }),
    };

    userResolverMock = {
      resolveSlackUser: jest.fn().mockResolvedValue(undefined),
    };

    orchestrator = new OrchestratorService(
      aiGatewayMock as any,
      skillRegistryMock as any,
      sessionServiceMock as any,
      prismaMock,
      clientFactoryMock as any,
      connectionResolverMock as any,
      userResolverMock as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('REG-01: Simple question, no tools', async () => {
    // LLM responds with text only (no toolCalls)
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: 'I am a helpful assistant.',
        toolCalls: [],
      },
      usage: {},
    });

    await orchestrator.handleDM(defaultInput);

    // The orchestrator should send the text reply back
    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetId: 'channel-1',
        text: 'I am a helpful assistant.',
      }),
    );
  });

  it('REG-02: Single tool call (SendMessage)', async () => {
    // 1st iteration: returns tool call
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'SendMessage', input: { text: 'Hi' } },
        ],
      },
    });

    // 2nd iteration: returns final text
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: 'Message sent!',
        toolCalls: [],
      },
    });

    const mockSkillHandler = jest
      .fn()
      .mockResolvedValue({ success: true, data: { status: 'sent' } });
    (skillRegistryMock.resolve as jest.Mock).mockReturnValue({
      name: 'SendMessage',
      schema: {
        safeParse: jest.fn().mockReturnValue({ success: true }),
        toJSONSchema: jest.fn().mockReturnValue({}),
      },
      destructive: false,
      handler: mockSkillHandler,
    });

    await orchestrator.handleDM(defaultInput);

    // Executes the tool
    expect(mockSkillHandler).toHaveBeenCalled();
    // Responds with text
    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Message sent!' }),
    );
  });

  it('REG-03: Single destructive tool (DeleteTask)', async () => {
    // LLM emits one destructive tool call
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'DeleteTask', input: { taskId: '123' } },
        ],
      },
    });

    const mockSkillHandler = jest
      .fn()
      .mockResolvedValue({ success: true, data: { deleted: true } });
    (skillRegistryMock.resolve as jest.Mock).mockReturnValue({
      name: 'DeleteTask',
      schema: {
        safeParse: jest.fn().mockReturnValue({ success: true }),
        toJSONSchema: jest.fn().mockReturnValue({}),
      },
      destructive: true,
      handler: mockSkillHandler,
    });

    // 1st call
    await orchestrator.handleDM(defaultInput);

    // Session enters confirming (or awaiting_chain_confirmation) state
    expect(['confirming', 'awaiting_chain_confirmation']).toContain(
      mockSession.state,
    );
    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: expect.stringContaining('confirm'),
      }),
    );

    // Provide the final response for the chain resumption after user says yes
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: 'Task deleted successfully.',
        toolCalls: [],
      },
    });

    // 2nd call: Simulating user saying 'yes' triggers execution
    await orchestrator.handleDM({ ...defaultInput, text: 'yes' });

    expect(mockSkillHandler).toHaveBeenCalledWith(expect.anything(), {
      taskId: '123',
    });
  });

  it('REG-03b: Single destructive tool (Cancel)', async () => {
    // LLM emits one destructive tool call
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'DeleteTask', input: { taskId: '123' } },
        ],
      },
    });

    const mockSkillHandler = jest
      .fn()
      .mockResolvedValue({ success: true, data: { deleted: true } });
    (skillRegistryMock.resolve as jest.Mock).mockReturnValue({
      name: 'DeleteTask',
      schema: {
        safeParse: jest.fn().mockReturnValue({ success: true }),
        toJSONSchema: jest.fn().mockReturnValue({}),
      },
      destructive: true,
      handler: mockSkillHandler,
    });

    // 1st call
    await orchestrator.handleDM(defaultInput);

    // 2nd call: Simulating user saying 'no' cancels
    await orchestrator.handleDM({ ...defaultInput, text: 'no' });

    expect(mockSkillHandler).not.toHaveBeenCalled();
    // The session should transition back to idle
    expect(mockSession.state).toBe('idle');
  });

  it('REG-04: Two independent tools (SendMessage + SendEmail)', async () => {
    // LLM emits two tool calls in one response
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'call-1', name: 'SendMessage', input: { text: 'Hi' } },
          { id: 'call-2', name: 'SendEmail', input: { text: 'Hi' } },
        ],
      },
    });

    // Both execute in parallel, then LLM responds with summary text
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: 'Both sent!',
        toolCalls: [],
      },
    });

    const mockHandler1 = jest
      .fn()
      .mockResolvedValue({ success: true, data: {} });
    const mockHandler2 = jest
      .fn()
      .mockResolvedValue({ success: true, data: {} });

    (skillRegistryMock.resolve as jest.Mock).mockImplementation(
      (name: string) => {
        if (name === 'SendMessage')
          return {
            name,
            schema: {
              safeParse: jest.fn().mockReturnValue({ success: true }),
              toJSONSchema: jest.fn().mockReturnValue({}),
            },
            destructive: false,
            handler: mockHandler1,
          };
        if (name === 'SendEmail')
          return {
            name,
            schema: {
              safeParse: jest.fn().mockReturnValue({ success: true }),
              toJSONSchema: jest.fn().mockReturnValue({}),
            },
            destructive: false,
            handler: mockHandler2,
          };
        return null;
      },
    );

    await orchestrator.handleDM(defaultInput);

    expect(mockHandler1).toHaveBeenCalled();
    expect(mockHandler2).toHaveBeenCalled();
    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Both sent!' }),
    );
  });

  it('REG-05: Missing provider connection', async () => {
    // Tool call requires a provider that isn't connected
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call-1', name: 'SendEmail', input: { text: 'Hi' } }],
      },
    });

    // The tool result contains an error, which gets fed back to LLM
    (aiGatewayMock.generateToolCalls as jest.Mock).mockResolvedValueOnce({
      data: {
        role: 'assistant',
        content: 'Cannot send email because provider is missing.',
        toolCalls: [],
      },
    });

    (skillRegistryMock.resolve as jest.Mock).mockReturnValue({
      name: 'SendEmail',
      schema: {
        safeParse: jest.fn().mockReturnValue({ success: true }),
        toJSONSchema: jest.fn().mockReturnValue({}),
      },
      destructive: false,
      requiredProviders: ['gmail'],
      handler: jest.fn(),
    });

    (connectionResolverMock.resolveForSkill as jest.Mock).mockResolvedValueOnce(
      {
        connections: [],
        missing: ['gmail'],
      },
    );

    await orchestrator.handleDM(defaultInput);

    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: 'Cannot send email because provider is missing.',
      }),
    );
  });

  it('REG-06: Quota exceeded', async () => {
    // AiGatewayService.generateToolCalls throws ForbiddenException
    (aiGatewayMock.generateToolCalls as jest.Mock).mockRejectedValueOnce(
      new ForbiddenException('Quota exceeded'),
    );

    // The error is caught and sent to the user
    await orchestrator.handleDM(defaultInput);
    expect(providerClientMock.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        text: expect.stringContaining('Something went wrong'),
      }),
    );
  });
});
