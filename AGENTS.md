# AGENTS.md

Agent guide for `ai-email-generator`.
This repository is a Next.js App Router project with TypeScript, Convex, AI SDK, and React Email compilation.
Use this as the default operating playbook for coding agents.

## 1) Project Snapshot

- Framework: Next.js `16` + React `19` + TypeScript `5`.
- UI location: `app/` and `components/`.
- Server routes: `app/api/**/route.ts`.
- Shared logic: `lib/`.
- Convex backend functions/schema: `convex/`.
- Linting: ESLint (`eslint.config.mjs`) with Next core-web-vitals + TypeScript config.
- TS mode: strict (`tsconfig.json` has `"strict": true`).
- Path alias: `@/*` maps to repo root.

## 2) Install and Core Commands

- Install deps: `npm install`
- Build: `npm run build`
- Start production build: `npm run start`
- Lint full repo: `npm run lint`

Notes:
- There is no dedicated `typecheck` script in `package.json`.
- If type checking is needed, run: `npx tsc --noEmit`.
- Do not run `npm run dev` from automated agent flows in this repo.

## 3) Lint Commands (including single-file)

- Lint all files: `npm run lint`
- Lint one file: `npm run lint -- app/page.tsx`
- Lint one directory: `npm run lint -- components`
- Auto-fix where possible: `npx eslint . --fix`
- Auto-fix one file: `npx eslint components/chat-panel.tsx --fix`

## 4) Test Commands (current state + single test guidance)

Current state:
- No test runner is configured in `package.json`.
- No `test` script exists.
- No test files were found in the current repository snapshot.

What agents should do:
- Do not invent or claim test commands that do not exist.
- Use `npm run lint` and `npm run build` as the minimum validation pair.
- Optionally add `npx tsc --noEmit` for stricter validation.

Single-test guidance (for future test setup):
- If Jest is added, typical single test command is:
- `npx jest path/to/file.test.ts -t "test name"`
- If Vitest is added, typical single test command is:
- `npx vitest run path/to/file.test.ts -t "test name"`
- Prefer whatever command is defined in future `package.json` scripts over ad-hoc commands.

## 5) Expected Pre-PR Validation

Run these before handing off significant changes:
- `npm run lint`
- `npm run build`
- `npx tsc --noEmit` (recommended)

If any command fails:
- Include the failing command and key error lines in your handoff.
- Do not claim success without actually running commands.

## 6) Source Layout and Ownership

- `app/layout.tsx`: root layout, metadata, font setup, provider wiring.
- `app/page.tsx`: top-level client page composition and panel state.
- `app/api/chat/route.ts`: streaming AI flow + tool invocation.
- `app/api/render-email/route.ts`: TSX-to-HTML compile endpoint.
- `components/*`: client UI and hooks.
- `lib/compile-email.ts`: runtime email compilation sandbox.
- `convex/schema.ts` and `convex/*.ts`: data schema and CRUD operations.

## 7) Code Style Rules (repo-observed)

### Imports

- Use absolute alias imports via `@/` for internal modules when practical.
- Keep external imports before internal imports.
- Group imports cleanly; avoid unused imports.
- Prefer explicit named imports unless a default export is required.

### Formatting

- Use semicolons.
- Use double quotes for strings.
- Keep trailing commas where formatter/linter expects them.
- Follow existing line wrapping style rather than reflowing unrelated code.
- Use concise comments only when logic is not obvious.

### TypeScript and types

- Preserve strict typing; avoid `any`.
- If `any` is unavoidable, keep it localized and justify it.
- Type component props with interfaces or type aliases.
- Prefer narrow unions (example in repo: `"chat" | "preview"`).
- Validate external/unsafe input (API payloads, tool input schemas) explicitly.
- Use `zod` schemas for AI/tool inputs and runtime validation patterns.

### Naming conventions

- Components and exported types/interfaces: `PascalCase`.
- Variables/functions/hooks: `camelCase`.
- Custom hooks start with `use` (example: `useConvexSave`).
- Route files follow Next convention: `route.ts` under `app/api/...`.
- Keep file names kebab-case in `components/` when already following that pattern.

### React/Next patterns

- Add `"use client"` only for modules using client hooks/browser APIs.
- Prefer functional components and hooks.
- Memoize callbacks (`useCallback`) when passing handlers through props.
- Use App Router conventions (`app/` structure, route handlers in `route.ts`).
- Keep server-only logic out of client components.

### Error handling

- In API routes, wrap risky operations in `try/catch`.
- Return structured JSON errors (`{ error: string }`) with correct status codes.
- Convert unknown errors to safe messages (`error instanceof Error ? ...`).
- For optional integrations (Convex/env-dependent paths), fail gracefully.
- Avoid swallowing errors silently unless there is a deliberate UX fallback.

## 8) Convex and Data Notes

- Schema is defined in `convex/schema.ts`.
- Mutations/queries use validators from `convex/values`.
- Keep args validators in sync with handler usage.
- Update timestamps consistently (`updatedAt`, `createdAt`) when mutating.
- If data operations fail unexpectedly, verify table role policies/permissions first.

## 9) AI/Email Compiler Specific Notes

- `lib/compile-email.ts` compiles TSX using Sucrase and executes in a sandboxed function scope.
- Allowed runtime requires are intentionally constrained.
- Generated email code is expected to export via `module.exports.default`.
- Keep tool contracts stable between `app/api/chat/route.ts` and UI consumers.

## 10) Agent Behavior Rules for This Repo

- Prefer minimal, surgical diffs.
- Do not refactor unrelated areas in the same change.
- Preserve existing architecture and naming unless asked to change it.
- Never commit secrets from `.env*` files.
- Prefer ASCII-only edits unless file content already requires Unicode.

## 11) Cursor/Copilot Rule Files Status

Scanned locations:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Current result:
- None of the above files are present in this repository.

If those files are added later:
- Treat them as repository-specific agent instructions.
- Merge their guidance into this file in the next update.
