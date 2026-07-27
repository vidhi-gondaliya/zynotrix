# ZYNOTRIX Documentation

Complete enterprise-level documentation for the ZYNOTRIX AI-powered task management and team collaboration SaaS platform.

**Codebase**: `zynotrix/` — Next.js 14 App Router, Prisma 5.22, Neon PostgreSQL, Anthropic Claude AI  
**Documentation Version**: 1.0.0  
**Last Updated**: 2026-07-23

---

## Quick Links

- [Project Overview](00_Project_Overview.md) — What ZYNOTRIX is and what it does
- [API Reference (OpenAPI)](39_OpenAPI.yaml) — Full REST API specification
- [Postman Collection](40_Postman_Collection.json) — Import into Postman for API testing
- [Deployment Guide](24_Deployment.md) — Deploy to Vercel + Neon from scratch
- [Environment Variables](26_Environment_Variables.md) — Every env var documented
- [Project Audit](PROJECT_AUDIT.md) — Scored assessment of 14 quality dimensions
- [Known Issues](27_Known_Issues.md) — All confirmed bugs and tech debt
- [Improvement Roadmap](29_Improvement_Roadmap.md) — Prioritized improvement plan

---

## Documentation Index

### Product & Vision

| File | Description |
|------|-------------|
| [00_Project_Overview.md](00_Project_Overview.md) | Product summary, tech stack, key differentiators, quick architecture overview |
| [01_Product_Vision.md](01_Product_Vision.md) | Mission, vision, guiding principles, and long-term goals |
| [02_Features.md](02_Features.md) | All 18+ features with descriptions, status, and implementation details |
| [03_User_Flows.md](03_User_Flows.md) | Key user journeys: signup, task lifecycle, AI features, admin workflows |
| [34_User_Personas.md](34_User_Personas.md) | 5 detailed user personas with goals, touchpoints, and frustrations |
| [35_Competitor_Positioning.md](35_Competitor_Positioning.md) | ZYNOTRIX vs. Jira, Linear, Asana, Monday, Notion, ClickUp |

### Design & UI

| File | Description |
|------|-------------|
| [04_UI_UX_Design_System.md](04_UI_UX_Design_System.md) | "Obsidian Command" design system overview, principles, layer model |
| [05_Brand_Guidelines.md](05_Brand_Guidelines.md) | Brand identity, personality, visual language |
| [06_Color_System.md](06_Color_System.md) | Full color palette, CSS custom properties, dark/light themes |
| [07_Typography.md](07_Typography.md) | Font stack (Plus Jakarta Sans, DM Sans, JetBrains Mono), type scale |
| [08_Component_Library.md](08_Component_Library.md) | All reusable UI components with props and usage |
| [09_Animations.md](09_Animations.md) | Framer Motion patterns, CSS keyframes, animation tokens |
| [33_Screens.md](33_Screens.md) | Every screen with URL, purpose, components, and auth requirements |
| [36_Assets_Inventory.md](36_Assets_Inventory.md) | Images, fonts, uploads — what exists, what's missing |
| [37_Icons.md](37_Icons.md) | lucide-react usage, all icons in context, naming conventions |
| [38_Images.md](38_Images.md) | Avatar system, image handling, next/image gap analysis |

### Technical Architecture

| File | Description |
|------|-------------|
| [14_Project_Architecture.md](14_Project_Architecture.md) | System architecture, request lifecycle, data flow diagrams |
| [15_Folder_Structure.md](15_Folder_Structure.md) | Complete directory tree with descriptions |
| [16_Technology_Stack.md](16_Technology_Stack.md) | Every dependency with version, purpose, and usage patterns |
| [17_State_Management.md](17_State_Management.md) | Zustand stores, SSE hooks, fetch patterns, state lifecycle |
| [18_Business_Logic.md](18_Business_Logic.md) | Multi-tenancy, RBAC, rewards, notifications, Kanban, search indexing |
| [19_Third_Party_Services.md](19_Third_Party_Services.md) | Anthropic, Google, Neon, Vercel, Slack, GitHub integrations |

### Data & API

| File | Description |
|------|-------------|
| [12_Database.md](12_Database.md) | Full Prisma schema, 50+ models, relationships, indexes |
| [11_API_Documentation.md](11_API_Documentation.md) | API route inventory with methods, auth requirements, patterns |
| [39_OpenAPI.yaml](39_OpenAPI.yaml) | OpenAPI 3.0 specification — syntactically valid YAML |
| [40_Postman_Collection.json](40_Postman_Collection.json) | Postman collection — import and test all endpoints |

### Auth & Security

| File | Description |
|------|-------------|
| [13_Authentication.md](13_Authentication.md) | NextAuth v5 config, JWT strategy, OAuth providers, session flow |
| [22_Security.md](22_Security.md) | Security posture, RBAC, CSRF, XSS, rate limiting gaps, checklist |
| [26_Environment_Variables.md](26_Environment_Variables.md) | Every env var with security classification and setup instructions |

### Frontend

| File | Description |
|------|-------------|
| [10_Pages_Documentation.md](10_Pages_Documentation.md) | Deep-dive into major page implementations |
| [21_Performance.md](21_Performance.md) | Bundle strategy, caching, bottlenecks, Vercel edge config |
| [23_Accessibility.md](23_Accessibility.md) | WCAG 2.1 gap analysis, ARIA audit, color contrast, keyboard nav |
| [20_SEO.md](20_SEO.md) | SEO score, missing meta tags, robots.txt, OG image gaps |

### Operations & Deployment

| File | Description |
|------|-------------|
| [24_Deployment.md](24_Deployment.md) | Step-by-step Vercel + Neon deployment guide |
| [25_Testing.md](25_Testing.md) | Current coverage (0%), recommended strategy, tools, CI/CD setup |

### Product Gaps & Roadmap

| File | Description |
|------|-------------|
| [27_Known_Issues.md](27_Known_Issues.md) | 17 confirmed bugs and technical debt items with severity ratings |
| [28_Product_Gaps.md](28_Product_Gaps.md) | Missing features, broken flows, incomplete implementations |
| [29_Improvement_Roadmap.md](29_Improvement_Roadmap.md) | 49 improvements scored by impact/complexity/priority across 5 tiers |

### Marketing & Content

| File | Description |
|------|-------------|
| [30_Marketing_Handbook.md](30_Marketing_Handbook.md) | Product story, ICP, pain points, elevator pitches, pricing strategy |
| [31_Copywriting_Guide.md](31_Copywriting_Guide.md) | Voice, tone, UI copy patterns, error messages, button labels |
| [32_FAQ.md](32_FAQ.md) | Developer, user, admin, and deployment FAQs |

### Audit

| File | Description |
|------|-------------|
| [PROJECT_AUDIT.md](PROJECT_AUDIT.md) | Scored 1–10 across 14 dimensions with evidence, verdict, and action plan |

---

## Documentation Conventions

Throughout these documents, the following markers are used:

| Marker | Meaning |
|--------|---------|
| `**[Inferred]**` | Content inferred from code patterns — not directly confirmed by reading that specific code path |
| `**[MISSING]**` | Feature or asset that should exist but does not |
| `**[INCOMPLETE]**` | Partially implemented — schema or UI exists but logic is not wired up |
| `**[ALPHA]**` | Feature is stubbed or experimental — not ready for production use |
| `**[IMPROVEMENT]**` | Suggested enhancement to existing functionality |
| `**[RISK]**` | Security or stability risk requiring attention |

---

## Getting Started (New Developer)

1. Read [00_Project_Overview.md](00_Project_Overview.md) for a 5-minute orientation
2. Read [14_Project_Architecture.md](14_Project_Architecture.md) to understand request flow
3. Read [12_Database.md](12_Database.md) to understand the data model
4. Read [24_Deployment.md](24_Deployment.md) and set up a local dev environment
5. Read [26_Environment_Variables.md](26_Environment_Variables.md) to configure `.env.local`
6. Read [27_Known_Issues.md](27_Known_Issues.md) before touching anything critical

---

## Architecture Summary

```
Browser (React CSR)
    │
    │ HTTPS (fetch + SSE)
    ▼
Vercel Edge (Middleware)
    │ Auth gate: requireOrg()
    ▼
Next.js API Routes (Serverless Functions)
    │
    ├── Prisma ORM ──► Neon PostgreSQL
    ├── Anthropic SDK ──► Claude AI
    ├── NextAuth v5 ──► JWT Cookies
    └── SSE ──► In-memory subscriber Map
```

**Key constraint**: The in-memory SSE subscriber map breaks under horizontal scaling. See [27_Known_Issues.md KI-001](27_Known_Issues.md) for the fix.

---

## Overall Project Score

| Category | Score |
|----------|-------|
| Code Quality | 6/10 |
| Architecture | 5/10 |
| Security | 5/10 |
| Performance | 4/10 |
| Feature Completeness | 7/10 |
| Design Quality | 8/10 |
| Testing | 1/10 |
| **Overall** | **5.1/10** |

See [PROJECT_AUDIT.md](PROJECT_AUDIT.md) for full scoring with evidence and action plan.
