import { Character, SessionContext, TargetingAnalysis } from '../types/conversation';

const baseCharacters: Character[] = [
  {
    id: '1',
    name: 'Socrates',
    category: 'Philosopher',
    core_beliefs: [{ statement: 'Question everything', conviction: 10 }],
  },
  {
    id: '2',
    name: 'Marie Curie',
    category: 'Scientist',
    core_beliefs: [{ statement: 'Evidence first', conviction: 10 }],
  },
];

const targeting: TargetingAnalysis = {
  directlyAddressed: [],
  mentionedCharacters: [],
  topicTriggers: new Map<string, number>(),
  isGreeting: false,
  genderMismatch: null,
};

const memoryContext: SessionContext = { messages: [] };

describe('response generator', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
  });

  async function loadGeneratorWithMock(createImpl: jest.Mock) {
    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: createImpl,
          },
        },
      })),
    }));

    const module = await import('../services/conversation/responseGenerator');
    return module;
  }

  it('uses deterministic output when mode is deterministic', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'deterministic';

    const createMock = jest.fn();
    const module = await loadGeneratorWithMock(createMock);

    const responses = await module.generatePanelResponses({
      message: 'Discuss justice',
      sessionId: 'deterministic-mode',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      style: 'full_engagement',
      targeting,
      memoryContext,
      requestId: 'req-1',
    });

    expect(responses.length).toBe(2);
    expect(createMock).not.toHaveBeenCalled();
    expect(responses[0].content).toContain('Socrates');
  });

  it('uses openai output when available', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              responses: [
                { characterId: '1', content: 'Socrates response' },
                { characterId: '2', content: 'Curie response' },
              ],
            }),
          },
        },
      ],
    });

    const module = await loadGeneratorWithMock(createMock);

    const responses = await module.generatePanelResponses({
      message: 'Discuss evidence',
      sessionId: 'openai-mode',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-2',
    });

    expect(createMock).toHaveBeenCalled();
    expect(responses[0].content).toBe('Socrates response');
    expect(responses[1].content).toBe('Curie response');
  });

  it('falls back when model output is invalid JSON', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    const createMock = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'not-json' } }],
    });

    const module = await loadGeneratorWithMock(createMock);

    const responses = await module.generatePanelResponses({
      message: 'Discuss method',
      sessionId: 'bad-json',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      style: 'brief_informative',
      targeting,
      memoryContext,
      requestId: 'req-3',
    });

    expect(responses.length).toBe(2);
    expect(responses[0].content).toContain('Socrates');
  });

  it('opens circuit breaker after repeated failures and skips provider call', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_CIRCUIT_BREAKER_THRESHOLD = '1';
    process.env.OPENAI_CIRCUIT_BREAKER_COOLDOWN_MS = '60000';

    const createMock = jest.fn().mockRejectedValue(new Error('provider-fail'));
    const module = await loadGeneratorWithMock(createMock);

    await module.generatePanelResponses({
      message: 'First turn',
      sessionId: 'circuit',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-4',
    });

    await module.generatePanelResponses({
      message: 'Second turn',
      sessionId: 'circuit',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-5',
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
