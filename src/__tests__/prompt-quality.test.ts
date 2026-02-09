import { getCharactersByIds } from '../repositories/characterRepository';
import { buildPanelPrompt } from '../services/conversation/prompt/v1/panelPrompt';
import { TargetingAnalysis } from '../types/conversation';

function targetingStub(): TargetingAnalysis {
  return {
    directlyAddressed: [],
    mentionedCharacters: [],
    topicTriggers: new Map<string, number>(),
    isGreeting: false,
    genderMismatch: null,
  };
}

describe('panel prompt quality', () => {
  it('keeps prompt compact enough for multi-character turns', () => {
    const responders = getCharactersByIds(['1', '2', '3', '4']);

    const prompt = buildPanelPrompt({
      message: 'Socrates and Marie Curie, discuss justice, evidence, and wisdom while responding to Sun Tzu.',
      sessionId: 'prompt-size',
      panelCharacters: responders,
      respondingCharacters: responders,
      style: 'full_engagement',
      targeting: targetingStub(),
      memoryContext: {
        messages: [
          { sender: 'user', content: 'What is justice?', timestamp: Date.now() },
          { sender: 'character', characterName: 'Socrates', content: 'Let us begin by defining terms.', timestamp: Date.now() },
        ],
      },
    });

    const totalLength = prompt.systemPrompt.length + prompt.userPrompt.length;
    expect(totalLength).toBeLessThan(12000);
  });

  it('includes relationship cues when available', () => {
    const responders = getCharactersByIds(['1', '2']);

    const prompt = buildPanelPrompt({
      message: 'Socrates and Marie Curie, challenge each other.',
      sessionId: 'prompt-relationship',
      panelCharacters: responders,
      respondingCharacters: responders,
      style: 'moderate_engagement',
      targeting: targetingStub(),
      memoryContext: { messages: [] },
    });

    expect(prompt.userPrompt).toContain('Interaction cues');
    expect(prompt.userPrompt).toContain('With Marie Curie');
  });

  it('prefers relevant beliefs instead of dumping all beliefs', () => {
    const responders = getCharactersByIds(['1']);

    const prompt = buildPanelPrompt({
      message: 'Let us discuss justice and virtue in public life.',
      sessionId: 'prompt-relevance',
      panelCharacters: responders,
      respondingCharacters: responders,
      style: 'full_engagement',
      targeting: targetingStub(),
      memoryContext: { messages: [] },
    });

    expect(prompt.userPrompt).toContain('High-priority beliefs');
    expect(prompt.userPrompt).toContain('justice');
    // Guardrail: card should not include too many belief bullets.
    const beliefBulletCount = (prompt.userPrompt.match(/- /g) || []).length;
    expect(beliefBulletCount).toBeLessThanOrEqual(5);
  });
});
