# TECHNICAL.md — mindPride internals

**Navigation:**
- [README.md](./README.md) — install, run, Docker, env vars, endpoint table
- Entry: [`src/main.ts`](../src/main.ts) · Schema: [`database/schema.prisma`](../database/schema.prisma) · Dockerfile: [`Dockerfile`](../Dockerfile)

## Architecture

```
mindPride/
├── src/
│   ├── main.ts                     # bootstrap: ValidationPipe + HttpExceptionFilter + listen
│   ├── app.module.ts               # ConfigModule (.env.${NODE_ENV}) + UsersModule + GroqModule
│   ├── HttpExceptionFilter.ts      # @Catch() all → JSON error envelope, Prisma code mapping
│   ├── prisma/
│   │   ├── prisma.module.ts        # provides + exports PrismaService
│   │   └── prisma.service.ts       # PrismaClient w/ PrismaPg adapter, onModuleInit $connect
│   ├── users/
│   │   ├── users.controller.ts     # REST: POST/GET/GET:id/PATCH/DELETE
│   │   ├── users.service.ts        # thin pass-through, returns { message } on delete
│   │   ├── users.repository.ts     # all Prisma calls live here
│   │   ├── dto/in/*.dto.ts         # class-validator DTOs (Create/Update)
│   │   └── utils/enum.ts
│   ├── groq/
│   │   ├── groq.controller.ts      # GET intro / POST newUserChat / PUT continue / DELETE
│   │   ├── groq.service.ts         # message assembly + history replay
│   │   ├── groq.repository.ts      # Groq SDK calls + chatSession/messages persistence
│   │   └── dto/{in,out}/*.dto.ts
│   └── utils/constants.ts          # MINDPRIDE_SYSTEM_PROMPT
├── database/
│   ├── schema.prisma               # User, ChatSession, Messages (+ MessageRole enum)
│   ├── migrations/                 # 8 applied migrations + migration_lock.toml
│   ├── seed.ts                     # run via prisma.config.ts seed hook
│   └── generated/                  # prisma-client output (cjs), git-ignored
├── prisma.config.ts                # schema/migrations paths, env load, datasource url
├── Dockerfile                      # node:22-alpine builder → runtime
├── compose.yml                     # db + one-shot migrate + api, multi-stage targets
├── nest-cli.json / tsconfig.json   # build config; baseUrl "./" enables `src/...` imports
└── test/jest-e2e.json              # e2e jest config
```

### Dependency flow

```
main.ts → AppModule
            ├─ ConfigModule (env)
            ├─ PrismaModule ──> PrismaService ──> PrismaPg(DATABASE_URL)
            ├─ UsersModule ───> UsersController → UsersService → UsersRepository → PrismaService
            └─ GroqModule ────> GroqController  → GroqService  → GroqRepository ─┬─> Groq SDK (GROQ_API_KEY)
                                    └─> UsersRepository (user existence checks)     └─> PrismaService
```

Layering convention: **controller → service → repository**. Controllers never touch Prisma;
services hold no business logic yet (placeholder for it); repositories own all queries.
`UsersRepository` is re-exported from `UsersModule` so `GroqRepository` can reuse it.

### Data model

`User` (autoincrement `Int` id, unique `email`, `status` set to `'ACTIVE'` on create)
1‑to‑many `ChatSession`; `ChatSession` 1‑to‑many `Messages` with `onDelete: Cascade`.
`Messages.role` uses the `MessageRole` Prisma enum (`system|user|assistant|tool|function`),
which is cast to a narrower union in `groq.service.ts` when replayed to the API.

Schema TODO (see `schema.prisma:11`): ids are slated to move to UUIDs.

### AI chat flow

1. `getGroqChatIntro` / `newUserChat` — send system prompt (+ optional user message) to
   `llama-3.1-8b-instant` (temperature 0.7, `max_completion_tokens` 150), create a
   `ChatSession`, persist the assistant (and user) messages.
2. `continueUserChat` — verify session ownership (`findFirst({ id, userId })`), load full
   message history ordered by `createdAt` asc, replay it as `system + history + new user
   message`, then bump `updatedAt` and append both messages.
3. `deleteUserChat` — ownership check then `chatSession.delete`, which cascades `Messages`.

`callGrokApi` swallows SDK errors and rethrows `InternalServerErrorException('AI service
unavailable')`, so upstream failures never leak raw details. `validateChatResponse` throws if
`choices[0].message.content` is empty.

### HTTP surface

| Método | Rota | Body | Notas |
|---|---|---|---|
| `POST` | `/users` | `CreateUserDto` | `email`, `name`, `age` (12–100), `sex`; `status` = `'ACTIVE'` |
| `GET` | `/users` | — | Sem paginação |
| `GET` | `/users/:id` | — | 404 via `P2025` |
| `PATCH` | `/users/:id` | `UpdateUserDto` | `PartialType(CreateUserDto)` |
| `DELETE` | `/users/:id` | — | **422 se o usuário tiver `ChatSession`** — a relação `ChatSession.userId` não tem `onDelete: Cascade`; só `Messages` cascateia de `ChatSession` |
| `GET` | `/groq/intro/:userId` | — | Cria sessão + saudação da IA |
| `POST` | `/groq/newUserChat/:userId` | `{ message }` | Nova sessão |
| `PUT` | `/groq/:chatSessionId/:userId` | `{ message }` | Continua sessão existente |
| `DELETE` | `/groq/:chatSessionId/:userId` | — | Deleta sessão |

`CreateChatMessagesDto.role` usa o enum `MessageRole` do Prisma: `system`, `user`, `assistant`,
`tool`, `function`.

`ValidationPipe` global valida os DTOs; `HttpExceptionFilter` normaliza tudo para
`{ statusCode, message, timestamp, path }` e mapeia códigos Prisma — `P2002` → 409 (e-mail
duplicado), `P2003` → 422 (FK violada), `P2025` → 404 (não encontrado). `DATABASE_URL` não é
validada no boot: o erro só surge na primeira query, como Prisma `P1001`.

### Build & module resolution

`prisma-client` generator with `moduleFormat: "cjs"` writes to `database/generated/`, imported
as `database/generated/client` — resolvable because `tsconfig.json` sets `baseUrl: "./"`.
The same convention backs `src/...` imports. Because `prisma.config.ts` and `database/` sit at
the repo root, `nest build` mirrors the root into `dist/`, so the compiled entry is
`dist/src/main.js`. Both `npm run start:prod` and the Docker `CMD` target that path.

`src/main.ts` reads the port through `ConfigService` (`app.get(ConfigService)`) rather than
`process.env` directly, so the value comes from the merged config (`.env.${NODE_ENV}` plus real
env vars, real env winning) and falls back to `3000` when `APP_PORT` is absent.

### Docker

Stage 1 (`node:22-alpine AS builder`): `npm ci` → copy `.env.example` to `.env.development` →
`prisma generate` → `npm run build`. Stage 2 (`node:22-alpine AS runtime`): `npm ci --omit=dev`,
then copies only `dist/` and `database/` from stage 1, seeds `.env.production` from
`.env.example`, `EXPOSE 3000`, `CMD ["node","dist/src/main"]`. The runtime image needs **no**
`node_modules` from stage 1: `@prisma/client` and `@prisma/adapter-pg` are production dependencies
so `npm ci --omit=dev` already installs them, and the generated client travels inside
`database/generated/`. (The `prisma` CLI is still present in the runtime image, but only as a
transitive dependency of `@prisma/client`.)

`compose.yml` drives the two named stages: `api` on `target: runtime`, and a one-shot `migrate`
service on `target: builder` running `npx prisma migrate deploy`. The builder stage is required
there because `prisma.config.ts` lives at the repo root and is not copied into the runtime image —
running migrate from the runtime image fails with `schema.prisma: file not found`. `api` waits for
`migrate` to exit successfully, so `docker compose up --build` is sufficient on a clean machine.
Migrations are intentionally **not** run at startup by the app itself.

The `db` service publishes `${DB_PORT:-5433}:5432` so external clients can reach it, defaulting to
5433 because 5432 is normally occupied by a host-local Postgres — binding both fails with
`address already in use`. The api talks to it as `db:5432` on the compose network, so the internal
port is unaffected by that mapping. Reaching it from a client:

```bash
psql -h localhost -p 5433 -U postgres -d mindpride        # host
docker compose exec db psql -U postgres -d mindpride     # inside the container
```

`.dockerignore` excludes `.env*` except `.env.example`, so no local secrets enter the build
context.

### Environment

`ConfigModule.forRoot` is global and loads `.env.${NODE_ENV}` (`development` when `NODE_ENV` is
unset), merging those values under real environment variables — real env wins on conflict.
`prisma.config.ts` does the same via `node:process` `loadEnvFile`, so the Prisma CLI and the app
read the same file. Per the NestJS config docs, variables needed before `NestFactory.create` would
require `nest start --env-file`; the port is read after bootstrap, so `ConfigService` suffices.

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Required; unset surfaces as Prisma `P1001` on first query |
| `GROQ_API_KEY` | — | Required for `/groq/*` |
| `APP_PORT` | `3000` | Read in `main.ts` via `ConfigService` |
| `NODE_ENV` | `development` | Selects which `.env.*` file is loaded |

Back to [README.md](./README.md) for run instructions.