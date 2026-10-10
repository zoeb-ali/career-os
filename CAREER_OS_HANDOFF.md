# Career OS — Complete Project Handoff
## Full Build Log: What We Built, Every Problem We Hit, How We Solved It

---

## PROJECT OVERVIEW

**Name:** AI Career Operating System (Career OS)
**Developer:** Zoeb Ali Khan — M.Sc. Data Science, Universität Bielefeld
**Purpose:** Production-grade portfolio project demonstrating the complete Data Science lifecycle
**Timeline:** Built over multiple sessions across several weeks
**Status:** Live on free-forever hosting since 10 Oct 2026 (Vercel + Render + Neon + Qdrant Cloud + GitHub Actions), after the Railway trial ended

**Live URLs:**
- Frontend (Vercel): https://career-os-xi-bay.vercel.app
- Backend API (Render): https://career-os-api-soen.onrender.com
- API Docs: https://career-os-api-soen.onrender.com/docs
- GitHub: https://github.com/zoeb-ali/career-os

---

## WHAT WAS BUILT

### Complete System (85 files)

**Backend — FastAPI**
- 11 REST API routers: health, auth, jobs, ats, recommend, advisor, analytics, resumes, applications, import
- JWT authentication with bcrypt password hashing and real-time strength validation
- Celery async workers for ATS analysis and embedding generation
- SQLAlchemy async ORM with Alembic migrations
- 8 PostgreSQL tables: users, jobs, skills, job_skills, resumes, applications, market_snapshots, imports
- Global JSON error handler — every error has a code (ATS_001, REC_002, etc.)
- Master /health endpoint aggregating 13 node statuses

**ML / AI Layer**
- ATS Resume Analyzer: 4-component scoring (skill match 40pts + embedding similarity 30pts + structural 20pts + keyword 10pts)
- Job Recommender: Qdrant ANN search + multi-factor re-ranking (vector 70% + skill 20% + recency 10%)
- RAG Career Advisor: intent detection + Qdrant retrieval + Groq LLM streaming
- Skill Extractor: Groq LLM structured JSON output from job descriptions
- Smart Import Parser: ML-powered column detection (fastembed name semantics 60% + content heuristics 40%)
- Forecaster: Prophet time-series for 30/60/90-day skill demand

**Data Pipeline**
- Adzuna connector (free API, millions of EU jobs) — error codes ADZ_001 to ADZ_005
- Reed connector (free API, UK jobs) — error codes REED_001 to REED_004
- Remotive connector (no key needed, remote jobs)
- Skill normalizer: 85 canonical skills + fuzzy matching via rapidfuzz
- SHA-256 deduplication across sources
- Prefect orchestration flows for daily ingestion + market snapshots
- 686 real jobs loaded by the first nightly ingestion run on the new stack (656 on Railway before)

**Frontend — Next.js 16**
- 10 pages: landing, login, register, jobs, ATS, analytics, advisor, dashboard, tracker, import
- Deep teal + warm amber design system (custom CSS variables)
- Recharts market intelligence dashboards
- SSE streaming for real-time advisor responses
- Drag-and-drop Kanban application tracker
- Smart Import: drag/drop Excel/PDF → column mapping preview → confirm → sortable table
- Password strength meter with real-time scoring and requirements checklist

**Infrastructure**
- Docker Compose: 6 services (api, worker, postgres, redis, qdrant, mlflow)
- Production on free tiers: Vercel (frontend), Render (API, 512 MB), Neon (Postgres), Qdrant Cloud (vectors)
- GitHub Actions CI (tests + lint on every push)
- GitHub Actions: nightly ingestion (`ingest.yml`) + daytime keep-alive pings (`keepalive.yml`); Render and Vercel auto-deploy on push to main
- MLflow experiment tracking

---

## NODE ARCHITECTURE (The Key Design Decision)

Every module is a self-contained node with:
- Its own folder
- `logger.py` — JSON structured logs with `"node": "node_name"` in every line
- `errors.py` — custom error codes (ATS_001, REC_002, FOR_003, etc.)
- `health.py` — health check function
- `tests/` — test suite
- `README.md` — what it does, inputs, outputs

**Debug protocol when something breaks:**
1. `GET /health` → see which node is down
2. Open that node's `errors.py` → read the error code
3. `docker logs career-os-api | grep '"node": "ats_analyzer"'` → exact file + line

---

## PROBLEMS ENCOUNTERED AND HOW WE SOLVED THEM

### Problem 1: Docker build timeout (sentence-transformers pulling PyTorch = 2GB)
**Symptom:** `make dev` timing out after 17 minutes with EOF errors
**Root cause:** `sentence-transformers` dependency pulls PyTorch (~2GB) which exceeded Docker's download window
**Solution:** Replaced `sentence-transformers` with `fastembed` (~50MB, same model all-MiniLM-L6-v2, same 384-dim output). Changed one import, updated embedder.py API to match fastembed's interface.
**Lesson:** Always check transitive dependency sizes before adding ML libraries.

### Problem 2: Docker "no space left on device"
**Symptom:** Docker failing with disk full error
**Root cause:** Previous failed build attempts left incomplete Docker layers consuming 20+ GB
**Solution:** `docker system prune -a` — freed 20.46GB immediately. Then had 35GB free.

### Problem 3: PYTHONPATH — ml/ and data_pipeline/ not importable inside containers
**Symptom:** Every ML node health check returning "error" in CI — `ModuleNotFoundError: No module named 'data_pipeline'`
**Root cause:** The Dockerfile's WORKDIR was `/app` (inside backend/), but `ml/` and `data_pipeline/` live at the repo root as siblings. No path configuration connected them.
**Solution:** Added `PYTHONPATH=/app:/ml:/data-pipeline` in docker-compose.yml environment section. In production Dockerfile.railway: `ENV PYTHONPATH=/app:/pkgs`. In GitHub Actions: added `PYTHONPATH: ${{ github.workspace }}` to test env.

### Problem 4: CI test_health_not_started_nodes failing
**Symptom:** CI test `test_health_not_started_nodes_dont_cause_overall_error` asserting `overall == "ok"` but getting `"error"`
**Root cause (multi-layer):**
1. Adzuna/Reed connectors returned `{"status": "error"}` when API keys were missing, instead of `{"status": "not_started"}`
2. CI had fake placeholder keys (`ADZUNA_APP_ID: test`) which made connectors think they were configured, causing real HTTP calls to Adzuna/Reed with bogus credentials → 401 → "error"
3. PYTHONPATH not set → all ml/data_pipeline imports failing silently as "error"
**Solution:** Fixed connectors to return `"not_started"` when keys are genuinely absent. Removed fake placeholder keys from CI env. Added PYTHONPATH to CI.

### Problem 5: Ruff lint errors blocking CI (58 errors remaining after auto-fix)
**Symptom:** CI failing on lint step with B008, BLE001, RUF012, RUF059 errors
**Root cause:** FastAPI's `Depends()` usage in function signatures triggers B008 (ruff treats it as "function call in default argument"). BLE001 = broad exception catches needed for health checks. RUF059 didn't exist in the GitHub Actions ruff version.
**Solution:** Added `--ignore E501,B008,BLE001,RUF012` to ruff check command in CI. Removed RUF059 (version mismatch). The ignored rules are valid patterns in FastAPI code — not real bugs.

### Problem 6: Alembic migrations folder shadowing installed alembic package
**Symptom:** `alembic upgrade head` failing with import errors
**Root cause:** The folder named `alembic/` in the project root was being found by Python before the installed `alembic` package
**Solution (by Claude Code):** Renamed `alembic/` to `migrations/` and updated all references.

### Problem 7: data-pipeline vs data_pipeline (hyphen vs underscore)
**Symptom:** Import errors — `import data_pipeline` failing even with PYTHONPATH set
**Root cause:** The folder on disk was named `data-pipeline` (hyphen) but Python imports use underscores. Python cannot import from hyphenated directory names.
**Solution (by Claude Code):** Renamed directory to `data_pipeline`. Updated all references in docker-compose.yml volume mounts and Dockerfile COPY commands.

### Problem 8: passlib + bcrypt≥4.1 incompatibility
**Symptom:** User registration endpoint crashing with bcrypt errors
**Root cause:** passlib 1.7.4 (the last release, from 2020) is incompatible with bcrypt 4.1+ which changed its internal API
**Solution:** Pinned `bcrypt==4.0.1` in requirements.txt. This is a known abandoned-library problem — passlib hasn't been updated since 2020.

### Problem 9: JSON serialization crashing on PostgreSQL Decimal type
**Symptom:** `/api/v1/jobs` and analytics endpoints returning 500 errors
**Root cause:** SQLAlchemy returns `Decimal` objects for NUMERIC columns (salary_min, salary_max, avg_salary). FastAPI's JSON serializer cannot handle `Decimal` natively.
**Solution (by Claude Code):** Added explicit `float(row[x])` casting on all salary/numeric fields before returning JSON responses. Applied across jobs.py, analytics.py, applications.py, import_router.py.

### Problem 10: Missing jobs.url column and resume_skills table
**Symptom:** Various 500 errors after Claude Code extended the codebase
**Root cause:** Code referenced `jobs.url` column and `resume_skills` table that were never added to the original migration
**Solution (by Claude Code):** Created migration `0002` adding the missing column and table.

### Problem 11: Celery worker creating fresh DB engine per task (connection pool exhaustion)
**Symptom:** DB errors under load — "too many connections" (PostgreSQL default limit: 100)
**Root cause:** Every Celery task called `create_engine()` directly, creating a new connection pool each time. 50 concurrent tasks = 50 pools = 5000 potential connections.
**Solution (by Claude Code):** Added a module-level shared pooled engine in workers. All 6 call sites updated to use the shared engine.

### Problem 12: Groq model deprecation (llama-3.3-70b-versatile → 404)
**Symptom:** RAG advisor returning errors in production — `model_not_found`
**Root cause:** Groq deprecated `llama-3.1-8b-instant` and `llama-3.3-70b-versatile` from their catalog between development and production deployment
**Solution:** Updated `GROQ_MODEL_EXTRACTION` to `openai/gpt-oss-20b` and `GROQ_MODEL_ADVISOR` to `openai/gpt-oss-120b` (Groq's current model names). Updated both `config.py` and Railway service environment variables.

### Problem 13: Railway deployment — $PORT literal string error
**Symptom:** Railway deployment failing — `Error: Invalid value for '--port': '$PORT' is not a valid integer`
**Root cause:** `railway.json` startCommand used exec-form style (`["uvicorn", "--port", "$PORT"]`). Exec form does not invoke a shell, so `$PORT` is passed as a literal string, not expanded.
**Solution:** Changed to shell form: `sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"`. Shell form runs through `/bin/sh` which expands environment variables.

### Problem 14: Railway frontend building backend Dockerfile instead of Next.js
**Symptom:** Frontend service deploying FastAPI/ML packages, Next.js build never ran
**Root cause:** Frontend service had no `rootDirectory` or `railwayConfigFile` configured, so it fell back to repo-root `railway.json` which pointed to `backend/Dockerfile.railway`
**Solution (by Claude Code via Railway API):** Set `rootDirectory=/frontend` and `railwayConfigFile=frontend/railway.toml` on the frontend service. Added `output: "standalone"` to `next.config.ts` for the lean production Docker image.

### Problem 15: Railway deploy CI — "Invalid RAILWAY_TOKEN"
**Symptom:** GitHub Actions deploy workflow failing with token error
**Root cause:** Used an **account-level token** (from Railway account settings) instead of a **project-level token** (from Railway project settings → Tokens). These are different token types — RAILWAY_TOKEN expects a project token, not an account token.
**Solution:** Created a new token from Railway project settings → Tokens (not account settings), scoped to the `career-os` project + `production` environment. Updated GitHub secret.

### Problem 16: Railway deploy CI — "Service not found"
**Symptom:** After fixing the token, deploy failing with service not found
**Root cause:** Workflow had `--project UUID --environment UUID` flags that conflicted with the already-scoped project token. The token implicitly scopes to project+environment; adding explicit flags causes a conflict.
**Solution:** Removed `--project` and `--environment` flags. Command is now simply: `railway up --service career-os --ci`

### Problem 17: GitHub Actions 429 rate limit during re-runs
**Symptom:** Workflow failing with "Too Many Requests" during checkout step
**Root cause:** Too many workflow re-runs in a short period hit GitHub's archive download rate limit
**Solution:** Wait 10-15 minutes for the rate limit to reset. No code change needed.

### Problem 18: Smart Import — column detection failing on real files
**Symptom:** User's `zoeb_job_tracker.xlsx` showing "Job Title — not found, Company — not found" for all columns
**Root cause:** The file had a 3-row header (title + subtitle + blank) before the actual column headers on row 4. The parser assumed headers were on row 1.
**Solution:** Built an ML-powered two-stage column detector:
- Stage 1: Score each row in the top 30% of the file for "header likelihood" (are values short strings? are they unique? non-empty?) → pick highest scoring row
- Stage 2: Embed column header text with fastembed → compare to 50+ training examples per canonical field → combine with content heuristics (does this column contain dates? URLs? small vocabulary?) → confidence score per field
- Handles emoji status values (✅ → "applied", 📋 → "saved"), German terms, typos, creative column names

### Problem 19: Railway trial ended, site went offline
**Symptom:** Both Railway services stopped in October 2026 when the trial credit ran out.
**Solution:** Moved to hosts with permanent free tiers: Vercel (frontend), Render free web service (API), Neon (Postgres), Qdrant Cloud free cluster (vectors). Removed `railway.json`, `frontend/railway.toml`, `.railway/`, `deploy.sh`, `deploy.yml` and `backend/Dockerfile.railway`; added `render.yaml` and `backend/Dockerfile.prod`.

### Problem 20: No worker or Redis on free hosting
**Root cause:** Free tiers give one web process and no always-on worker, but uploads and ingestion queued Celery tasks.
**Solution:** `TASKS_INLINE=true` sets Celery `task_always_eager`, so `.delay()` runs in the API process. Bulk ingestion moved to a nightly GitHub Actions job (`ingest.yml`) that runs migrations, seeding, ingestion and the market snapshot, throttling Groq calls with `SKILL_EXTRACTION_DELAY_S`. `/health` reports Redis as `not_started` in this mode.

### Problem 21: asyncpg rejects Neon connection strings
**Root cause:** Neon URLs carry libpq parameters (`sslmode=require&channel_binding=require`) that asyncpg doesn't understand; Neon/Render may also hand out `postgres://`.
**Solution:** `config.py` normalises `postgres://` to `postgresql://`; `database.py` strips the libpq parameters, maps `sslmode` to asyncpg's `ssl`, disables the statement cache on `-pooler` hosts, and uses a smaller pool with `pool_recycle` because Neon scales to zero.

### Problem 22: Render cold starts vs. shared free hours
**Root cause:** Render's free service sleeps after 15 min idle (about 1 min to wake), but its 750 free hours per month are shared by the whole workspace, which also hosts the Electricity Forecaster API. Pinging 24/7 would use about 744 h alone.
**Solution:** Added a dependency-free `/ping` endpoint and `keepalive.yml`, which pings it every 10 minutes from 07:00 to 23:00 Berlin time (about 500 h/month). The embedding model is baked into the Docker image so a woken instance doesn't download it. Measured API memory: about 190 MB at start, 280 MB after `/health`, roughly 450 MB with the embedding model, inside the 512 MB limit.

### Problem 23: Vercel build failed after Next.js compiled successfully
**Symptom:** `npm run build` finished all 13 pages, then failed in "Running onBuildComplete from Vercel" with `ENOENT .next/next-server.js.nft.json`.
**Root cause:** `output: "standalone"` in `next.config.ts` (added for the Railway Docker image) conflicts with Vercel's own packaging.
**Solution:** `output: process.env.VERCEL ? undefined : "standalone"`. Vercel sets `VERCEL=1` during its builds; the Docker image still gets standalone output.

### Problem 24: Ingestion workflow rejected at startup
**Symptom:** GitHub Actions showed "Startup failure" and listed the workflow by file path instead of its name.
**Root cause:** `PREFECT_HOME: ${{ runner.temp }}/prefect` in the job-level `env:` block. The `runner` context is not available there (only `github`, `vars`, `secrets`, `inputs`, `needs`, `strategy`, `matrix`).
**Solution:** `PREFECT_HOME: /tmp/prefect`. The next run fetched 2,171 jobs, kept 686 after deduplication, and embedded them into Qdrant Cloud.

### Problem 25: Setting up the free stack (10 Oct 2026, in order)
1. Neon project `career-os` in Frankfurt; connection string copied with pooling off.
2. Qdrant Cloud free cluster `career-os` in Frankfurt; API key created (shown once, saved by Zoeb).
3. Seven GitHub repository secrets added (Zoeb pasted the secret values himself).
4. Render Blueprint `career-os` from `render.yaml` → `career-os-api`; first `/health` returned `overall: ok` with all 13 nodes green and the embedding model loaded within 512 MB.
5. Vercel project `career-os`, root directory `frontend`, `NEXT_PUBLIC_API_URL` set to the Render URL.
6. Render `CORS_ORIGINS` changed from `*` to the Vercel URL; GitHub variable `API_URL` set to turn on the daytime keep-alive.
7. Verified end to end: the Vercel jobs page loads 686 listings from the Render API.
8. Repository cleanup: removed the old `HANDOFF.md`, the create-next-app `frontend/README.md`, empty `docs/`, `infrastructure/`, `ml/notebooks/` folders and local caches.

---

## TECH STACK SUMMARY

| Layer | Technology | Why |
|-------|-----------|-----|
| API | FastAPI | Async, auto-docs, Pydantic validation |
| DB | PostgreSQL (Neon) | Relational, permanent free plan, scales to zero |
| Vector DB | Qdrant | Purpose-built ANN search, free tier |
| Cache/Queue | Redis + Celery (local only) | Async task processing; production runs tasks inline (`TASKS_INLINE=true`) |
| LLM | Groq (free) | OpenAI-compatible, fast, no credit card |
| Embeddings | fastembed | No PyTorch dependency, same quality |
| Orchestration | Prefect | Python-native, free cloud tier |
| ML Tracking | MLflow | Experiment versioning |
| Frontend | Next.js 16 | App Router, TypeScript, SSE support |
| Deployment | Vercel + Render + Neon + Qdrant Cloud | All free forever, no credit card |
| CI | GitHub Actions | Free for public repos |

---

## ARCHITECTURE DECISIONS LOG

**Why fastembed over sentence-transformers?**
sentence-transformers pulls PyTorch (~2GB). fastembed uses ONNX Runtime (~50MB). Same model (all-MiniLM-L6-v2), same 384-dim output, 40x smaller install. Critical for Railway's build time limits.

**Why Groq over OpenAI?**
Groq is completely free with no credit card. OpenAI requires payment. Groq's API is OpenAI-compatible so the code change was a single base_url swap. For a portfolio project, zero cost is essential.

**Why node architecture (self-contained modules)?**
Production debugging without this is a nightmare. With it: one grep command finds the exact error. Every node has its own error codes, logger, and health check. When /health shows `"ats_analyzer": "error"`, you know exactly where to look.

**Why Railway over AWS? (superseded, see migration below)**
AWS requires VPC setup, IAM roles, ECS task definitions, ALB configuration — weeks of DevOps work. Railway deploys a Docker Compose app in minutes with one command. For a solo portfolio project, shipping fast is more valuable than using the most enterprise tool.

**Why Prefect over Airflow?**
Airflow needs a dedicated server ($80+/month). Prefect Cloud has a free tier with UI, scheduling, retries, and alerts. Python-native — no XML DAGs, no Jinja templating.

---

## REPOSITORY STRUCTURE (final)

```
career-os/
├── backend/                  FastAPI app
│   ├── app/
│   │   ├── api/              11 routers
│   │   ├── models/           SQLAlchemy models
│   │   ├── workers/          Celery tasks
│   │   ├── scripts/          seed_skills.py
│   │   └── middleware/       logging + error handling
│   ├── migrations/           Alembic (renamed from alembic/ to avoid shadowing)
│   ├── Dockerfile            local dev
│   └── Dockerfile.prod       production API for Render (repo-root context, includes ml/ + data_pipeline/, embedding model baked in)
├── ml/                       all ML nodes
│   ├── shared/               embedder.py + llm_client.py
│   ├── ats_analyzer/
│   ├── recommender/
│   ├── rag_advisor/
│   ├── forecaster/
│   ├── skill_extractor/
│   └── import_parser/        ML column detection for Smart Import
├── data_pipeline/            ETL (underscore, not hyphen — Python import requirement)
│   ├── connectors/           adzuna, reed, remotive
│   ├── transformers/         dedup, skill_normalizer
│   └── flows/                ingestion_flow, snapshot_flow
├── frontend/                 Next.js 16 (deployed on Vercel, root directory frontend)
│   ├── app/                  10 pages
│   ├── components/
│   ├── lib/                  api.ts client
│   └── Dockerfile            production Next.js standalone build (Vercel builds from source instead)
├── samples/                  sample-applications.xlsx, sample-applications.pdf
├── docker-compose.yml        6 services local dev
├── docker-compose.prod.yml   production (no mlflow, no volume mounts)
├── render.yaml               Render blueprint for the API
├── Makefile                  make dev/test/health/migrate/seed/ingest
├── CAREER_OS_HANDOFF.md      this file (the older HANDOFF.md planning doc was removed)
├── DEPLOY.md                 deployment instructions
└── .github/workflows/
    ├── ci.yml                test + lint on every push
    ├── ingest.yml            nightly job ingestion into Neon + Qdrant
    └── keepalive.yml         pings the API every 10 min, 07:00 to 23:00 Berlin
```

---

## CONTEXT BLOCK FOR NEW CHAT SESSIONS

```
PROJECT: AI Career Operating System (career-os)
STATUS: Complete; hosted on Vercel + Render + Neon + Qdrant Cloud (free forever)
GITHUB: https://github.com/zoeb-ali/career-os
LIVE: https://career-os-xi-bay.vercel.app
API: https://career-os-api-soen.onrender.com
STACK: FastAPI + PostgreSQL (Neon) + Qdrant Cloud + Groq LLM + fastembed + Next.js + Docker + Render + Vercel + Prefect + MLflow + GitHub Actions
ARCHITECTURE: Every module = self-contained node (logger + error codes + health check + tests)
DATA: ~686 real jobs from Adzuna/Reed/Remotive in Neon, refreshed nightly by GitHub Actions
KEY FILES: CAREER_OS_HANDOFF.md (this), DEPLOY.md (deployment steps + current production reference), README.md (deployment journey)
CURRENT TASK: [update this]
```

---

*Built by Zoeb Ali Khan | M.Sc. Data Science, Universität Bielefeld | August 2026*
