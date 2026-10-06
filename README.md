# mindPride

NestJS REST API that stores users in Postgres and exposes a psychology support chat assistant
backed by the Groq API.

- [TECHNICAL.md](./TECHNICAL.md) — architecture, chat flow

## Requirements

- Node.js 22 (only needed when running outside Docker)
- Docker (recommended path)
- Groq API key: https://console.groq.com/keys

## Run with Docker

```bash
echo "GROQ_API_KEY=gsk_..." > .env
docker compose up -d --build
```

Brings up the API on `localhost:3000` and Postgres on `localhost:5433`
(`postgres`/`postgres`, database `mindpride`). Migrations are applied automatically.

```bash
docker compose ps
curl localhost:3000/users
docker compose down -v
```

Ports are overridable in `.env`: `APP_PORT`, `DB_PORT`.

## Run locally

```bash
npm ci
cp .env.example .env.development   # adjust DATABASE_URL
npx prisma generate --schema database/schema.prisma
npx prisma migrate deploy

npm run start:dev
```

| Variable | Example | Required |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/mindpride` | yes |
| `GROQ_API_KEY` | `gsk_...` | for `/groq/*` |
| `APP_PORT` | `3000` | no (defaults to 3000) |

## Endpoints

Base URL `http://localhost:3000`.

| Method | Path | Body |
|---|---|---|
| `POST` | `/users` | `{ email, name, age (12–100), sex }` |
| `GET` | `/users` | — |
| `GET` | `/users/:id` | — |
| `PATCH` | `/users/:id` | any subset of the create fields |
| `DELETE` | `/users/:id` | — |
| `GET` | `/groq/intro/:userId` | — |
| `POST` | `/groq/newUserChat/:userId` | `{ message }` |
| `PUT` | `/groq/:chatSessionId/:userId` | `{ message }` |
| `DELETE` | `/groq/:chatSessionId/:userId` | — |

Errors come back as `{ statusCode, message, timestamp, path }`.

```bash
curl -X POST localhost:3000/users -H 'content-type: application/json' \
  -d '{"email":"ana@example.com","name":"Ana","age":30,"sex":"female"}'
```

## Known limitations

- No authentication and no pagination.
- `DELETE /users/:id` returns 422 if the user still has chat sessions.
- `DATABASE_URL` is not validated at boot; the failure only shows up on the first query.