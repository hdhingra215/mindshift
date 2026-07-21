# Contributing to mindshift

## Getting started

1. Copy `.env.example` to `.env` and fill in values.
2. Install dependencies.
3. Run the dev server.

_Setup commands land once the app is scaffolded._

## Architecture

Feature-based. New domain logic goes in `src/features/<name>/` with its own
`components/`, `hooks/`, `api/`, `types.ts`, `index.ts`. Import features through
their `index.ts` barrel only.

## Branching

- Branch off `main`: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.
- One logical change per PR.

## Commits

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.

## Database

Every schema change is a migration in `supabase/migrations/`. All tables ship
with RLS policies.

## Before opening a PR

- Lint and typecheck pass.
- Tests pass (`tests/unit`, `tests/integration`, `tests/e2e`).
- Update `CHANGELOG.md` under `[Unreleased]`.
