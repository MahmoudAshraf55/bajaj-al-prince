# Bajaj Ghabbour Website — Construction Plan

## Overview
Full-stack Next.js 16 application for an authorized Bajaj motorcycle service center. Covers 3D cinematic landing page, booking system, product market, and admin dashboard.

---

## Phase 1: Project Setup (Day 1)

### 1.1 Initialize Next.js
```bash
npx create-next-app@latest windsurf-project --typescript --tailwind --eslint --app
```

### 1.2 Install Dependencies
```bash
npm install gsap @gsap/react framer-motion three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing
npm install lucide-react clsx tailwind-merge zod bcryptjs jose
npm install -D prisma @prisma/client @types/bcryptjs @types/jsonwebtoken @types/three
```

### 1.3 Configure Files
| File | Action |
|---|---|
| `next.config.ts` | Remove `output: 'export'`, keep `trailingSlash: true` |
| `tailwind.config.ts` | Remove (Tailwind v4 uses CSS config) |
| `globals.css` | Add CSS variables for dark theme, glass utilities |
| `tsconfig.json` | Verify `baseUrl: "."`, `paths: { "@/*": ["./src/*"] }` |

### 1.4 Environment Variables
Create `.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-key-here"
```

---

## Phase 2: Database Layer (Day 1–2)

### 2.1 Prisma Schema
File: `prisma/schema.prisma`
- Models: `ContactMessage`, `Booking`, `Product`, `Transaction`, `User`
- Database: SQLite (dev) → PostgreSQL (production)

### 2.2 Prisma Client Setup
File: `src/lib/prisma.ts`
- Singleton pattern to avoid multiple Prisma instances in dev

### 2.3 Seed Script
File: `prisma/seed.js`
- Create default admin user: username `admin`, password `admin123`
- Seed sample products and transactions

### 2.4 Run Migrations
```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

---

## Phase 3: Authentication System (Day 2)

### 3.1 Auth Utilities
File: `src/lib/auth.ts`
- `hashPassword()` — bcrypt, 12 rounds
- `verifyPassword()` — bcrypt compare
- `createToken()` — Jose JWT, HS256, 24h
- `verifyToken()` — Jose jwtVerify

### 3.2 API Routes
| Route | File | Purpose |
|---|---|---|
| POST `/api/auth/login` | `src/app/api/auth/login/route.ts` | Validate credentials, return JWT |
| GET `/api/auth/me` | `src/app/api/auth/me/route.ts` | Validate token, return user info |

### 3.3 Admin Login Page
File: `src/app/admin/page.tsx`
- Form: username, password
- Store token in `localStorage`
- Redirect to `/admin/dashboard`

---

## Phase 4: Public API Routes (Day 2–3)

### 4.1 Contact API
- `POST /api/contact` — Save message to database
- `GET /api/contact` — List all messages (admin only)
- `DELETE /api/contact/[id]` — Delete message (admin only)

### 4.2 Bookings API
- `POST /api/bookings` — Create appointment
- `GET /api/bookings` — List all bookings (admin only)
- `PATCH /api/bookings/[id]` — Update status (admin only)

### 4.3 Products API
- `GET /api/products` — List all products
- `POST /api/products` — Create product (admin only)
- `PATCH /api/products/[id]` — Update stock (admin only)

### 4.4 Cashier API
- `GET /api/cashier` — List transactions (admin only)
- `POST /api/cashier` — Record income/expense (admin only)

All routes use Zod schema validation and Bearer token middleware for admin endpoints.

---

## Phase 5: Frontend Sections (Day 3–6)

### 5.1 Root Layout
File: `src/app/layout.tsx`
- HTML wrapper with Geist fonts
- Dark mode class

### 5.2 Site Layout
File: `src/app/(site)/layout.tsx`
- Conditionally hides Header on homepage (`/`)
- Wraps children + Footer

### 5.3 Shared Components
| Component | File | Details |
|---|---|---|
| Header | `src/components/layout/Header.tsx` | Fixed nav, mobile hamburger menu |
| Footer | `src/components/layout/Footer.tsx` | Links, social icons, copyright |

### 5.4 Homepage Sections (in order)

#### Hero — `src/components/sections/Hero.tsx`
- **Fixed full-viewport 3D Canvas** behind scrolling content
- **3 editorial scroll sections:** Overview, Specs, Design
- **GSAP ScrollTrigger:** Camera orbit + model rotation bound to scroll
- **Model path:** Right → rotates 360° → Center → Fade out
- **Typography:** Large bold display text, technical specs sidebar

#### About — `src/components/sections/About.tsx`
- 4 feature cards with Lucide icons
- Framer Motion fade-up animation

#### Services — `src/components/sections/Services.tsx`
- 7 service cards in 3-column grid
- Glassmorphism styling
- Gold accent radial gradient background

#### Contact — `src/components/sections/Contact.tsx`
- Contact form (name, phone, email, message)
- Info cards: Phone, Email, Location
- Form submits to `/api/contact`

### 5.5 Standalone Pages
| Page | File | Purpose |
|---|---|---|
| Booking | `src/app/booking/page.tsx` | Service appointment form |
| Market | `src/app/market/page.tsx` | Product browsing grid |

---

## Phase 6: 3D Scene (Day 4–6, iterative)

### 6.1 Scene Architecture
File: `src/components/3d/MotorcycleScene.tsx`

| Element | Implementation |
|---|---|
| Canvas | Fixed `top-0 left-0 w-screen h-screen -z-10` |
| Renderer | `alpha: true` for transparent background |
| Camera | `PerspectiveCamera`, initial `(3, 1.5, 4)`, FOV `32` |
| Model | `useGLTF('/models/bajaj180.glb')`, auto-center + scale |
| Materials | Metalness 0.8, roughness 0.25 |
| Lighting | 6-point setup: ambient + spot + point + directional |
| Shadows | `ContactShadows` for ground contact illusion |
| Environment | City HDRI for metallic reflections |

### 6.2 Scroll Animation Integration
File: `src/components/sections/Hero.tsx` (GSAP)

- Single master `ScrollTrigger` from `#overview` to `#design`
- Maps `progress` (0→1) to camera position and model rotation
- 3 phases: Right→Left, Left→Center, Center→Fade

### 6.3 Iterative Tuning
After initial build, adjust:
1. Model Y position for screen placement
2. Camera X range for orbit width
3. FOV for zoom level
4. Rotation speed multiplier

---

## Phase 7: Admin Dashboard (Day 5–7)

### 7.1 Dashboard Shell
File: `src/app/admin/dashboard/page.tsx`
- Side navigation: Overview, Messages, Bookings, Inventory, Cashier
- Mobile-responsive collapsible header
- Route guard: redirect to `/admin` if no token

### 7.2 Dashboard Tabs
| Tab | Features |
|---|---|
| **Overview** | 4 KPI cards, recent bookings, financial summary |
| **Messages** | Searchable list, delete with hover button |
| **Bookings** | Accept/Reject status buttons, full details |
| **Inventory** | Stock +/- buttons, availability badge |
| **Cashier** | Income/expense forms, transaction history |

### 7.3 Data Fetching
- All tabs fetch from API with `Authorization: Bearer <token>`
- Client-side state management with `useState`

---

## Phase 8: Polish & Deploy (Day 7–8)

### 8.1 Pre-deployment Checklist
- [ ] `npm run build` passes with 0 errors
- [ ] All API routes respond correctly
- [ ] 3D model file exists in `public/models/`
- [ ] Database seeded with admin user
- [ ] `.env` has `JWT_SECRET` and `DATABASE_URL`

### 8.2 Deployment Options
| Platform | Steps |
|---|---|
| **Vercel** | Connect GitHub repo, add env vars, auto-deploy |
| **Railway / Render** | Docker or Node.js service + PostgreSQL |
| **Custom VPS** | `npm run build` + `npm start` + PM2 + Nginx |

### 8.3 Post-deployment
- Set up Google Analytics 4
- Submit sitemap to Google Search Console
- Create Google Business Profile
- Test booking flow end-to-end

---

## File Tree (Final)

```
windsurf-project/
├── .env
├── next.config.ts
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── seed.ts
├── public/
│   └── models/
│       └── bajaj180.glb
├── src/
│   ├── app/
│   │   ├── (site)/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx          (login)
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── route.ts
│   │   │   │   └── me/
│   │   │   │       └── route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── cashier/
│   │   │   │   └── route.ts
│   │   │   ├── contact/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   └── products/
│   │   │       ├── route.ts
│   │   │       └── [id]/
│   │   │           └── route.ts
│   │   ├── booking/
│   │   │   └── page.tsx
│   │   ├── market/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── 3d/
│   │   │   └── MotorcycleScene.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── sections/
│   │       ├── Hero.tsx
│   │       ├── About.tsx
│   │       ├── Services.tsx
│   │       └── Contact.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
```

---

## Total Estimated Timeline
| Phase | Days |
|---|---|
| Setup + Database | 1 |
| Auth + APIs | 2 |
| Frontend Sections | 3 |
| 3D Scene + Animation | 2 (parallel with frontend) |
| Admin Dashboard | 2 |
| Polish + Deploy | 1 |
| **Total** | **~7–8 days** |
