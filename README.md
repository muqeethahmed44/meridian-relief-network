# Meridian Relief Network

**Version:** 0.2.0 (POC)

Gulf Coast disaster-relief volunteer matching. Coordinators post urgent needs by state; volunteers apply with a controlled skill catalog; coordinators approve placements into **My matches**. Skill embeddings (OpenAI + pgvector) help rank suggested fits.

## What’s in this version

| Area | Details |
| --- | --- |
| **Auth** | Register / login / logout with Postgres-backed sessions (`connect-pg-simple`) |
| **Roles** | Coordinator and volunteer portals |
| **Skill catalog** | Fixed fields + skills (no free-text). Sample openings on Account. Chips with × to remove |
| **Needs by state** | Gulf Coast sample states: Texas, Louisiana, Mississippi, Alabama, Florida |
| **Apply → approve** | Volunteers apply; coordinators approve/reject; approved items appear in **My matches** |
| **Suggested rankings** | OpenAI `text-embedding-3-small` + pgvector top-3 per need (reference for coordinators) |
| **Ask where I fit** | Guardrailed chat grounded in open needs; suggests catalog skills only |
| **Account** | Skills save, sample openings, account deletion |

### End-to-end flow

1. Coordinator posts a need (**state** + catalog **skills**).
2. Volunteer browses **By state** / Overview and **Applies**.
3. Coordinator reviews under **Matches & apps** (state filter, aligned skills, Approve / Reject).
4. Approved needs show in the volunteer’s **My matches** (refresh to pull latest).

## Folder structure

```
MRN/
├── .env.example          # copy to .env (secrets live here)
├── Dockerfile            # single container: API + built React SPA
├── docker-compose.yml    # Postgres + optional app service
├── backend/              # Express API (also serves frontend/dist in prod)
│   └── src/
│       ├── config/       # env loading
│       ├── data/         # skill catalog, Gulf states
│       ├── db/           # pool + ensureSchema (POC migrations)
│       ├── middleware/
│       ├── routes/       # auth, needs, matches, applications, chat, skills
│       ├── services/     # embeddings, matching, chat
│       └── scripts/
├── frontend/             # React (Vite) portals → build output in dist/
│   └── src/
│       ├── api/
│       ├── auth/
│       ├── components/   # NeedCard, SkillPicker, …
│       ├── data/         # skill catalog, states, mock needs
│       ├── lib/
│       └── pages/        # coordinator/ + volunteer/
└── database/
    ├── migrations/       # schema + applications + need state
    └── seed.sql          # demo users & state-aligned needs
```

## Setup (local development)

**Requirements:** Node.js 20+, Docker Desktop

```bash
# 1. Create your env file (edit secrets as needed)
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env

# 2. Install dependencies
npm install
npm run install:all

# 3. Start Postgres only
npm run db:up

# 4. Start API + Vite frontend (two processes)
npm run dev
```

Then open:

- App: http://localhost:5173  
- API: http://localhost:4000/api/health  

On API startup, `ensureSchema` creates/updates POC tables (applications, need `state`) and refreshes sample Gulf Coast needs for existing databases.

### Production — single container (API + SPA)

Same pattern as a single Node deploy: Express serves `/api/*` and the built React app from `frontend/dist`.

```bash
# Point CORS at the app URL (same origin in the browser)
# In .env: CORS_ORIGIN=http://localhost:8080

npm run prod:up
```

Then open http://localhost:8080 (API health: http://localhost:8080/api/health).

Or build and run without Compose app service:

```bash
npm run db:up
npm run build                 # vite → frontend/dist
# Windows PowerShell:
$env:NODE_ENV="production"; $env:CORS_ORIGIN="http://localhost:4000"; npm start
```

When `frontend/dist/index.html` exists (or `FRONTEND_DIST` points at it), Express serves the SPA and falls back to `index.html` for client-side routes. Without a build, `/` returns a small JSON API stub (dev-friendly).

| Variable | Purpose |
| --- | --- |
| `PORT` | Listen port (`8080` in the Docker image) |
| `FRONTEND_DIST` | Optional path to Vite `dist` (Docker sets `/app/frontend/dist`) |
| `CORS_ORIGIN` | Allowed browser origin (use the public app URL in production) |
| `COOKIE_SECURE` | Set `true` only behind HTTPS |
| `APP_PORT` | Host port mapped to the app container (default `8080`) |

### Environment variables

All secrets go in the root `.env` (gitignored). Start from `.env.example`:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_*` / `DATABASE_URL` | Database credentials |
| `SESSION_SECRET` | Cookie session signing |
| `OPENAI_API_KEY` | Skill embeddings, suggested rankings, chat |
| `PORT` / `CORS_ORIGIN` | API server settings |
| `COOKIE_SECURE` | `true` for HTTPS-only session cookies |
| `APP_PORT` | Published port for the Compose `app` service |

For embeddings and chat, set `OPENAI_API_KEY` in `.env`, restart the API, then optionally backfill seed data:

```bash
npm run backfill:embeddings --prefix backend
```

### Demo logins

Seed password for all demo users: `password123`

| Role | Email |
| --- | --- |
| Coordinator (Houston) | `coord.houston@meridianrelief.example` |
| Coordinator (NOLA) | `coord.nola@meridianrelief.example` |
| Volunteer | `alex.rivera@example.com` |
| Volunteer | `sam.okonkwo@example.com` |

Sample needs cover Texas, Louisiana, Mississippi, Alabama, and Florida, with catalog skills aligned to each location.

### Portals (quick map)

**Volunteer**

- Overview — urgent needs + Apply  
- By state — state dropdown + apply  
- Ask where I fit — catalog skill suggestions  
- My matches — approved applications (+ pending list)  
- Account — sample openings + skill picker  

**Coordinator**

- Dashboard — open needs, pending application count  
- Open needs — state filter, pending badges  
- Post a need — state + catalog skills  
- Matches & apps — approve/reject, approved placements, suggested rankings  

### Cloud Run (GitHub Actions)

Push to `master` / `main` runs [`.github/workflows/deploy-cloud-run.yml`](.github/workflows/deploy-cloud-run.yml):

1. Authenticates with Workload Identity Federation (`mrn-github-deploy`)
2. Builds the multi-stage Docker image and pushes to Artifact Registry (`us-central1-docker.pkg.dev/.../mrn/mrn`)
3. Deploys Cloud Run service `mrn` with Cloud SQL (`mrn-postgres`) and Secret Manager secrets

| Secret Manager secret | Env var |
| --- | --- |
| `mrn-database-url` | `DATABASE_URL` |
| `mrn-session-secret` | `SESSION_SECRET` |
| `mrn-openai-api-key` | `OPENAI_API_KEY` |

WIF (no JSON keys):

- Provider: `projects/88339889733/locations/global/workloadIdentityPools/github/providers/github`
- Service account: `mrn-github-deploy@project-7520bbcf-824d-491f-804.iam.gserviceaccount.com`

### Useful commands

```bash
npm run dev            # Vite + API (local)
npm run build          # production frontend → frontend/dist
npm run start          # API (serves SPA if dist exists)
npm run db:up          # start Postgres
npm run db:down        # stop Compose services
npm run db:reset       # wipe DB volume and recreate (re-runs seed)
npm run prod:up        # build & run db + single app container
npm run prod:down      # stop production stack
```

### API surface (POC)

| Prefix | Purpose |
| --- | --- |
| `/api/auth` | Register, login, session, skills, delete account |
| `/api/needs` | List / create / update needs (includes `state`) |
| `/api/applications` | Volunteer apply; coordinator approve/reject |
| `/api/matches` | Suggested embedding rankings; refresh helpers |
| `/api/chat` | Where I Fit assistant |
| `/api/skills` | Skill catalog |

## Notes

- This is a **POC**: skill vocabulary and Gulf states are intentionally limited and can be expanded later.
- After changing skills or applying, volunteers use **Refresh matches** on My matches to see newly approved placements.
- Re-login if the API restarts and your session cookie is invalidated.
- Local `npm run dev` still uses two processes (Vite :5173 + API :4000). Production uses one container/process.