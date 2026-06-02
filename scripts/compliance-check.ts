#!/usr/bin/env node
/**
 * Compliance Check Script
 * Validates the codebase against PROJECT_RULES.md and SYSTEM_RULES.md.
 * Run with: npx tsx scripts/compliance-check.ts
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'src');
const FAILURES: string[] = [];

function fail(msg: string) {
  FAILURES.push(msg);
}

function walk(dir: string, cb: (file: string) => void) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'build') continue;
      walk(path, cb);
    } else if (stat.isFile()) {
      cb(path);
    }
  }
}

/* ── 1. TypeScript strictness ── */
function checkNoAny() {
  const anyRegex = /\bany\b/;
  walk(SRC_DIR, (file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Allow "// any" in comments
      if (anyRegex.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        fail(`Forbidden 'any' type at ${relative(ROOT, file)}:${i + 1}`);
      }
    }
  });
}

/* ── 2. No ts-ignore / ts-nocheck ── */
function checkNoTsIgnore() {
  walk(SRC_DIR, (file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/ts-ignore|ts-nocheck/.test(lines[i])) {
        fail(`Forbidden ts-ignore/ts-nocheck at ${relative(ROOT, file)}:${i + 1}`);
      }
    }
  });
}

/* ── 3. No dangerouslySetInnerHTML / eval ── */
function checkNoXssVectors() {
  walk(SRC_DIR, (file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/dangerouslySetInnerHTML|eval\s*\(|new\s+Function/.test(lines[i])) {
        fail(`Potential XSS vector at ${relative(ROOT, file)}:${i + 1}`);
      }
    }
  });
}

/* ── 4. No hardcoded secrets ── */
function checkNoHardcodedSecrets() {
  const secretPatterns = [
    /password\s*=\s*['"][^'"]{3,}['"]/i,
    /secret\s*=\s*['"][^'"]{8,}['"]/i,
    /token\s*=\s*['"][^'"]{8,}['"]/i,
    /api_key\s*=\s*['"][^'"]{8,}['"]/i,
  ];
  walk(SRC_DIR, (file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.mjs')) return;
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip env var declarations and comments
      if (line.includes('process.env') || line.trim().startsWith('//')) continue;
      for (const pattern of secretPatterns) {
        if (pattern.test(line)) {
          fail(`Potential hardcoded secret at ${relative(ROOT, file)}:${i + 1}`);
        }
      }
    }
  });
}

/* ── 5. API routes must wrap entity in `data` ── */
function checkApiResponseFormat() {
  const apiDir = join(SRC_DIR, 'app', 'api');
  walk(apiDir, (file) => {
    if (!file.endsWith('route.ts')) return;
    const content = readFileSync(file, 'utf-8');
    // Find lines with { success: true, ... } that don't include data:
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match { success: true, foo } but not { success: true, data: { foo } }
      if (/success:\s*true\s*,\s*\w+\s*[:}]/.test(line) && !/data:\s*\{/.test(line)) {
        // Skip error responses and simple { success: true } without extra fields
        if (/error:/.test(line)) continue;
        // Check if it's just { success: true } or { success: true, foo: bar }
        const match = line.match(/success:\s*true\s*,\s*(\w+)\s*[:}]/);
        if (match && match[1] !== 'data') {
          fail(`API response missing data wrapper at ${relative(ROOT, file)}:${i + 1}`);
        }
      }
    }
  });
}

/* ── 6. No localStorage for auth tokens ── */
function checkNoLocalStorageAuth() {
  walk(SRC_DIR, (file) => {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
    const content = readFileSync(file, 'utf-8');
    if (/localStorage\.getItem\s*\(\s*['"]token['"]\s*\)/.test(content) || /localStorage\.setItem\s*\(\s*['"]token['"]\s*/.test(content)) {
      fail(`Auth token stored in localStorage at ${relative(ROOT, file)}`);
    }
  });
}

/* ── 7. POST routes must have Zod validation ── */
function checkPostRoutesHaveZod() {
  const apiDir = join(SRC_DIR, 'app', 'api');
  walk(apiDir, (file) => {
    if (!file.endsWith('route.ts')) return;
    const content = readFileSync(file, 'utf-8');
    if (!content.includes('export async function POST')) return;
    // Skip routes that don't read a request body (nothing to validate)
    if (!content.includes('req.json()') && !content.includes('req.formData()')) return;
    if (!content.includes('z.object') && !content.includes('zod')) {
      fail(`POST route missing Zod validation: ${relative(ROOT, file)}`);
    }
  });
}

/* ── 8. next.config.mjs must have security headers ── */
function checkSecurityHeaders() {
  const configPath = join(ROOT, 'next.config.mjs');
  const content = readFileSync(configPath, 'utf-8');
  const required = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Content-Security-Policy'];
  for (const header of required) {
    if (!content.includes(header)) {
      fail(`Missing security header in next.config.mjs: ${header}`);
    }
  }
}

/* ── Run all checks ── */
console.log('Running compliance checks...\n');

checkNoAny();
checkNoTsIgnore();
checkNoXssVectors();
checkNoHardcodedSecrets();
checkApiResponseFormat();
checkNoLocalStorageAuth();
checkPostRoutesHaveZod();
checkSecurityHeaders();

if (FAILURES.length === 0) {
  console.log('\n✅ All compliance checks passed.');
  process.exit(0);
} else {
  console.log(`\n❌ ${FAILURES.length} compliance failure(s):\n`);
  for (const f of FAILURES) {
    console.log(`  • ${f}`);
  }
  process.exit(1);
}
