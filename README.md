# Optinus Resource Management — ResourceFlow

> **Simple to use. Easy to understand. Fast to operate. Powerful enough for professional resource tracking.**

A modern, production-ready **Resource Demand & Candidate Tracking Platform** built for PMO teams, Resource Managers, Recruiters, Staffing Teams, Account Managers, Delivery Managers and Management.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS 4**, **shadcn/ui**, **Prisma ORM**, **recharts**, **dnd-kit**, and the **z-ai-web-dev-sdk** LLM for AI-powered ATS scoring.

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Set up the database
bun run db:push          # create schema
bun run scripts/seed.ts   # load demo data (6 users, 5 clients, 15 demands, 40 resources, 28 assignments)

# 3. Start dev server
bun run dev               # http://localhost:3000

# 4. Sign in
#    Email:    admin@optinus.com
#    Password: admin123
```

## Version history

| Version | Date | Key features |
|---------|------|--------------|
| **v1.0.0** | Oct 2026 | Initial release — 12 modules, dark Optinus theme, ATS validator, bulk import (drag-drop/paste/resume auto-extract), Kanban drag-drop, resource picker, demand association, global locations, INR/USD/EUR currency |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons |
| Database | Prisma ORM (SQLite file-based) |
| Auth | bcryptjs + signed HTTP-only session cookie |
| Charts | recharts |
| Drag-drop | @dnd-kit/core |
| AI | z-ai-web-dev-sdk (LLM for ATS scoring + resume extraction) |
| Font | Nunito (300–800) |

## Modules (12)

1. **Dashboard** — executive KPIs + 7 charts
2. **Open Demands** — filterable/sortable table with edit/delete
3. **Resources** — card grid with edit/delete + ATS scores
4. **Resource Database** — full historical archive with ATS score column
5. **Kanban Board** — drag-drop pipeline + Add to Kanban + Import
6. **Clients** — client cards with demand counts
7. **Reports** — 8 report types with CSV export
8. **ATS Validator** — AI scoring (individual CVs + batch score all resources)
9. **Import / Export** — bulk CSV/TSV/JSON + resume auto-extract
10. **Activity** — audit log timeline
11. **Settings** — configurable business values
12. **User Management** — admin-only user CRUD

## Development

```bash
bun run dev          # dev server
bun run lint         # ESLint
bun run db:push      # sync Prisma schema
bun run scripts/seed.ts    # seed demo data
bun run scripts/wipe-data.ts --confirm-i-really-want-to-wipe  # wipe (DESTRUCTIVE — requires explicit flag)
```

## License

© 2026 Optinus Solutions. All rights reserved.
