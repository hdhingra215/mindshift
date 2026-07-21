# mindshift

AI-powered web game teaching users to recognize and overcome cognitive biases through interactive decision-making scenarios.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Router · Framer Motion · GSAP · Supabase · Vercel

## Structure

```
public/                 static assets (fonts, images, icons, sounds)
src/
  app/                  app bootstrap — providers, router setup
  routes/               TanStack Router file-based routes
  components/           shared UI
    ui/                 shadcn/ui primitives
    layout/             shells, nav, headers
    game/               reusable game-play UI
    shared/             cross-cutting pieces
  features/             feature modules (each: components/ hooks/ api/ types.ts index.ts)
    auth/ game/ dashboard/ profile/
  hooks/                global hooks
  lib/                  integrations + helpers
    supabase/ animations/ validation/ utils/
  stores/               client state
  types/                shared TS types
  constants/            app constants
  config/               runtime config
  styles/               global styles / tailwind entry
  assets/               bundled assets
    branding/ icons/ illustrations/ sounds/ fonts/
supabase/               migrations, edge functions, seed, RLS
tests/                  unit, integration, e2e
docs/                   architecture, database, design, product, research, decisions
scripts/                tooling scripts
```

## Setup

_Not scaffolded yet._ Copy `.env.example` to `.env` and fill values once the app is initialized.
