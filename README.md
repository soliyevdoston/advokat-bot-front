# Advokat Bot Frontend

Separate admin frontend for Advokat bot platform.

## Stack
- Next.js
- React

## Run Local
1. Create env:
   ```bash
   cp .env.example .env.local
   ```
2. Install:
   ```bash
   npm install
   ```
3. Start:
   ```bash
   npm run dev
   ```

## Env
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1` (local)
- Production:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-render-backend-domain>/api/v1`

## Deploy (Vercel)
This repo includes `vercel.json`, so defaults are code-defined.

1. Push this folder as separate Git repo.
2. Import project in Vercel.
3. Set `NEXT_PUBLIC_API_BASE_URL`.
4. Deploy.

## Backend CORS reminder
Backend (`advokat-bot`) must allow this frontend origin via:
- `ALLOWED_ORIGIN`
- or `ALLOWED_ORIGIN_REGEX`
