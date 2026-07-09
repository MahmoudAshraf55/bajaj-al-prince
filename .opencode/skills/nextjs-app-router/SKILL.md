---
name: nextjs-app-router
description: استخدم عند التعامل مع App Router. فرض Server Components كأولوية.
---

# Next.js App Router Rules
- دائماً ابدأ بـ 'use server' أو 'use client' حسب الحاجة.
- تجنب الـ Client Components قدر الإمكان.
- تأكد أن الـ data fetching يتم في الـ Server Components مباشرة.
- عند التعامل مع الـ Forms، استخدم الـ Server Actions.
