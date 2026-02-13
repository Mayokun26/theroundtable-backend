import { ZodError } from 'zod';
import { getCharacterById } from '../repositories/characterRepository';
import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

describe('conversation service', () => {
  it('throws ZodError for invalid payload', () => {
    expect(() => parseConversationRequest({ message: 'hello' })).toThrow(ZodError);
  });

  it('returns three responders for greeting turns', async () => {
    const request = parseConversationRequest({
      message: 'hello everyone',
      characters: ['1', '2', '3', '4'],
      sessionId: 'test-session-greeting',
    });

    const responses = await runConversationTurn(request);
    const panelResponses = responses.filter((response) => response.id !== 'moderator');
    expect(panelResponses.length).toBe(3);
    expect(new Set(panelResponses.map((response) => response.id)).size).toBe(3);
    expect(responses[responses.length - 1]?.id).toBe('moderator');
  });

  it('prioritizes directly addressed character', async () => {
    const request = parseConversationRequest({
      message: 'Socrates, what is justice?',
      characters: ['1', '2', '3'],
      sessionId: 'test-session-direct-address',
    });

    const responses = await runConversationTurn(request);
    const panelResponses = responses.filter((item) => item.id !== 'moderator');
    const responderIds = panelResponses.map((item) => item.id);
    expect(responderIds).toContain('1');
    expect(panelResponses.length).toBeGreaterThanOrEqual(3);
    expect(panelResponses.length).toBeLessThanOrEqual(6);
    expect(new Set(responderIds).size).toBe(3);
    expect(responses[responses.length - 1]?.id).toBe('moderator');
  });

  it('returns three responders for gender-mismatch greeting', async () => {
    const request = parseConversationRequest({
      message: 'hello gentlemen',
      characters: ['1', '2', '3'],
      sessionId: 'test-session-gender-mismatch-greeting',
    });

    const responses = await runConversationTurn(request);
    const panelResponses = responses.filter((item) => item.id !== 'moderator');
    const responderIds = panelResponses.map((item) => item.id);

    expect(panelResponses.length).toBe(3);
    expect(responderIds).toContain('2');
    expect(responses[responses.length - 1]?.id).toBe('moderator');
  });

  it('orders first response by topical salience rather than panel order', async () => {
    const request = parseConversationRequest({
      message: 'Let us discuss justice and virtue.',
      characters: ['2', '3', '1'],
      sessionId: 'test-session-salience-order',
    });

    const responses = await runConversationTurn(request);
    const panelResponses = responses.filter((response) => response.id !== 'moderator');
    expect(panelResponses[0]?.id).toBe('1');
  });

  it('appends moderator as final response with a handoff cue', async () => {
    const request = parseConversationRequest({
      message: 'What is justice?',
      characters: ['1', '2', '3'],
      sessionId: 'test-session-moderator-last',
    });

    const responses = await runConversationTurn(request);
    const last = responses[responses.length - 1];
    expect(last?.id).toBe('moderator');
    expect(last?.name).toBe('Moderator');
    expect(last?.content).toMatch(/\?/);
  });

  it('includes moderator in deterministic fallback mode', async () => {
    const previousMode = process.env.RESPONSE_GENERATOR_MODE;
    process.env.RESPONSE_GENERATOR_MODE = 'deterministic';

    try {
      const request = parseConversationRequest({
        message: 'Afternoon panel',
        characters: ['1', '2', '3'],
        sessionId: 'test-session-moderator-deterministic',
      });

      const responses = await runConversationTurn(request);
      expect(responses[responses.length - 1]?.id).toBe('moderator');
    } finally {
      if (previousMode === undefined) {
        delete process.env.RESPONSE_GENERATOR_MODE;
      } else {
        process.env.RESPONSE_GENERATOR_MODE = previousMode;
      }
    }
  });

  it('uses welcome moderator opener only at session start', async () => {
    const sessionId = 'test-session-moderator-welcome-once';
    const first = parseConversationRequest({
      message: 'Hello panel',
      characters: ['1', '2', '3'],
      sessionId,
    });
    const second = parseConversationRequest({
      message: 'Now compare your views on leadership.',
      characters: ['1', '2', '3'],
      sessionId,
    });

    const firstResponses = await runConversationTurn(first);
    const secondResponses = await runConversationTurn(second);

    const firstModerator = firstResponses[firstResponses.length - 1];
    const secondModerator = secondResponses[secondResponses.length - 1];

    expect(firstModerator.id).toBe('moderator');
    expect(firstModerator.content).toContain('Welcome to The Round Table');
    expect(secondModerator.id).toBe('moderator');
    expect(secondModerator.content).not.toContain('Welcome to The Round Table');
  });

  it('retrieves character by id', () => {
    const character = getCharacterById('1');
    expect(character?.id).toBe('1');
    expect(character?.name).toBe('Socrates');
  });
});
