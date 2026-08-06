import { type Page } from '@playwright/test';

/**
 * Best-effort screenshot. Headless Chromium occasionally throws
 * "Protocol error (Page.captureScreenshot): Unable to capture screenshot" when
 * the software compositor is under pressure. Screenshots are artifacts — the
 * layout assertions have already validated the page — so retry once, then skip
 * rather than fail the test.
 */
export async function safeScreenshot(
  page: Page,
  path: string,
  opts: { fullPage?: boolean } = {}
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.screenshot({ path, fullPage: opts.fullPage ?? false });
      return;
    } catch {
      await page.waitForTimeout(1000);
    }
  }
}
