# Database

## Migrations

| File | Purpose |
| --- | --- |
| `migrations/001_initial_schema.sql` | `users`, `needs`, `matches` + pgvector |
| `migrations/002_add_password_hash.sql` | One-off upgrade for older local DBs |
| `migrations/003_enable_pgvector.sql` | One-off upgrade for older local DBs |
| `migrations/004_applications.sql` | Volunteer applications (`pending` / `approved` / `rejected`) |
| `migrations/005_need_state.sql` | `needs.state` for Gulf Coast filtering |

## Seed

`seed.sql` — demo coordinators, volunteers, and state-aligned needs (Texas, Louisiana, Mississippi, Alabama, Florida) using the controlled skill catalog.

Password for all seed accounts: `password123`

## Runtime

Credentials come from the project-root `.env` (`POSTGRES_*`, `DATABASE_URL`).

Docker Compose applies `001`, `004`, `005`, and `seed.sql` on **first** container start. For an existing volume, the API `ensureSchema` helper adds applications / `state` and refreshes sample needs on startup. Use `npm run db:reset` for a clean re-seed.
