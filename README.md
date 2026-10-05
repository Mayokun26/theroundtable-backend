# TheRoundTable Backend

Backend service for TheRoundTable panel-conversation app.

## Stack
- Node.js + TypeScript
- Express (HTTP runtime)
- AWS Lambda handler (same core services as HTTP)
- OpenAI Chat Completions (default model gpt-6-luna)
- Redis (session memory, with in-memory fallback)
- DynamoDB (connectivity + table naming config)

## Core Behavior
- Dynamic response style by user intent (`brief_friendly`, `brief_informative`, `moderate_engagement`, `full_engagement`).
- Character targeting and responder selection (direct address, conviction triggers, greeting behavior).
- Character-to-character interaction in generated panel responses.
- Session memory persisted in Redis when available.

## Setup

Requires Node.js 22+ (deployed on AWS Lambda nodejs24.x).

```bash
npm install
cp .env.example .env
```

## Model configuration

- `OPENAI_MODEL` (default `gpt-6-luna`). Any Chat Completions model ID; `gpt-5.6-luna` is the tested fallback.
- `OPENAI_REASONING_EFFORT` (default `none`). With `none`, the per-style temperature applies and replies stay fast. Other values drop temperature and add 4096 tokens of reasoning headroom. Legacy `gpt-4o`/`gpt-4.1`/`gpt-3.5` models skip this setting.
- Requests send `max_completion_tokens`; `max_tokens` is deprecated.

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
```

## Test
```bash
npm test
npm run type-check
npm run build
```

## Quality Gate
```bash
npm run ci
```

This runs lint, type-check, coverage-enforced tests, and build.

### Live E2E (OpenAI + Redis)
- Requires `OPENAI_API_KEY` and `REDIS_URL`.
- Runs real provider/dependency tests.

```bash
npm run test:live:required
```

## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Triggered on PRs and pushes to `main` and `codex/**` branches.

## API
- `GET /api/health`
- `GET /api/characters`
- `GET /api/characters/:id`
- `POST /api/conversations`

## Lambda Path Parity
Lambda handler supports both prefixed and unprefixed paths:
- `/api/conversations` and `/conversations`
- `/api/characters` and `/characters`
