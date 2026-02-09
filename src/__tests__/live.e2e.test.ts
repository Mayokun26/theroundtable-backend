import { createRedisClient, getRedisClient } from '../config/redis';
import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

const hasLiveEnv = Boolean(process.env.OPENAI_API_KEY && process.env.REDIS_URL);
const describeLive = hasLiveEnv ? describe : describe.skip;

describeLive('live e2e (OpenAI + Redis)', () => {
  jest.setTimeout(60000);

  beforeAll(async () => {
    process.env.RESPONSE_GENERATOR_MODE = 'openai';
    await createRedisClient();
  });

  it('persists session context in Redis across multiple turns', async () => {
    const sessionId = `live-session-${Date.now()}`;

    const turnOne = parseConversationRequest({
      message: 'Socrates and Marie Curie, discuss evidence and wisdom.',
      characters: ['1', '2', '3'],
      sessionId,
      requestId: `req-${Date.now()}-1`,
    });

    const turnTwo = parseConversationRequest({
      message: 'Now challenge each other directly on truth and method.',
      characters: ['1', '2', '3'],
      sessionId,
      requestId: `req-${Date.now()}-2`,
    });

    await runConversationTurn(turnOne);
    await runConversationTurn(turnTwo);

    const redis = getRedisClient();
    expect(redis).not.toBeNull();

    const key = `conversation:session:${sessionId}`;
    const raw = await redis!.get(key);

    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string) as { messages: Array<{ content: string }> };
    expect(parsed.messages.length).toBeGreaterThanOrEqual(4);

    await redis!.del(key);
  });

  it('uses live model path instead of deterministic fallback', async () => {
    const request = parseConversationRequest({
      message: 'What is the meaning of justice and how should leaders use power ethically?',
      characters: ['1', '2', '3'],
      sessionId: `live-model-${Date.now()}`,
      requestId: `req-${Date.now()}-model`,
    });

    const responses = await runConversationTurn(request);
    expect(responses.length).toBeGreaterThan(0);

    // Deterministic fallback includes this phrase in deeper styles.
    const deterministicPhrase = 'I answer from my historical convictions and lived context.';
    const fallbackResponses = responses.filter((response) => response.content.includes(deterministicPhrase));
    expect(fallbackResponses.length).toBe(0);
  });
});
