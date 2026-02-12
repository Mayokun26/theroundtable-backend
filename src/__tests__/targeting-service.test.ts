import { Character } from '../types/conversation';
import { analyzeMessageTargeting, selectRespondingCharacters } from '../services/conversation/targetingService';

const panel: Character[] = [
  {
    id: '1',
    name: 'Socrates',
    gender: 'male',
    core_beliefs: [{ statement: 'Virtue matters', conviction: 10, triggers: ['justice', 'virtue'] }],
    topic_convictions: { justice: 10, virtue: 9 },
  },
  {
    id: '2',
    name: 'Marie Curie',
    gender: 'female',
    core_beliefs: [{ statement: 'Evidence matters', conviction: 10, triggers: ['science', 'evidence'] }],
    topic_convictions: { science: 10 },
  },
  {
    id: '3',
    name: 'Sun Tzu',
    gender: 'male',
    topic_convictions: { strategy: 9 },
  },
];

describe('targeting service', () => {
  it('detects greeting and caps responders', () => {
    const targeting = analyzeMessageTargeting('hello everyone', panel);
    const responders = selectRespondingCharacters(targeting, panel);

    expect(targeting.isGreeting).toBe(true);
    expect(responders.length).toBeLessThanOrEqual(2);
  });

  it('detects direct addressing', () => {
    const targeting = analyzeMessageTargeting('Socrates, what is justice?', panel);

    expect(targeting.directlyAddressed).toContain('1');
  });

  it('detects gender mismatch when male-gendered greeting excludes women', () => {
    const targeting = analyzeMessageTargeting('Hello gentlemen', panel);

    expect(targeting.genderMismatch?.type).toBe('excluded_women');
    const responders = selectRespondingCharacters(targeting, panel);
    expect(responders).toContain('2');
    expect(responders.length).toBeGreaterThanOrEqual(2);
  });

  it('uses conviction triggers to prioritize responders', () => {
    const targeting = analyzeMessageTargeting('Let us discuss justice and virtue', panel);
    const responders = selectRespondingCharacters(targeting, panel);

    expect(targeting.topicTriggers.get('1')).toBeGreaterThanOrEqual(9);
    expect(responders).toContain('1');
  });
});
