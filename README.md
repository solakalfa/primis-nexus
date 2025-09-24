# Primis Nexus — MEM Bootstrap (no Docker)

This package runs the **Primis Nexus API** on Cloud Shell or any machine **without Docker or Postgres**.
It uses an **in‑memory store** (`DB_MODE=mem`) for the Events MVP so you can run smoke/contract tests instantly.

Later, switch to Postgres by setting `DB_MODE=pg` and providing `DATABASE_URL` (the previous bootstrap already includes docker-compose if you need it).

## Quickstart (MEM mode)
```bash
cp .env.example .env
npm i
npm run dev
# new terminal:
npm run test:smoke && npm run test:contract
```

## Switch to Postgres (later)
- Set `DB_MODE=pg` in `.env` and set `DATABASE_URL=postgres://...`
- Run `node services/api/src/db.mjs --migrate`
- Keep `npm run dev` as-is.
