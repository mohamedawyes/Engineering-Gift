# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Engineering Gift (`artifacts/engineering-gift`)

A professional SaaS-style ELV (Extra Low Voltage) engineering calculator web app (v2.0).

**Modules:**
1. **Fire Alarm LSN** — Bosch (FPA-5000, FPA-1200, AVENAR 8000), Honeywell, Siemens, Custom (15 loops); voltage drop per loop, battery calc (EN-54), SVG Single Line Diagram with per-device addressing, PDF/Excel export
2. **CCTV Calculator** — DORI camera selector (Detection/Observation/Recognition/Identification), focal length + FOV calc, NVR storage calculator with H.264/H.265 comparison chart
3. **Telephone System** — Avaya/Panasonic/NEC/Custom brand selector, G.711/G.729/G.722/Opus codec storage calc, system recommendation
4. **Voltage Drop Calculator** — fire alarm & standard cables - formula: VD = (2 × L × I × ρ) / A
5. **Fiber Optic Link Budget** — Tx Power, attenuation, connector/splice losses
6. **Inrush Current** — multiplier-based peak calc + IEC 60898 B/C/D breaker curve chart (recharts log-scale)
7. **Calculation History** — PostgreSQL persistence via API

**UI/UX:** Fully responsive (sm/md/lg/xl), collapsible sidebar on mobile, dark/light mode, glassmorphism (Apple-style), framer-motion page transitions, EN/AR language toggle in Fire Alarm module

**Frontend packages:** clsx, framer-motion, jspdf, jspdf-autotable, recharts, tailwind-merge, xlsx

### API Server (`artifacts/api-server`)

Express 5 API handling calculation history persistence.

**Routes:**
- `GET /api/calculations` - list all saved calculations
- `POST /api/calculations` - save a calculation
- `DELETE /api/calculations/:id` - delete a calculation

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── engineering-gift/   # React + Vite ELV calculator app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/calculations.ts` — calculations table for storing ELV calculation history
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`
