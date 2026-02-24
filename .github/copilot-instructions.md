# Copilot Instructions — biliardino-elo (Milestone)

Purpose: manage player rankings, matchmaking, real-time updates and advanced web-push notifications for a PWA foosball app.

Architecture (big picture)
- API Layer: `api/` contains edge route handlers and small helpers. Underscore-prefixed files (e.g., `_redisClient.ts`, `_middleware.ts`) are internal utilities.
- Frontend: static HTML at repo root plus TypeScript in `src/`. UI glue lives in `src/views/` and page entrypoints at `src/*.ts`.
- Services: `src/services/` contains the domain logic (ELO, matchmaking, players, messages). Services are the single source of truth for business rules.
- Data & Repos: models in `src/models/`. Repositories (`repository.*.ts`) provide pluggable data backends (mock, firebase).

Key files and patterns (use these as examples)
- `src/services/elo.service.ts`, `match.service.ts`, `matchmaking.service.ts` — canonical service implementations.
- `src/views/*.view.ts` — DOM + UI rendering code; keep these thin and call services for logic.
- `api/run-matchmaking.ts`, `api/send-notification.ts` — example API routes and how they call services.
- `api/_redisClient.ts` — Upstash wrapper used for pub/sub and streaming.
- `public/sw.js` — service worker; controls caching strategies for the PWA.

Developer workflows
- Local dev: `npm run dev` (Vite). Edit `src/` and open the HTML pages.
- Build: `npm run build` (Vite production bundle).
- Tests: `npm test` runs API tests in `tests/api/` (they use direct HTTP calls and repository mocks).
- Useful scripts: `scripts/generate-token.js` (admin token), `scripts/test-broadcast.js` (broadcast testing).

Conventions & guidance (specific)
- TypeScript-first: write new code in TypeScript. Scripts may be plain JS.
- Service-first design: implement business logic in `src/services/`, call services from `api/` and `views` only.
- API routes as small adapters: keep handlers minimal — validate inputs, call services, and return results.
- Internal helpers: prefer underscore-prefixed files in `api/` for shared server utilities.
- Repository pattern: use `repository.service.ts` to swap DB implementations (see `repository.mock.ts` and `repository.firebase.ts`).

Integrations & production constraints (must-read)
- Vercel (Free Plan): serverless functions must complete within 12 seconds. Avoid heavy loops or blocking work in API handlers; push long work to background streams or workers.
- Redis via Upstash: `api/_redisClient.ts` provides a lightweight Redis client. It's used for pub/sub and streaming to web workers — prefer it for real-time updates instead of long-running server processes.
- Web Workers & Streaming: frontend uses web workers that subscribe to Upstash channels to stream live updates without keeping sockets open. Inspect `src/` for worker code and `api/_redisClient.ts` for publishing methods.
- WebPush Notifications: advanced payload creation and subscription management live in `src/notifications.ts` and `api/send-notification.ts`. Use the helpers there to keep push messages consistent.
- Service Worker (`public/sw.js`): controls caching strategy to optimize PWA offline behavior. Update cache names and strategies here when adding static assets.
- Tailwind: integrated via Vite plugin (installed). Use utility classes; styles are under `styles/`.

Testing, debugging, and deployment notes
- Use `repository.mock.ts` for fast unit tests. Integration tests in `tests/api/` validate real HTTP handlers.
- To debug APIs locally, run Vite dev and use the browser to exercise pages; for serverless-specific issues, emulate Vercel or deploy to a preview.
- When modifying `api/` routes, run tests and ensure handlers return quickly (<12s). If a job may exceed this, offload to Redis pub/sub or background process pattern.

PR and agent rules — how AI coding agents should act here
- Keep changes minimal and service-oriented. Implement features in `src/services/` and wire via `api/` or `views`.
- Respect the 12s Vercel limit: do not introduce synchronous long-running operations in API handlers.
- Prefer using `api/_redisClient.ts` for cross-process messages and streaming; avoid adding new long-lived servers.
- When adding new external integrations, document env variables in `config/env.config.ts` and add usage notes here.
- Tests: add unit tests that use `repository.mock.ts` and add API tests under `tests/api/` for route coverage.

If anything is unclear or you want this file expanded into a fuller developer handbook (deploy steps, env vars, sample worker code), tell me which section to expand next.
