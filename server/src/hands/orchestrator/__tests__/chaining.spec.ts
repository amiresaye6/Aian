import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService, HandleDMInput } from '../orchestrator.service';
import { AiGatewayService } from '../../../ai/ai-gateway.service';
import { SkillRegistryService } from '../../core/registry.service';
import { SessionService } from '../session.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProviderClientFactory } from '../../../integrations/provider-client.factory';
import { ConnectionResolverService } from '../../core/connection-resolver.service';

describe('OrchestratorService - Chaining', () => {
  let service: OrchestratorService;

  let sendMessageMock: jest.Mock;
  let aiGatewayMock: any;
  let skillRegistryMock: any;
  let sessionServiceMock: any;
  let prismaMock: any;
  let clientFactoryMock: any;
  let connectionResolverMock: any;

  let mockSkills: Record<string, any>;

  const defaultInput: HandleDMInput = {
    organizationId: 'org-1',
    connectionId: 'conn-1',
    teamId: 'team-1',
    userId: 'user-1',
    channelId: 'ch-1',
    text: 'test message',
    threadTs: 'ts-1',
  };

  const createSkill = (
    name: string,
    destructive = false,
    handlerResult: any = { success: true, data: { status: 'ok' } },
  ) => ({
    name,
    description: `Description for ${name}`,
    schema: { _def: { typeName: 'ZodObject' }, shape: {} } as any,
    destructive,
    handler: jest.fn().mockResolvedValue(handlerResult),
  });

  beforeEach(async () => {
    sendMessageMock = jest.fn();

    aiGatewayMock = {
      generateToolCalls: jest.fn(),
    };

    mockSkills = {
      'ReportingSkill.generateReport': createSkill(
        'ReportingSkill.generateReport',
        false,
        { success: true, data: { reportMarkdown: 'Report' } },
      ),
      'EmailSkill.sendBrandedEmail': createSkill('EmailSkill.sendBrandedEmail'),
      'KnowledgeSkill.answerQuestion': createSkill(
        'KnowledgeSkill.answerQuestion',
        false,
        { success: true, data: { answer: 'yes' } },
      ),
      'KnowledgeSkill.search': createSkill('KnowledgeSkill.search'),
      'KnowledgeSkill.summarize': createSkill(
        'KnowledgeSkill.summarize',
        false,
        { success: true, data: { summary: 'summary' } },
      ),
      'MessagingSkill.sendMessage': createSkill(
        'MessagingSkill.sendMessage',
        false,
        { success: true, data: { status: 'sent' } },
      ),
      'JiraSkill.createTask': createSkill('JiraSkill.createTask'),
      'JiraSkill.deleteTask': createSkill('JiraSkill.deleteTask', true),
      'JiraSkill.getTask': createSkill('JiraSkill.getTask'),
      'JiraSkill.listTasks': createSkill('JiraSkill.listTasks', false, {
        success: true,
        data: [],
      }),
    };

    skillRegistryMock = {
      resolve: jest.fn().mockImplementation((name: string) => mockSkills[name]),
      getAllDefinitions: jest
        .fn()
        .mockImplementation(() => Object.values(mockSkills)),
    };

    sessionServiceMock = {
      getOrCreateSession: jest
        .fn()
        .mockResolvedValue({ id: 'sess-1', state: 'idle' }),
      updateSessionState: jest.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      providerConnection: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'conn-1', providerId: 'test-provider' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          fullName: 'Test User',
          email: 'test@company.com',
        }),
      },
    };

    clientFactoryMock = {
      getClient: jest.fn().mockReturnValue({
        sendMessage: sendMessageMock,
      }),
    };

    connectionResolverMock = {
      resolveForSkill: jest
        .fn()
        .mockResolvedValue({ connections: [], missing: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: AiGatewayService, useValue: aiGatewayMock },
        { provide: SkillRegistryService, useValue: skillRegistryMock },
        { provide: SessionService, useValue: sessionServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: ProviderClientFactory, useValue: clientFactoryMock },
        {
          provide: ConnectionResolverService,
          useValue: connectionResolverMock,
        },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  it('CHAIN-01: should execute a 2-step dependent chain', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'ReportingSkill.generateReport', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'tc2',
              name: 'EmailSkill.sendBrandedEmail',
              input: { contentHtml: 'Report' },
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'Done sending the report',
          toolCalls: [],
        },
      });

    await service.handleDM(defaultInput);

    expect(
      mockSkills['ReportingSkill.generateReport'].handler,
    ).toHaveBeenCalled();
    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Done sending the report' }),
    );
  });

  it('CHAIN-02: should execute a 3-step chain', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'KnowledgeSkill.search', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc2', name: 'KnowledgeSkill.summarize', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc3', name: 'MessagingSkill.sendMessage', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { role: 'assistant', content: 'Final summary', toolCalls: [] },
      });

    await service.handleDM(defaultInput);

    expect(mockSkills['KnowledgeSkill.search'].handler).toHaveBeenCalled();
    expect(mockSkills['KnowledgeSkill.summarize'].handler).toHaveBeenCalled();
    expect(mockSkills['MessagingSkill.sendMessage'].handler).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Final summary' }),
    );
  });

  it('CHAIN-03: Conditional branch — positive', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'KnowledgeSkill.answerQuestion', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc2', name: 'MessagingSkill.sendMessage', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'Migration complete text',
          toolCalls: [],
        },
      });

    await service.handleDM(defaultInput);

    expect(
      mockSkills['KnowledgeSkill.answerQuestion'].handler,
    ).toHaveBeenCalled();
    expect(mockSkills['MessagingSkill.sendMessage'].handler).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Migration complete text' }),
    );
  });

  it('CHAIN-03b: Conditional branch — negative', async () => {
    mockSkills['KnowledgeSkill.answerQuestion'].handler.mockResolvedValueOnce({
      success: true,
      data: { answer: 'no' },
    });

    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'KnowledgeSkill.answerQuestion', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'No migration done',
          toolCalls: [],
        },
      });

    await service.handleDM(defaultInput);

    expect(
      mockSkills['KnowledgeSkill.answerQuestion'].handler,
    ).toHaveBeenCalled();
    expect(
      mockSkills['MessagingSkill.sendMessage'].handler,
    ).not.toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'No migration done' }),
    );
  });

  it('CHAIN-04: Mid-chain destructive', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'JiraSkill.createTask', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc2', name: 'JiraSkill.deleteTask', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: { role: 'assistant', content: 'Task deleted', toolCalls: [] },
      });

    await service.handleDM(defaultInput);

    expect(mockSkills['JiraSkill.createTask'].handler).toHaveBeenCalled();
    expect(mockSkills['JiraSkill.deleteTask'].handler).not.toHaveBeenCalled();

    expect(sessionServiceMock.updateSessionState).toHaveBeenCalledWith(
      'sess-1',
      'awaiting_chain_confirmation',
      expect.any(Object),
    );

    const savedChainContext =
      sessionServiceMock.updateSessionState.mock.calls.find(
        (call: any[]) => call[1] === 'awaiting_chain_confirmation',
      )[2];

    sessionServiceMock.getOrCreateSession.mockResolvedValueOnce({
      id: 'sess-1',
      state: 'awaiting_chain_confirmation',
      pendingAction: savedChainContext,
    });

    await service.handleDM({ ...defaultInput, text: 'yes' });

    expect(mockSkills['JiraSkill.deleteTask'].handler).toHaveBeenCalled();
  });

  it('CHAIN-05: Step correctly skipped based on result', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'JiraSkill.listTasks', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'No overdue tasks, team is on track!',
          toolCalls: [],
        },
      });

    await service.handleDM(defaultInput);

    expect(mockSkills['JiraSkill.listTasks'].handler).toHaveBeenCalled();
    expect(
      mockSkills['MessagingSkill.sendMessage'].handler,
    ).not.toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'No overdue tasks, team is on track!' }),
    );
  });

  it('CHAIN-06: Partial failure — step 1 OK, step 2 fails', async () => {
    mockSkills['EmailSkill.sendBrandedEmail'].handler.mockResolvedValueOnce({
      success: false,
      error: { message: 'Network error' },
    });

    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'ReportingSkill.generateReport', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc2', name: 'EmailSkill.sendBrandedEmail', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'Partial failure occurred',
          toolCalls: [],
        },
      });

    await service.handleDM(defaultInput);

    expect(
      mockSkills['ReportingSkill.generateReport'].handler,
    ).toHaveBeenCalled();
    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).toHaveBeenCalled();
    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: 'Partial failure occurred' }),
    );
  });

  it('CHAIN-07: Max iterations hit', async () => {
    aiGatewayMock.generateToolCalls.mockResolvedValue({
      data: {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'tc-loop1', name: 'KnowledgeSkill.search', input: {} },
          { id: 'tc-loop2', name: 'KnowledgeSkill.search', input: {} },
        ],
      },
    });

    await service.handleDM(defaultInput);

    // Status message gets sent when limit is hit
    const calls = sendMessageMock.mock.calls;
    const hasLimitMessage = calls.some((call) => {
      const text = call[1].text;
      return (
        text.includes('timed out') ||
        text.includes('maximum number of tool calls') ||
        text.includes('limit')
      );
    });
    expect(hasLimitMessage).toBe(true);
  });

  it('CHAIN-08: Mid-chain clarification', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'ReportingSkill.generateReport', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'Who should I send this to?',
          toolCalls: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc2', name: 'EmailSkill.sendBrandedEmail', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { role: 'assistant', content: 'Sent', toolCalls: [] },
      });

    await service.handleDM(defaultInput);

    expect(
      mockSkills['ReportingSkill.generateReport'].handler,
    ).toHaveBeenCalled();
    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).not.toHaveBeenCalled();

    const updateCalls = sessionServiceMock.updateSessionState.mock.calls;
    const clarificationCall = updateCalls.find(
      (call: any[]) => call[1] === 'awaiting_clarification',
    );
    expect(clarificationCall).toBeDefined();

    const savedChainContext = clarificationCall[2];

    sessionServiceMock.getOrCreateSession.mockResolvedValueOnce({
      id: 'sess-1',
      state: 'awaiting_clarification',
      pendingAction: savedChainContext,
    });

    await service.handleDM({ ...defaultInput, text: 'amir@company.com' });

    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).toHaveBeenCalled();
  });

  it('CHAIN-09: Clarification + destructive combo', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc1', name: 'JiraSkill.getTask', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: 'Are you sure you want to delete AIAN-42?',
          toolCalls: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc2', name: 'JiraSkill.deleteTask', input: {} }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc3', name: 'EmailSkill.sendBrandedEmail', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { role: 'assistant', content: 'All done', toolCalls: [] },
      });

    // 1st run
    await service.handleDM(defaultInput);

    const clarificationCtx =
      sessionServiceMock.updateSessionState.mock.calls.find(
        (call: any[]) => call[1] === 'awaiting_clarification',
      )[2];

    sessionServiceMock.getOrCreateSession.mockResolvedValueOnce({
      id: 'sess-1',
      state: 'awaiting_clarification',
      pendingAction: clarificationCtx,
    });

    // 2nd run
    sessionServiceMock.updateSessionState.mockClear();
    await service.handleDM({ ...defaultInput, text: 'yes delete it' });

    const confirmationCtx =
      sessionServiceMock.updateSessionState.mock.calls.find(
        (call: any[]) => call[1] === 'awaiting_chain_confirmation',
      )[2];

    sessionServiceMock.getOrCreateSession.mockResolvedValueOnce({
      id: 'sess-1',
      state: 'awaiting_chain_confirmation',
      pendingAction: confirmationCtx,
    });

    // 3rd run
    await service.handleDM({ ...defaultInput, text: 'yes' });

    expect(mockSkills['JiraSkill.getTask'].handler).toHaveBeenCalled();
    expect(mockSkills['JiraSkill.deleteTask'].handler).toHaveBeenCalled();
    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).toHaveBeenCalled();
  });

  it('CHAIN-10: Cancel mid-chain after partial execution', async () => {
    aiGatewayMock.generateToolCalls
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [
            { id: 'tc1', name: 'EmailSkill.sendBrandedEmail', input: {} },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tc2', name: 'JiraSkill.deleteTask', input: {} }],
        },
      });

    // 1st run
    await service.handleDM(defaultInput);

    const confirmationCtx =
      sessionServiceMock.updateSessionState.mock.calls.find(
        (call: any[]) => call[1] === 'awaiting_chain_confirmation',
      )[2];

    sessionServiceMock.getOrCreateSession.mockResolvedValueOnce({
      id: 'sess-1',
      state: 'awaiting_chain_confirmation',
      pendingAction: confirmationCtx,
    });

    // 2nd run - cancel
    await service.handleDM({ ...defaultInput, text: 'no' });

    expect(
      mockSkills['EmailSkill.sendBrandedEmail'].handler,
    ).toHaveBeenCalled();
    expect(mockSkills['JiraSkill.deleteTask'].handler).not.toHaveBeenCalled();
  });
});
