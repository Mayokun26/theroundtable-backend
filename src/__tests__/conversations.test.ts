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
    expect(responses.length).toBe(3);
    expect(new Set(responses.map((response) => response.id)).size).toBe(3);
  });

  it('prioritizes directly addressed character', async () => {
    const request = parseConversationRequest({
      message: 'Socrates, what is justice?',
      characters: ['1', '2', '3'],
      sessionId: 'test-session-direct-address',
    });

    const responses = await runConversationTurn(request);
    const responderIds = responses.map((item) => item.id);
    expect(responderIds).toContain('1');
    expect(responses.length).toBeGreaterThanOrEqual(3);
    expect(responses.length).toBeLessThanOrEqual(6);
    expect(new Set(responderIds).size).toBe(3);
  });

  it('returns three responders for gender-mismatch greeting', async () => {
    const request = parseConversationRequest({
      message: 'hello gentlemen',
      characters: ['1', '2', '3'],
      sessionId: 'test-session-gender-mismatch-greeting',
    });

    const responses = await runConversationTurn(request);
    const responderIds = responses.map((item) => item.id);

    expect(responses.length).toBe(3);
    expect(responderIds).toContain('2');
  });

  it('orders first response by topical salience rather than panel order', async () => {
    const request = parseConversationRequest({
      message: 'Let us discuss justice and virtue.',
      characters: ['2', '3', '1'],
      sessionId: 'test-session-salience-order',
    });

    const responses = await runConversationTurn(request);
    expect(responses[0]?.id).toBe('1');
  });

  it('retrieves character by id', () => {
    const character = getCharacterById('1');
    expect(character?.id).toBe('1');
    expect(character?.name).toBe('Socrates');
  });
});
