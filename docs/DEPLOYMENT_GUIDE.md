# Student OS — Production Deployment Guide

## Overview
Student OS is architected as a lightweight, high-performance web application powered by **Cloudflare Workers** (Hono REST API), **Cloudflare D1** (Serverless SQLite Database), and **Cloudflare Pages** (Vite React Frontend).

---

## 1. Prerequisites
- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Cloudflare Wrangler CLI (`npm install -g wrangler`)
- Cloudflare Account with D1 and Workers enabled

---

## 2. Environment Configuration

### Backend (`backend/wrangler.jsonc`)
```json
{
  "name": "student-os-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-09-23",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "student-os-db",
      "database_id": "<your-d1-database-id>"
    }
  ]
}
```

### Production Secrets
Bind `JWT_SECRET` via Wrangler CLI:
```bash
npx wrangler secret put JWT_SECRET --name student-os-api
```

---

## 3. Database Migration Deployment
Apply migrations 0001 through 0005 to your production D1 database:

```bash
npx wrangler d1 migrations apply student-os-db --remote
```

Migration execution order:
1. `0001_auth_schema.sql`
2. `0002_study_schema.sql`
3. `0003_planner_schema.sql`
4. `0004_revision_schema.sql`
5. `0005_account_schema.sql`

---

## 4. Building & Deploying

### Build All Monorepo Packages
```bash
pnpm build
```

### Deploy Backend (Cloudflare Workers)
```bash
cd backend
npx wrangler deploy
```

### Deploy Frontend (Cloudflare Pages)
```bash
cd frontend
npx wrangler pages deploy dist --project-name=student-os-app
```

---

## 5. Post-Deployment Verification
1. Test Health Check endpoint: `GET https://<api-subdomain>.workers.dev/api/v1/health`
2. Open application URL: `https://student-os-app.pages.dev`
3. Verify authentication, study engine, planner workspace, revision workspace, analytics dashboard, and account page.
