# TECHNICAL.md — mindPride internals

**Navigation:**
- [README.md](./README.md) — install, run, Docker, env vars, endpoint table


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
```

### Environment

`ConfigModule.forRoot` is global and loads `.env.${NODE_ENV}`, with real environment variables
taking precedence on conflict; `prisma.config.ts` loads the same file for the Prisma CLI.
`main.ts` reads `APP_PORT` via `ConfigService`, defaulting to `3000`.

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Required; unset surfaces as Prisma `P1001` on first query |
| `GROQ_API_KEY` | — | Required for `/groq/*` |
| `APP_PORT` | `3000` | Read in `main.ts` via `ConfigService` |
| `NODE_ENV` | `development` | Selects which `.env.*` file is loaded |

Back to [README.md](./README.md) for run instructions.