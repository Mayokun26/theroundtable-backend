import { buildCompletionParams, REASONING_TOKEN_HEADROOM } from '../services/conversation/responseGenerator';

describe('OpenAI completion parameters', () => {
  it('keeps style temperature with no reasoning effort', () => {
    const params = buildCompletionParams('gpt-6-luna', 'none', 540, 0.78);

    expect(params).toEqual({
      model: 'gpt-6-luna',
      reasoning_effort: 'none',
      temperature: 0.78,
      max_completion_tokens: 540,
    });
    expect(params).not.toHaveProperty('max_tokens');
  });

  it('omits temperature and reserves output headroom when reasoning', () => {
    const params = buildCompletionParams('gpt-6-luna', 'low', 540, 0.78);

    expect(params).toEqual({
      model: 'gpt-6-luna',
      reasoning_effort: 'low',
      max_completion_tokens: 540 + REASONING_TOKEN_HEADROOM,
    });
    expect(params).not.toHaveProperty('temperature');
    expect(params).not.toHaveProperty('max_tokens');
  });

  it.each(['gpt-4o', 'gpt-4.1-mini'])('keeps legacy parameters for %s', (model) => {
    const params = buildCompletionParams(model, 'none', 540, 0.78);

    expect(params).toEqual({ model, temperature: 0.78, max_completion_tokens: 540 });
    expect(params).not.toHaveProperty('reasoning_effort');
    expect(params).not.toHaveProperty('max_tokens');
  });
});
