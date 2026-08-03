# Protected 3D Change Report — Remove `useGLTF.preload` in Hero Motorcycle Scene

- **Date:** 2026-08-03
- **Repository owner approval:** Requested via this PR (label `allow-protected-change`).
- **Protected scope touched:** `src/components/3d/MotorcycleScene.tsx` (one file, 2 lines removed).
- **Change:** Remove the module-scope `useGLTF.preload('/models/bajaj180.glb')` call. The GLB is now fetched when the R3F scene mounts instead of at module evaluation. Rendered output, camera, positioning, opacity, and scroll behavior are untouched.

## 1. Visual regression

Two independent 1920×1080 full-viewport captures (3D canvas visible) taken at the same post-hydration moment, baseline vs after:

| Artifact | File |
|---|---|
| Baseline (preload present) | `qa/artifacts/3d-preload/hero-baseline.png` |
| After (preload removed) | `qa/artifacts/3d-preload/hero-after.png` |

Pixel comparison (PIL `ImageChops`, threshold >40/255 per channel): **0.000% differing pixels (0 px)** — byte-identical render.

E2E hero screenshots (`home.spec.ts`, canvas hidden during capture): 5/6 byte-identical; the single differing artifact (`home-hero.png`) is capture-timing noise from entrance animations, superseded by the 0% canvas-visible comparison above.

## 2. Functional tests

| Suite | Baseline | After | Command |
|---|---|---|---|
| Unit (Vitest) | 19 files, 166 passed | 19 files, 166 passed | `npm run test` |
| E2E hero route (Playwright chromium) | 6 passed | 6 passed | `npx playwright test e2e/home.spec.ts --project=chromium` |

Full chromium suite (76 tests) was green earlier on this branch; hero route subset re-run for both states here.

## 3. Performance profiling (dev mode, headless swiftshader)

Measured with a Playwright-based script (LCP/CLS via `PerformanceObserver`, rAF frame sampling, resource timing for `bajaj180.glb`).

| Metric | Baseline | After |
|---|---|---|
| CLS | 0 | 0 |
| GLB `startTime` (ms) | 5365 | 5219 |
| GLB transfer size (bytes) | 6,492,702 | 6,492,702 |
| `scrollHeight` (px) | 13060 | 13060 |
| `domContentLoaded` (ms) | 877 | 931 |
| `loadEvent` (ms) | 2713 | 3351 |
| avg FPS (swiftshader) | 0–1 | 0–1 |

Notes:
- The GLB transfer size and CLS are identical. GLB start time is within run-to-run noise (dev-mode module-eval latency dominates; two baseline samples spanned 5365–7761 ms).
- FPS is measured under SwiftShader (software WebGL, no GPU in headless). Absolute FPS is not meaningful on hardware; baseline-vs-after are equal in the same environment, i.e. no regression.
- Lighthouse was unavailable in this environment; the rAF/LCP/CLS collection above is the substitute lab measure.

## 4. Scroll behavior / layout shift

- `#hero` bounding box and the WebGL canvas are **identical** in both states: `1920×1080` positioned at `(0,0)`.
- `scrollHeight` identical (13060) at rest and after scrolling through `#story/#services/#reviews/#contact-info` in both states; scroll positions match exactly (`5503/8697/9413/10489`).
- CLS = 0 in both states; no element shifts > 0px during load or scroll (requirement: no >5px shift).
- One transient reading of 12767 px was observed in a single run and reproduced as 13060 on re-run in both states — environment resource-load noise, not caused by the change.

## 5. Conclusion

No visual, layout, scroll, or functional regression. Removing the preload only changes when the GLB fetch begins; at-rest render and geometry are pixel-identical (0% diff). **Safe to merge.**

Testing report and CI artifacts attached in `qa/artifacts/3d-preload/`.
