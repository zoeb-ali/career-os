<div align="center">

# 🎯 Career OS
### AI-Powered Career Operating System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)](https://neon.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org)
[![CI](https://github.com/zoeb-ali/career-os/actions/workflows/ci.yml/badge.svg)](https://github.com/zoeb-ali/career-os/actions/workflows/ci.yml)
[![Daily job ingestion](https://github.com/zoeb-ali/career-os/actions/workflows/ingest.yml/badge.svg)](https://github.com/zoeb-ali/career-os/actions/workflows/ingest.yml)

**A production-grade platform combining job discovery, ATS resume analysis, AI career advice, and labor market intelligence — built as a full Data Science portfolio project and hosted entirely on free-forever infrastructure.**

[🌐 Live Demo](https://career-os-xi-bay.vercel.app) · [📖 API Docs](https://career-os-api-soen.onrender.com/docs) · [❤️ Health](https://career-os-api-soen.onrender.com/health) · [🐛 Report Bug](https://github.com/zoeb-ali/career-os/issues)

</div>

---

## 📌 What is Career OS?

Career OS is a unified AI platform for students and job seekers that replaces scattered tools like LinkedIn Premium, Jobscan, Teal, and Huntr with a single system. It ingests real job data every night from multiple APIs, analyzes resumes with ML, recommends jobs using vector similarity, and answers career questions via a RAG-powered advisor.

It runs in production on **Vercel, Render, Neon, Qdrant Cloud and GitHub Actions**, all on free tiers that don't expire and need no credit card. How it got there is documented below in [Deployment journey](#-deployment-journey-from-railway-to-free-forever-hosting).

> Built by **Zoeb Ali Khan** — M.Sc. Data Science (ongoing), Universität Bielefeld

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 🔍 **Job Aggregation** | Nightly ingestion from Adzuna, Reed and Remotive APIs: 680+ real jobs, deduplicated and normalized |
| 🧠 **ATS Resume Analyzer** | Upload your CV and get a score (0 to 100) broken down by skill match, semantic similarity, structure and keyword density |
| 🎯 **Job Recommender** | Qdrant vector search matches your resume embedding to the most relevant jobs, then re-ranks them |
| 💬 **AI Career Advisor** | RAG chatbot backed by live job data, e.g. "Which skills should I learn next?" |
| 📊 **Market Intelligence** | Dashboards for top skills, salary ranges, hiring companies, remote vs onsite trends |
| 📈 **Demand Forecasting** | Prophet time-series models forecast 30/60/90-day skill demand |
| 📋 **Application Tracker** | Kanban board: Saved → Applied → Interview → Offer / Rejected |
| ✨ **Smart Import** | Upload an Excel/PDF job tracker; ML column detection with confidence scores imports it automatically |
| 🔐 **Auth System** | JWT authentication with real-time password strength validation |

---

## 🚀 Live Deployment

| Service | URL | Host (free tier) |
|---------|-----|------------------|
| 🌐 Frontend | https://career-os-xi-bay.vercel.app | Vercel Hobby |
| 🔌 Backend API | https://career-os-api-soen.onrender.com | Render free web service |
| 📖 API Docs | https://career-os-api-soen.onrender.com/docs | Render |
| ❤️ Health Check | https://career-os-api-soen.onrender.com/health | Render |
| 🗄️ Database | Neon Postgres, Frankfurt | Neon Free |
| 🧭 Vector search | Qdrant Cloud cluster, Frankfurt | Qdrant Cloud Free |
| ⏰ Data refresh | `ingest.yml`, every night 03:17 UTC | GitHub Actions |

> **First visit of the day can take about a minute.** The free API sleeps when idle. A GitHub Actions job keeps it awake from 07:00 to 23:00 Berlin time; outside that window the first request wakes it up. Setup steps: [DEPLOY.md](DEPLOY.md).

---

## 🏗️ Architecture

### Production (free-forever hosting)

```
                    Browser
                       │
        ┌──────────────▼──────────────┐
        │  Vercel — Next.js frontend  │  rebuilds on every push to main
        └──────────────┬──────────────┘
                       │ REST + SSE  (NEXT_PUBLIC_API_URL)
        ┌──────────────▼──────────────┐
        │ Render — FastAPI API (512MB)│  TASKS_INLINE=true:
        │ embedding model baked in    │  no Redis, no worker process
        └───────┬──────────────┬──────┘
                │              │
     ┌──────────▼───┐   ┌──────▼─────────┐
     │ Neon Postgres│   │ Qdrant Cloud   │
     │ jobs, users, │   │ job + resume   │
     │ skills, apps │   │ embeddings     │
     └──────────▲───┘   └──────▲─────────┘
                │              │
        ┌───────┴──────────────┴──────┐
        │ GitHub Actions              │
        │ ingest.yml  — nightly ETL:  │  Adzuna · Reed · Remotive
        │   fetch → dedup → embed →   │  → Groq skill extraction
        │   extract skills → snapshot │
        │ keepalive.yml — daytime ping│
        │ ci.yml — lint + tests       │
        └─────────────────────────────┘
```

### Local development (`make dev`)

```
┌─────────────────────────────────────────────────────────────┐
│                Next.js 16 · TypeScript · Tailwind           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│     FastAPI (11 routers) + Celery worker (queued tasks)     │
└───┬──────────┬────────────┬────────────┬────────────────────┘
┌───▼──┐  ┌───▼───┐  ┌─────▼──┐  ┌─────▼──────┐
│ PG   │  │ Redis │  │ Qdrant │  │  MLflow    │
└──────┘  └───────┘  └────────┘  └────────────┘
```

The same code runs in both: a single setting, `TASKS_INLINE`, decides whether background tasks go to Celery through Redis (local) or run inside the API process (production).

---

## 🛤️ Deployment journey: from Railway to free-forever hosting

Career OS was first deployed on **Railway** in August 2026 as five services: API, frontend, Postgres, Redis and Qdrant. It worked, but it ran on Railway's trial credit. In **October 2026 the trial ended and the site went offline.** Instead of paying, the whole system was redesigned to run on hosts whose free tiers don't expire.

### Why these hosts

| Need | Choice | Why |
|------|--------|-----|
| Frontend | **Vercel** | Free forever for hobby projects, native Next.js support, auto-deploys from GitHub (same setup as other portfolio projects) |
| API | **Render** free web service | Runs the existing Docker image unchanged; 512 MB RAM and 750 instance hours per month |
| Postgres | **Neon** | Permanent free plan (no 30-day expiry like Render's free Postgres), scales to zero, 1 GB |
| Vectors | **Qdrant Cloud** free cluster | Same Qdrant API as local, 1 GB RAM / 4 GB disk, no time limit |
| Background jobs | **GitHub Actions** | Free for public repos; replaces an always-on Prefect worker and Celery worker that free tiers can't host |

Redis and the Celery worker were dropped from production entirely. They are still used locally.

### What had to change, and how it was solved

1. **No worker process on free hosting.** File uploads and ingestion used to queue Celery tasks for a separate worker. A new setting `TASKS_INLINE=true` turns on Celery's eager mode, so `.delay()` runs the task immediately inside the API process. Small per-request tasks (embedding one uploaded CV) run inline; the heavy batch work moved to GitHub Actions.

2. **Batch ingestion moved to GitHub Actions** (`.github/workflows/ingest.yml`). Every night it applies migrations, seeds the skill taxonomy, fetches jobs from Adzuna, Reed and Remotive, deduplicates them, embeds them into Qdrant, extracts skills with Groq and records a market snapshot for the forecaster. Groq calls are throttled with `SKILL_EXTRACTION_DELAY_S` to stay under the free rate limit. The first run filled the empty database with 686 jobs.

3. **Neon connection strings broke asyncpg.** Neon hands out URLs with `sslmode=require&channel_binding=require`, which asyncpg doesn't understand, and some hosts use the `postgres://` scheme that SQLAlchemy 2 rejects. `config.py` now normalises the scheme, and `database.py` strips the libpq parameters, translates `sslmode` into asyncpg's `ssl` argument, and uses a smaller pool with `pool_recycle` because Neon pauses after 5 minutes idle.

4. **512 MB of RAM.** The API was measured before deploying: about 190 MB at start, 280 MB after a full `/health`, and roughly 450 MB with the embedding model loaded, inside the limit. The `all-MiniLM-L6-v2` model is downloaded at Docker build time (`backend/Dockerfile.prod`) so a freshly woken instance doesn't fetch 90 MB before its first answer.

5. **Cold starts vs. shared free hours.** Render's free service sleeps after 15 minutes without traffic and takes about a minute to wake. Pinging it around the clock would fix that, but Render's 750 free hours per month are shared by every free service in the account, and another portfolio API lives there too. So `keepalive.yml` calls a lightweight `/ping` endpoint every 10 minutes **only from 07:00 to 23:00 Berlin time** (about 500 hours a month). `/ping` touches no database or external API, so it costs nothing.

6. **Vercel build failed after a successful Next.js build.** `next.config.ts` had `output: "standalone"` for the Docker image, and Vercel's own packaging step can't handle it (`ENOENT .next/next-server.js.nft.json`). It is now turned off only when Vercel builds (`process.env.VERCEL`), so the Docker image still works.

7. **Workflow rejected by GitHub.** The first version of `ingest.yml` used `${{ runner.temp }}` in the job-level `env` block, where the `runner` context isn't available, so GitHub refused to start it. It now uses a fixed `/tmp` path.

8. **Groq model retirement.** Groq retired the Llama 3.1 / 3.3 model IDs the project originally used. Production now uses `openai/gpt-oss-20b` (extraction) and `openai/gpt-oss-120b` (advisor), set in `render.yaml` and `ingest.yml`.

9. **Railway leftovers removed.** `railway.json`, `frontend/railway.toml`, `.railway/`, `deploy.sh`, the Railway deploy workflow and `backend/Dockerfile.railway` were deleted; `render.yaml` and `backend/Dockerfile.prod` replace them. Render and Vercel both deploy automatically on every push to `main`, so no deploy workflow is needed.

### Result

| | Railway (before) | Free-forever stack (now) |
|---|---|---|
| Cost | Trial credit, then paid | €0, no card |
| Services to run | 5 always-on | 1 web service + managed DB/vector store |
| Data refresh | Manual / worker | Nightly GitHub Actions |
| Deploys | Railway CLI + token | Automatic on push |
| Trade-off | — | ~1 minute cold start at night |

The full log of every problem hit while building and deploying the project, with root causes and fixes, is in [CAREER_OS_HANDOFF.md](CAREER_OS_HANDOFF.md).

---

## 🧱 Tech Stack

### Backend
- **FastAPI** — async REST API with 11 routers, JWT auth, SSE streaming
- **PostgreSQL** (Neon in production) — users, jobs, skills, job_skills, resumes, applications, market_snapshots, imports
- **Celery + Redis** — queued background tasks locally; inline mode in production
- **Alembic** — database migrations (run automatically on API start and in the ingestion job)

### ML / AI
- **Groq LLM** — skill extraction and RAG advisor (free tier)
- **fastembed** — local sentence embeddings (all-MiniLM-L6-v2, 384-dim, no API cost, no PyTorch)
- **Qdrant** — vector database for job and resume embeddings
- **Prophet** — time-series forecasting for skill demand
- **scikit-learn + rapidfuzz** — skill normalization and matching
- **Smart Import ML** — embedding-based column detection with confidence scoring (60% name semantics + 40% content heuristics)

### Data Pipeline
- **Prefect** flows run by **GitHub Actions** — nightly ingestion + market snapshots
- **Adzuna API** — millions of job listings across Europe
- **Reed API** — UK tech job listings
- **Remotive API** — remote jobs worldwide (no key required)

### Frontend
- **Next.js 16** App Router + TypeScript
- **Tailwind CSS** + shadcn/ui — deep teal + warm amber design system
- **Recharts** — market intelligence visualizations
- **SSE streaming** — real-time advisor chat responses
- **Drag-and-drop Kanban** — application tracker

### Infrastructure
- **Vercel** (frontend) · **Render** (API) · **Neon** (Postgres) · **Qdrant Cloud** (vectors) — all free tiers
- **GitHub Actions** — CI (lint + tests), nightly ingestion, daytime keep-alive
- **Docker / Docker Compose** — production image for Render, 6-service local stack
- **MLflow** — experiment tracking (local)

---

## 🚀 Quick Start (Local)

### Prerequisites
- Docker Desktop running
- Node.js 18+
- API keys: [Groq](https://console.groq.com) (free) · [Adzuna](https://developer.adzuna.com) (free) · [Reed](https://www.reed.co.uk/developers) (free)

### 1. Clone and configure
```bash
git clone https://github.com/zoeb-ali/career-os.git
cd career-os
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Start everything
```bash
make dev          # starts all 6 Docker containers
make setup        # runs DB migrations + seeds skill taxonomy
make ingest       # pulls real jobs from the APIs
```

### 3. Open the app
```
Frontend:   http://localhost:3001
API Docs:   http://localhost:8000/docs
Health:     http://localhost:8000/health
MLflow:     http://localhost:5001
Qdrant:     http://localhost:6333/dashboard
```

To deploy your own copy for free, follow [DEPLOY.md](DEPLOY.md).

---

## 🔍 Node Architecture

Every module is a **self-contained node** with its own:
- JSON structured logger (`"node": "ats_analyzer"` in every log line)
- Error codes (`ATS_001`, `REC_002`, `FOR_003`) for instant debugging
- Health check function aggregated at `GET /health`
- Test suite in `tests/`

**When something breaks:**
```bash
# 1. See which node is down (production or local)
curl https://career-os-api-soen.onrender.com/health | python3 -m json.tool

# 2. Read that node's error codes
cat ml/ats_analyzer/errors.py

# 3. Grep logs for that node (local)
docker logs career-os-api 2>&1 | grep '"node": "ats_analyzer"'
```

In production, logs are in the Render dashboard → `career-os-api` → Logs, and ingestion logs are in GitHub → Actions → Daily job ingestion.

---

## 📁 Project Structure

```
career-os/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/              # 11 routers (health, auth, jobs, ats, recommend,
│   │   │                     #   advisor, analytics, resumes, applications, import)
│   │   ├── models/           # SQLAlchemy models
│   │   ├── workers/          # Celery tasks (inline in production)
│   │   ├── scripts/          # seed_skills.py
│   │   └── middleware/       # JSON logging + error handling
│   ├── migrations/           # Alembic DB migrations
│   ├── Dockerfile            # local dev image
│   ├── Dockerfile.worker     # local Celery worker image
│   └── Dockerfile.prod       # production image for Render (model baked in)
├── ml/                       # All ML nodes
│   ├── shared/               # Embedder + LLM client (used by all nodes)
│   ├── ats_analyzer/         # Resume scoring
│   ├── recommender/          # Qdrant ANN job matching
│   ├── rag_advisor/          # RAG career Q&A with intent detection
│   ├── forecaster/           # Prophet skill demand forecasting
│   ├── skill_extractor/      # Groq LLM structured skill extraction
│   └── import_parser/        # ML-powered column detection for Smart Import
├── data_pipeline/            # ETL pipeline
│   ├── connectors/           # Adzuna, Reed, Remotive
│   ├── transformers/         # Dedup + skill normalization (85 canonical skills)
│   └── flows/                # Prefect flows (ingestion, market snapshot)
├── frontend/                 # Next.js 16 app (10 pages), deployed on Vercel
├── samples/                  # Sample import files for testing Smart Import
├── .github/workflows/
│   ├── ci.yml                # lint + tests on every push
│   ├── ingest.yml            # nightly job ingestion into Neon + Qdrant
│   └── keepalive.yml         # daytime pings so the free API stays awake
├── render.yaml               # Render blueprint for the production API
├── docker-compose.yml        # 6-service local dev stack
├── docker-compose.prod.yml   # run the production images locally
├── DEPLOY.md                 # step-by-step free hosting setup
├── CAREER_OS_HANDOFF.md      # full build log: every problem and fix
└── Makefile                  # make dev/test/health/ingest/setup
```

---

## 📊 Data Science Components

| Component | Implementation |
|-----------|----------------|
| **Data Collection** | Multi-source API ingestion with retry logic and rate limit handling |
| **ETL Pipeline** | Prefect flows scheduled nightly on GitHub Actions, with validation and deduplication |
| **NLP** | LLM-based structured skill extraction with taxonomy normalization |
| **Embeddings** | Sentence embeddings for semantic job-resume matching |
| **Recommendation** | Approximate nearest neighbour search with multi-factor re-ranking |
| **Forecasting** | Prophet time-series with confidence intervals and trend detection |
| **RAG** | Retrieval-augmented generation with intent classification |
| **ML Column Detection** | Embedding similarity + content heuristics for intelligent spreadsheet parsing |
| **MLOps** | Health monitoring per node, structured logging, MLflow tracking, scheduled pipelines |
| **Deployment** | Vercel + Render + Neon + Qdrant Cloud (free) · Docker · GitHub Actions CI/CD |

---

## 🛠️ Useful Commands

```bash
make dev          # start all containers
make down         # stop all containers
make health       # check all 13 node statuses
make test         # run full test suite
make logs N=api   # tail API logs
make migrate      # run DB migrations
make seed         # seed skills taxonomy
make ingest       # run ETL ingestion
make snapshot     # create daily market snapshot
```

---

## 🧪 Testing

```bash
make test                        # all tests
make test-node N=ats_analyzer    # single node
make test-node N=recommender
make test-node N=forecaster
```

Tests cover the ML nodes, the API health endpoint and the skill normalizer. CI runs lint and tests on every push.

---

## 📈 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | All 13 node statuses |
| GET | `/ping` | Lightweight liveness check (used by keep-alive) |
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Get JWT token |
| GET | `/api/v1/jobs` | Search/filter jobs |
| POST | `/api/v1/ats/analyze` | ATS resume scoring |
| GET | `/api/v1/recommend/{user_id}` | Personalised job recommendations |
| POST | `/api/v1/advisor/ask` | Career Q&A |
| POST | `/api/v1/advisor/stream` | Streaming advisor (SSE) |
| GET | `/api/v1/analytics/skills/top` | Top skills by demand |
| GET | `/api/v1/analytics/salary` | Salary ranges by skill |
| POST | `/api/v1/applications/` | Save a job |
| PATCH | `/api/v1/applications/{id}` | Update application status |
| POST | `/api/v1/import/upload` | Smart Import — parse spreadsheet/PDF |
| POST | `/api/v1/import/confirm` | Confirm and save imported applications |

Full interactive docs: [career-os-api-soen.onrender.com/docs](https://career-os-api-soen.onrender.com/docs)

---

## 👤 About

Built by **Zoeb Ali Khan** — M.Sc. Data Science (ongoing), Universität Bielefeld

DataCamp Certified: Data Scientist Professional · Data Engineer Associate · Data Scientist Associate

[![Portfolio](https://img.shields.io/badge/Portfolio-zoeb--ali.github.io-0F766E?style=for-the-badge)](https://zoeb-ali.github.io)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/zoeb-ali-khan)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github)](https://github.com/zoeb-ali)

---

<div align="center">

⭐ Star this repo if you find it useful

</div>
