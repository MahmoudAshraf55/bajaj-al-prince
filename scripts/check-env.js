#!/usr/bin/env node
const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const ENV_EXAMPLE = resolve(ROOT, '.env.example');
const ENV_FILE = resolve(ROOT, '.env');

function parseEnv(file) {
  const text = readFileSync(file, 'utf-8');
  const vars = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\w+)=/);
    if (match) vars[match[1]] = true;
  }
  return vars;
}

function getVercelEnv(name) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`npx vercel env ls production --scope mahmoud-ashraf1 2>/dev/null`, {
      encoding: 'utf-8',
    });
    return out.includes(name);
  } catch {
    return false;
  }
}

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ADMIN_INITIAL_PASSWORD',
  'NEXT_PUBLIC_APP_URL',
  'WHATSAPP_NUMBER',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
];

const optional = [
  'JWT_REFRESH_SECRET',
  'WHATSAPP_SERVICE_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'POLLINATIONS_API_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'FROM_EMAIL',
  'NEXT_PUBLIC_TIKTOK_USERNAME',
  'NEXT_PUBLIC_TIKTOK_FORCE_LIVE',
  'NEXT_PUBLIC_GA_ID',
  'SENTRY_DSN',
];

const issues = [];

if (!existsSync(ENV_FILE)) {
  issues.push('✖ .env not found — run `npm run setup`');
  process.exit(1);
}

const envVars = parseEnv(ENV_FILE);
const exampleVars = parseEnv(ENV_EXAMPLE);

console.log('\n=== Environment Check ===\n');

for (const key of required) {
  if (envVars[key] && envVars[key] !== true && exampleVars[key]) {
    const val = envVars[key];
    if (val === 'replace-with-' || val.includes('replace-with')) {
      issues.push(`✖ ${key} still has placeholder value`);
    } else {
      console.log(`✓ ${key}`);
    }
  } else if (!envVars[key]) {
    issues.push(`✖ ${key} is missing from .env`);
  } else {
    console.log(`✓ ${key}`);
  }
}

for (const key of optional) {
  if (envVars[key]) {
    console.log(`  ${key} (optional) — set`);
  }
}

// Check Vercel sync
console.log('\n=== Vercel Sync ===\n');
try {
  const { execSync } = require('child_process');
  const out = execSync(`npx vercel env ls production 2>/dev/null`, {
    encoding: 'utf-8',
    cwd: ROOT,
  });
  const vercelLines = out.split('\n').map(l => l.trim());
  for (const key of required) {
    const foundOnVercel = vercelLines.some(l => l.startsWith(key));
    if (foundOnVercel && envVars[key]) {
      console.log(`✓ ${key} — local + Vercel`);
    } else if (foundOnVercel && !envVars[key]) {
      issues.push(`✖ ${key} is on Vercel but missing locally`);
    } else if (!foundOnVercel && envVars[key]) {
      console.log(`  ${key} — local only (not on Vercel)`);
    } else {
      console.log(`  ${key} — missing on both`);
    }
  }
} catch {
  console.log('(Vercel CLI not available — skipping Vercel check)');
}

console.log();
if (issues.length === 0) {
  console.log('✓ All checks passed');
} else {
  for (const issue of issues) {
    console.log(issue);
  }
  process.exit(1);
}
