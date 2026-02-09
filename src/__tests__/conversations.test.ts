import { ZodError } from 'zod';
import { getCharacterById } from '../repositories/characterRepository';
import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

describe('conversation service', () => {
  it('throws ZodError for invalid payload', () => {
    expect(() => parseConversationRequest({ message: 'hello' })).toThrow(ZodError);
  });

  it('limits greeting responses to at most two characters', async () => {
    const request = parseConversationRequest({
      message: 'hello everyone',
      characters: ['1', '2', '3', '4'],
      sessionId: 'test-session-greeting',
    });

    const responses = await runConversationTurn(request);
    expect(responses.length).toBeLessThanOrEqual(2);
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
  });

  it('retrieves character by id', () => {
    const character = getCharacterById('1');
    expect(character?.id).toBe('1');
    expect(character?.name).toBe('Socrates');
  });
});
