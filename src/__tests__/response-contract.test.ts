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
    const panelResponses = responses.filter((response) => response.id !== 'moderator');

    for (const response of panelResponses) {
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
    const panelResponses = responses.filter((response) => response.id !== 'moderator');
    expect(panelResponses.length).toBeGreaterThanOrEqual(3);
    expect(panelResponses.length).toBeLessThanOrEqual(6);
    expect(new Set(panelResponses.map((response) => response.id)).size).toBe(3);

    for (const response of panelResponses) {
      expect(sentenceCount(response.content)).toBeGreaterThanOrEqual(2);
    }
  });

  it('ensures cross-character references when multiple responders', async () => {
    const request = parseConversationRequest({
      message: 'Discuss strategy, ethics, and leadership together.',
      characters: ['1', '2', '3'],
      sessionId: 'contract-cross-ref',
    });

    const responses = await runConversationTurn(request);
    const panelResponses = responses.filter((response) => response.id !== 'moderator');

    if (panelResponses.length <= 1) {
      return;
    }

    const names = panelResponses.map((response) => response.name);
    const referencedCount = panelResponses.filter((response) =>
      names.some((name) => name !== response.name && response.content.includes(name))
    ).length;

    expect(referencedCount).toBeGreaterThanOrEqual(Math.ceil(panelResponses.length / 2));
  });
});
