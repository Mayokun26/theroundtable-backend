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
    gender: 'female',
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
      turnPlanCharacters: baseCharacters,
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
      turnPlanCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-2',
    });

    expect(createMock).toHaveBeenCalled();
    expect(responses[0].content).toBe('Socrates response');
    expect(responses[1].content).toBe('Curie response');
  });

  it('trims verbose openai greeting output to concise form', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              responses: [
                {
                  characterId: '1',
                  content:
                    'Good morning to all gathered here. I am delighted to greet each of you with elaborate gratitude and deep reflection on our shared journey across eras. Let us proceed with an expansive opening that spans many themes.',
                },
                {
                  characterId: '2',
                  content:
                    'Good morning everyone. I bring warm regard and scientific curiosity to this most fascinating panel. It is a privilege to begin with extensive remarks before any question is posed.',
                },
              ],
            }),
          },
        },
      ],
    });

    const module = await loadGeneratorWithMock(createMock);
    const greetingTargeting: TargetingAnalysis = {
      directlyAddressed: [],
      mentionedCharacters: [],
      topicTriggers: new Map<string, number>(),
      isGreeting: true,
      genderMismatch: null,
    };

    const responses = await module.generatePanelResponses({
      message: 'good morning panelists',
      sessionId: 'openai-greeting-trim',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      turnPlanCharacters: baseCharacters,
      style: 'brief_friendly',
      targeting: greetingTargeting,
      memoryContext,
      requestId: 'req-2b',
    });

    expect(responses[0].content.length).toBeLessThanOrEqual(140);
    expect(responses[1].content.length).toBeLessThanOrEqual(140);
    expect(responses[0].content.split(/[.!?]+/).filter(Boolean).length).toBeLessThanOrEqual(1);
    expect(responses[1].content.split(/[.!?]+/).filter(Boolean).length).toBeLessThanOrEqual(1);
  });

  it('trims verbose openai output for non-greeting styles too', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';

    const createMock = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              responses: [
                {
                  characterId: '1',
                  content:
                    'First point is substantial. Second point adds historical context. Third point responds directly to another panelist. Fourth point keeps elaborating well beyond needed brevity for this mode.',
                },
                {
                  characterId: '2',
                  content:
                    'First observation is clear. Second observation is practical. Third observation is collaborative. Fourth observation is extra detail that should be cut in post-processing.',
                },
              ],
            }),
          },
        },
      ],
    });

    const module = await loadGeneratorWithMock(createMock);

    const responses = await module.generatePanelResponses({
      message: 'Can you discuss this topic?',
      sessionId: 'openai-moderate-trim',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      turnPlanCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-2c',
    });

    expect(responses[0].content.split(/[.!?]+/).filter(Boolean).length).toBeLessThanOrEqual(3);
    expect(responses[1].content.split(/[.!?]+/).filter(Boolean).length).toBeLessThanOrEqual(3);
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
      turnPlanCharacters: baseCharacters,
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
      turnPlanCharacters: baseCharacters,
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
      turnPlanCharacters: baseCharacters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-5',
    });

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('deterministic brief response acknowledges gender mismatch for affected character', async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'deterministic';

    const createMock = jest.fn();
    const module = await loadGeneratorWithMock(createMock);

    const mismatchTargeting: TargetingAnalysis = {
      directlyAddressed: [],
      mentionedCharacters: [],
      topicTriggers: new Map<string, number>(),
      isGreeting: true,
      genderMismatch: { type: 'excluded_women', excludedGenders: ['female'] },
    };

    const responses = await module.generatePanelResponses({
      message: 'hello gentlemen',
      sessionId: 'deterministic-mismatch',
      panelCharacters: baseCharacters,
      respondingCharacters: baseCharacters,
      turnPlanCharacters: baseCharacters,
      style: 'brief_friendly',
      targeting: mismatchTargeting,
      memoryContext,
      requestId: 'req-6',
    });

    const marie = responses.find((response) => response.id === '2');
    expect(marie?.content.toLowerCase()).toContain('included');
    expect(createMock).not.toHaveBeenCalled();
  });
});
