# TheRoundTable Backend

Backend service for TheRoundTable panel-conversation app.

## Stack
- Node.js + TypeScript
- Express (HTTP runtime)
- AWS Lambda handler (same core services as HTTP)
- OpenAI (response generation)
- Redis (session memory, with in-memory fallback)
- DynamoDB (connectivity + table naming config)

## Core Behavior
- Dynamic response style by user intent (`brief_friendly`, `brief_informative`, `moderate_engagement`, `full_engagement`).
- Character targeting and responder selection (direct address, conviction triggers, greeting behavior).
- Character-to-character interaction in generated panel responses.
- Session memory persisted in Redis when available.

## Setup
```bash
npm install
cp .env.example .env
```

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
