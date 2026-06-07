# BAJAJ AL PRINCE — Motorcycle Service Center Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.7-2D3748?logo=prisma)](https://prisma.io/)
[![License](https://img.shields.io/badge/license-Proprietary-red)]()

> **Enterprise-grade ERP platform for motorcycle service centers.**
> Manage service operations, inventory, customer relationships, and business performance from a single intelligent platform.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Testing](#testing)
- [Project Roadmap](#project-roadmap)
- [Governance](#governance)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Project Overview

**BAJAJ AL PRINCE** is a comprehensive management platform designed for authorized Bajaj motorcycle service centers. It combines a stunning public-facing website with a powerful back-office system for managing every aspect of the service center business.

### Current Capabilities (v0.2.0)

- **Public Website** — Product showcase with immersive 3D motorcycle experience
- **Service Booking** — Online appointment scheduling for customers
- **Product Marketplace** — Parts and accessories catalog
- **Admin Portal** — Secure dashboard with CRM, inventory, cashier, and booking management
- **Contact Management** — Customer inquiry tracking
- **CRM & Vehicle Tracking** — Customer profiles with garage/vehicle ownership
- **Financial Management** — Income/expense tracking with Decimal precision
- **WhatsApp Maintenance Reminders** — Automated periodic service reminders via WhatsApp Web (Baileys) with anti-ban sequential sending

### Foundation Hardening (Phase 0 — Complete)

- **Financial Precision** — All monetary fields use `Decimal` instead of `Float`
- **Soft Delete** — Global `isDeleted`/`deletedAt` filtering via Prisma client extension
- **Multi-Tenancy Prep** — `tenantId` on all main models with composite indexes
- **API Versioning** — Routes under `/api/v1/` with Next.js rewrites for backward compatibility
- **XSS Protection** — `isomorphic-dompurify` integrated with Zod schemas via `sanitizedString()`
- **Pagination** — Consistent `page`/`limit`/`meta` pattern on all list endpoints

### Target Vision (v1.0.0)

Full ERP platform covering: Work Orders, Inventory, POS, Cashier, Customer Portal, Employee Management, Payroll, Attendance, Barcode System, Multi-Branch Management, and Business Analytics.

---

## Features

### Public Website

- **Immersive 3D Hero** — Scroll-driven cinematic motorcycle showcase using Three.js + GSAP
- **Responsive Design** — Optimized for 320px to 1920px viewports
- **Service Booking** — Real-time appointment scheduling
- **Product Catalog** — Searchable parts marketplace
- **Contact Forms** — Customer inquiry system

### Admin Portal

- **JWT Authentication** — Secure login with `jose` (HS256), role-based access (`admin`, `staff`, `viewer`)
- **Dashboard** — Overview with financial metrics, pending bookings, and recent activity
- **Booking Management** — View and manage service appointments with status controls
- **Product Management** — CRUD for marketplace items with stock tracking
- **Contact Inbox** — Manage customer inquiries with soft delete
- **Customer CRM** — Customer profiles, contact info, and vehicle garage
- **Vehicle Directory** — Master vehicle list with ownership linking
- **Cashier** — Income/expense transaction logging with balance tracking

### Technical Features

- **Strict TypeScript** — Zero `any` types policy (enforced)
- **API Validation** — Zod schemas on every endpoint with XSS sanitization
- **Database ORM** — Prisma with PostgreSQL, soft delete client extension
- **E2E Testing** — Playwright test suite
- **CI/CD Ready** — GitHub Actions workflow included
- **Bilingual UI** — Full English/Arabic localization via custom translation system

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js App Router | 16.2.6 |
| Language | TypeScript | 5.x |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| UI Animation | Framer Motion | 12.x |
| Scroll Animation | GSAP + ScrollTrigger | 3.x |
| 3D Rendering | Three.js + React Three Fiber + Drei | 0.184 / 9.6 |
| Database ORM | Prisma | 6.7 |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Auth | JWT via jose + bcryptjs | 6.2 / 3.0 |
| Validation | Zod | 4.4 |
| Icons | Lucide React | 1.16 |
| Testing | Playwright | 1.60 |
| WhatsApp Web | @whiskeysockets/baileys | 6.x |
| QR Code | qrcode | 1.x |

---

## Architecture

```
windsurf-project/
├── prisma/
│   ├── schema.prisma       # Database schema (7 models + enum)
│   └── migrations/         # Migration history
├── public/                 # Static assets (3D models, images)
├── src/
│   ├── app/
│   │   ├── (site)/         # Public site layout + pages
│   │   ├── admin/          # Admin portal (login, dashboard, CRM)
│   │   │   ├── customers/      # Customer management + detail/garage
│   │   │   ├── vehicles/       # Global vehicle directory
│   │   │   ├── dashboard/      # Overview with financial stats
│   │   │   └── whatsapp/       # WhatsApp Web QR + reminder controls
│   │   ├── api/            # REST API (v1)
│   │   │   ├── auth/           # Login, logout, me
│   │   │   └── v1/             # Versioned business endpoints
│   │   │       ├── bookings/   # Booking CRUD + pagination
│   │   │       ├── cashier/    # Transaction CRUD + pagination
│   │   │       ├── contact/    # Contact messages + soft delete
│   │   │       ├── customers/  # Customer CRUD + pagination
│   │   │       ├── products/   # Product CRUD + pagination
│   │   │       ├── vehicles/   # Vehicle CRUD + pagination
│   │   │       ├── whatsapp/   # WhatsApp status + disconnect
│   │   │       └── cron/       # Scheduled reminder jobs
│   │   ├── booking/        # Booking page
│   │   ├── market/         # Product marketplace
│   │   ├── layout.tsx      # Root layout (LanguageProvider)
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── 3d/             # Three.js / R3F components (PROTECTED)
│   │   ├── layout/         # Header, Footer, LanguageSwitcher
│   │   ├── sections/       # Page sections (Hero, About, etc.)
│   │   └── ui/             # Reusable UI primitives
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client + soft delete extension
│   │   ├── sanitize.ts     # DOMPurify Zod helper
│   │   ├── auth.ts         # JWT verification + role guards
│   │   ├── rate-limit.ts   # API rate limiting
│   │   ├── security.ts     # CORS, CSP, security headers
│   │   └── whatsapp.ts     # WhatsApp Web client (Baileys) singleton
│   ├── types/              # Shared TypeScript types
│   └── app/
├── docs/                   # Project documentation
├── e2e/                    # Playwright end-to-end tests
└── .github/workflows/      # CI/CD automation
```

**Pattern:** Feature-based grouping with shared `lib/` and `types/` folders. Admin is a separate sub-route. API routes mirror frontend features.

### Database Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Admin/staff authentication | `username`, `password`, `role`, `failedAttempts`, `lockedUntil` |
| `ContactMessage` | Customer inquiries | `name`, `phone`, `email`, `message` |
| `Booking` | Service appointments | `name`, `phone`, `model`, `issue`, `date`, `time`, `status` |
| `Product` | Marketplace inventory | `name`, `description`, `price` (Decimal), `stock`, `category` |
| `Transaction` | Cashier income/expense | `type`, `amount` (Decimal), `description` |
| `Customer` | CRM customer profiles | `name`, `phone`, `email`, `address` |
| `Vehicle` | Motorcycle registry | `make`, `model`, `year`, `chassisNumber`, `plateNumber`, `customerId` |
| `ReminderLog` | WhatsApp reminder tracking | `customerId`, `phone`, `message`, `status`, `sentAt` |

**Foundation fields on every model:** `id` (UUID), `createdAt`, `updatedAt`, `isDeleted`, `deletedAt`, `tenantId`

### API Endpoints (v1)

All business routes are versioned under `/api/v1/` and accessible via `/api/` rewrites.

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/v1/contact` | GET, POST | List (paginated) / Create contact message |
| `/api/v1/contact/[id]` | DELETE | Soft delete contact message |
| `/api/v1/bookings` | GET, POST | List (paginated) / Create booking |
| `/api/v1/bookings/[id]` | PATCH | Update booking status |
| `/api/v1/products` | GET, POST | List (paginated) / Create product |
| `/api/v1/products/[id]` | PATCH | Update product |
| `/api/v1/cashier` | GET, POST | List (paginated) / Create transaction |
| `/api/v1/customers` | GET, POST | List (paginated, with vehicle count) / Create customer |
| `/api/v1/customers/[id]` | GET, PATCH, DELETE | Profile (with garage), update, soft delete |
| `/api/v1/vehicles` | GET, POST | List (paginated, with owner) / Create vehicle |
| `/api/v1/vehicles/[id]` | GET, PATCH, DELETE | Detail (with owner), update, soft delete |
| `/api/v1/whatsapp/status` | GET | WhatsApp connection status + QR code |
| `/api/v1/whatsapp/disconnect` | POST | Disconnect WhatsApp session |
| `/api/v1/cron/reminders` | GET | Trigger maintenance reminder batch (anti-ban) |
| `/api/auth/login` | POST | JWT authentication |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/auth/me` | GET | Verify current session |

---

## Installation

### Prerequisites

- Node.js 22+
- npm 10+

### Clone & Install

```bash
git clone <repository-url>
cd windsurf-project
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with real values:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="<generate-with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Setup

```bash
npx prisma migrate dev --name init
npx prisma db seed      # if seed script exists
```

---

## Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | TypeScript strict check |
| `npx playwright test` | Run E2E tests |
| `npx prisma studio` | Open Prisma database GUI |

---

## Build & Deployment

### Production Build

```bash
npm run build
```

### Deployment Options

- **Vercel** — Native Next.js hosting
- **Docker** — Containerized deployment
- **Self-hosted** — Node.js server with PM2

### Required Environment (Production)

```env
DATABASE_URL="postgresql://user:pass@host:5432/bajaj_al_prince"
JWT_SECRET="<64+ char cryptographically secure secret>"
NEXT_PUBLIC_APP_URL="https://bajajalprince.com"
```

---

## Testing

### E2E Tests (Playwright)

```bash
# Install browsers (first time)
npx playwright install

# Run all tests
npx playwright test

# Run specific test
npx playwright test e2e/booking.spec.ts

# View report
npx playwright show-report
```

### Test Coverage

- Home page rendering
- Booking flow
- Admin authentication
- Contact form submission
- Marketplace functionality

---

## Project Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| v0.1.0 | Prototype — Public site, booking, market, admin auth | Current |
| v0.2.0 | Branding — BAJAJ AL PRINCE identity system | Planned |
| v0.3.0 | Security — RBAC, audit log, 2FA | Planned |
| v0.4.0 | Work Orders — Service intake, mechanic assignment | Planned |
| v0.5.0 | Inventory — Stock tracking, parts catalog | Planned |
| v0.6.0 | Customer Portal — Self-service, history, invoices | Planned |
| v0.7.0 | POS — In-person sales, receipt generation | Planned |
| v1.0.0 | Commercial — Complete ERP platform | Target |

Full roadmap: [`docs/VERSIONING_STRATEGY.md`](./docs/VERSIONING_STRATEGY.md)

---

## Governance

This project follows enterprise-grade software engineering practices:

- **Git Flow** branching strategy
- **Conventional Commits** for all changes
- **Pull Request** reviews required
- **CI/CD** automated validation on every push
- **Semantic Versioning** for releases

See:
- [`docs/GIT_GOVERNANCE.md`](./docs/GIT_GOVERNANCE.md)
- [`docs/VERSIONING_STRATEGY.md`](./docs/VERSIONING_STRATEGY.md)
- [`docs/RELEASE_MANAGEMENT.md`](./docs/RELEASE_MANAGEMENT.md)
- [`docs/BACKUP_AND_RECOVERY.md`](./docs/BACKUP_AND_RECOVERY.md)

---

## Security

### Current Measures

- JWT tokens via `jose` (HS256) with 24h expiry
- Bearer token verification on every admin API call
- Role-based access control (`admin` | `staff` | `viewer`)
- Zod validation + XSS sanitization (`isomorphic-dompurify`) on all inputs
- Soft delete — no hard deletes; records filtered automatically
- Prisma query middleware adds `isDeleted: false` to all `findMany`/`findFirst`/`count`
- Rate limiting on sensitive endpoints
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- `.env` files excluded from version control
- No `dangerouslySetInnerHTML` with user input

### Secret Management

- Never commit `.env` files
- Rotate `JWT_SECRET` quarterly
- Use different secrets per environment
- Store production secrets in a vault

See [`docs/BACKUP_AND_RECOVERY.md`](./docs/BACKUP_AND_RECOVERY.md) for incident response.

---

## Contributing

1. Read [`docs/GIT_GOVERNANCE.md`](./docs/GIT_GOVERNANCE.md)
2. Create feature branch from `develop`
3. Follow Conventional Commits
4. Ensure CI checks pass
5. Open Pull Request with full description

---

## License

**Proprietary Software** — All rights reserved.

Unauthorized copying, distribution, or use of this software is strictly prohibited.

---

<p align="center">
  <sub>Built with precision for BAJAJ AL PRINCE Service Centers.</sub>
</p>
