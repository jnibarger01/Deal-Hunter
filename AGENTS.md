# Repository Guidelines

## Codex Workflow
Adopt this Karpathy-inspired workflow for Codex in this repo. These rules bias toward caution over speed on non-trivial work. For trivial edits, use judgment.

### 1. Think Before Coding
- State assumptions explicitly when they are not obvious from the repo or the request.
- If multiple interpretations are plausible, surface them instead of picking one silently.
- Ask for clarification instead of guessing when ambiguity would materially change the implementation.
- Push back on unnecessary complexity when a simpler approach satisfies the request.

### 2. Simplicity First
- Write the minimum code that solves the requested problem.
- Do not add speculative features, abstractions, configurability, or impossible-path error handling.
- If a solution feels overbuilt for the current repo patterns, simplify it before finalizing.

### 3. Surgical Changes
- Touch only the files and lines required for the task.
- Match the existing style and patterns of the codebase.
- Do not refactor adjacent code unless the task requires it.
- Remove only the unused code or imports created by your own change. Mention pre-existing dead code instead of deleting it.

### 4. Goal-Driven Execution
- Turn requests into explicit success criteria and verify against them before claiming completion.
- For bug fixes, reproduce the issue with a test or concrete failing check when practical, then make it pass.
- For refactors, preserve behavior with before-and-after verification.
- For multi-step work, state a brief plan with a verification check for each step.

## Project Structure & Module Organization
This repo is an npm workspaces monorepo with two application packages:

- `server/`: Express + Prisma API. Core code lives in `src/` with `routes/`, `controllers/`, `services/`, `domain/`, `middleware/`, and `config/`.
- `frontend/`: React + Vite SPA. App code lives in `src/` with `pages/`, `components/`, `hooks/`, `context/`, and `api/`.
- `server/tests/`: Jest unit and integration tests.
- `server/prisma/`: schema, migrations, and seed data.
- `docker/`, `nginx/`, and `docs/`: deployment assets and operational docs.

Keep new app code inside `server/` or `frontend/`; use the repo root only for workspace glue and shared docs.

## Build, Test, and Development Commands
- `npm run dev`: run backend and frontend together.
- `npm run build`: build both workspaces.
- `npm run docker:up`: start local Postgres, API, frontend, and nginx via Docker Compose.
- `cd server && npm run lint`: run ESLint with `--max-warnings=0`.
- `cd server && npm test`: run Jest coverage suite.
- `cd server && npm run test:integration`: run integration tests only.
- `cd frontend && npm run build`: type-check and produce a production bundle.

After changing `server/prisma/schema.prisma`, run `cd server && npm run prisma:generate` and create a migration if needed.

## Coding Style & Naming Conventions
Use TypeScript throughout and follow existing 2-space indentation. Prefer small, focused modules and reuse current patterns before adding abstractions. Keep business logic in `server/src/domain/` framework-free. Use `PascalCase` for React components and pages (`DealDetail.tsx`), `camelCase` for variables/functions, and `*.module.css` for component-scoped styles.

## Testing Guidelines
Backend tests use Jest with `*.test.ts` naming. Integration tests require a real Postgres database; start it with `npm run docker:up` before running server tests locally. Coverage thresholds are enforced globally: 65% branches and 70% for lines, statements, and functions.

## Commit & Pull Request Guidelines
Recent history mostly follows Conventional Commits, for example `feat(frontend): ...` and `fix(nginx): ...`. Prefer that format for new commits. PRs should include a clear summary, linked issue or task, verification steps run, and screenshots for frontend changes. Call out schema, env, or deployment impacts explicitly.

## Security & Configuration Tips
Do not commit secrets. Backend configuration is validated in `server/src/config/env.ts`; missing or malformed env vars will fail startup. Use `docs/production.md` and `scripts/verify-production.sh` when touching deployment or readiness behavior.
