# Project Rules

## Coding Conventions

- **TypeScript**: Strict mode enabled. No `any`, `ts-ignore`, or `ts-nocheck` without PR justification.
- **Imports**: Use absolute imports via `@/` (e.g., `import { prisma } from '@/lib/prisma'`).
- **Components**: Prefer Server Components by default. Use Client Components only when state/hooks/browser APIs are needed.
- **Styling**: Tailwind CSS v4 with `cn()` utility from `@/lib/utils` for class merging.
- **Icons**: Use `lucide-react` exclusively.

## Accessibility

- All interactive elements must have accessible names (aria-label, aria-labelledby).
- Navigation must support keyboard interaction.
- Color contrast must meet WCAG AA standards.
- Language direction (`dir` attribute) must update with language switch.

## Performance

- Use `next/image` for static images (unoptimized only when necessary).
- 3D scene uses `@react-three/drei` `Suspense` and `Preload` for asset loading.
- GSAP ScrollTrigger animations should be throttled and respect `prefers-reduced-motion`.
- API responses use pagination (page/limit/meta) on all list endpoints.

## Implementation Patterns

- **API Routes**: Versioned under `/api/v1/`. Each endpoint validates with Zod, rate-limited, and logs to audit.
- **Database**: Prisma client extension auto-filters `isDeleted: false`. All monetary fields use `Decimal`.
- **Translations**: All user-facing strings come from `@/components/translations.ts`. Use `useTranslation` hook in client components.
- **WhatsApp**: Message sending goes through the standalone service, not directly from Next.js.
