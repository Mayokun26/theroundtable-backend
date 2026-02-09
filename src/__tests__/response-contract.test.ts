import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

function sentenceCount(text: string): number {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

describe('response contract', () => {
  it('uses brief style for greetings', async () => {
    const request = parseConversationRequest({
      message: 'hello everyone',
      characters: ['1', '2', '3'],
      sessionId: 'contract-brief',
    });

    const responses = await runConversationTurn(request);

    for (const response of responses) {
      expect(sentenceCount(response.content)).toBeLessThanOrEqual(2);
    }
  });

  it('uses deeper style for substantial inquiry', async () => {
    const request = parseConversationRequest({
      message: 'What is the meaning of justice and why does it matter to society?',
      characters: ['1', '2', '3'],
      sessionId: 'contract-full',
    });

    const responses = await runConversationTurn(request);

    for (const response of responses) {
      expect(sentenceCount(response.content)).toBeGreaterThanOrEqual(3);
    }
  });

  it('ensures cross-character references when multiple responders', async () => {
    const request = parseConversationRequest({
      message: 'Discuss strategy, ethics, and leadership together.',
      characters: ['1', '2', '3'],
      sessionId: 'contract-cross-ref',
    });

    const responses = await runConversationTurn(request);

    if (responses.length <= 1) {
      return;
    }

    const names = responses.map((response) => response.name);
    const referencedCount = responses.filter((response) =>
      names.some((name) => name !== response.name && response.content.includes(name))
    ).length;

    expect(referencedCount).toBeGreaterThanOrEqual(Math.ceil(responses.length / 2));
  });
});
