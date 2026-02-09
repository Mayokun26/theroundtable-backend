import { Character, SessionContext, TargetingAnalysis } from '../types/conversation';

const characters: Character[] = [
  { id: '1', name: 'Socrates', category: 'Philosopher' },
  { id: '2', name: 'Marie Curie', category: 'Scientist' },
];

const targeting: TargetingAnalysis = {
  directlyAddressed: [],
  mentionedCharacters: [],
  topicTriggers: new Map<string, number>(),
  isGreeting: false,
  genderMismatch: null,
};

const memoryContext: SessionContext = { messages: [] };

describe('response generator recovery', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('re-attempts provider after circuit breaker cooldown', async () => {
    jest.useFakeTimers();

    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_CIRCUIT_BREAKER_THRESHOLD = '1';
    process.env.OPENAI_CIRCUIT_BREAKER_COOLDOWN_MS = '50';

    const createMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('provider-fail'))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                responses: [
                  { characterId: '1', content: 'Recovered Socrates response' },
                  { characterId: '2', content: 'Recovered Curie response' },
                ],
              }),
            },
          },
        ],
      });

    jest.doMock('openai', () => ({
      OpenAI: jest.fn().mockImplementation(() => ({
        chat: { completions: { create: createMock } },
      })),
    }));

    const module = await import('../services/conversation/responseGenerator');

    await module.generatePanelResponses({
      message: 'First call should fail',
      sessionId: 'recovery-session',
      panelCharacters: characters,
      respondingCharacters: characters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-a',
    });

    await module.generatePanelResponses({
      message: 'Second call while circuit is open',
      sessionId: 'recovery-session',
      panelCharacters: characters,
      respondingCharacters: characters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-b',
    });

    expect(createMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60);

    const recovered = await module.generatePanelResponses({
      message: 'Third call after cooldown',
      sessionId: 'recovery-session',
      panelCharacters: characters,
      respondingCharacters: characters,
      style: 'moderate_engagement',
      targeting,
      memoryContext,
      requestId: 'req-c',
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(recovered[0].content).toBe('Recovered Socrates response');
  });
});
