#!/usr/bin/env node
const { execSync } = require('child_process');
const { existsSync, copyFileSync, writeFileSync, readFileSync } = require('fs');
const { resolve } = require('path');
const crypto = require('crypto');

const ROOT = resolve(__dirname, '..');
const ENV_EXAMPLE = resolve(ROOT, '.env.example');
const ENV_FILE = resolve(ROOT, '.env');

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function header(msg) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${msg}`);
  console.log('='.repeat(60));
}

header('Bajaj Al Prince — Project Setup');

// 1. Install dependencies
header('1/5 — Installing dependencies');
run('npm install');

// 2. Create .env from .env.example
header('2/5 — Configuring environment');
if (existsSync(ENV_FILE)) {
  console.log('.env already exists, skipping.');
} else {
  copyFileSync(ENV_EXAMPLE, ENV_FILE);
  let env = readFileSync(ENV_FILE, 'utf-8');

  // Generate secure JWT_SECRET
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  env = env.replace(/JWT_SECRET=".*?"/, `JWT_SECRET="${jwtSecret}"`);
  env = env.replace(/ADMIN_INITIAL_PASSWORD=".*?"/, `ADMIN_INITIAL_PASSWORD="admin"`);

  writeFileSync(ENV_FILE, env);
  console.log('.env created from .env.example with generated secrets.');
}

// 3. Push database schema
header('3/5 — Pushing database schema');
try {
  run('npx prisma db push --accept-data-loss');
} catch {
  console.warn('⚠ Database push failed — check DATABASE_URL in .env');
}

// 4. Seed database
header('4/5 — Seeding database');
try {
  run('npx tsx prisma/seed.ts');
} catch {
  console.warn('⚠ Seed failed — database may already be seeded.');
}

// 5. Generate Prisma client
header('5/5 — Generating Prisma client');
run('npx prisma generate');

console.log('\n✓ Setup complete! Run `npm run dev` to start.');
