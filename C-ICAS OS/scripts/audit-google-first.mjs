#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

const FORBIDDEN_MAIN = [
  '@sentry/react',
  'leaflet',
  'react-leaflet',
  '@types/leaflet',
];

const FORBIDDEN_FUNCTIONS = ['resend'];

const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
let failed = false;

for (const dep of FORBIDDEN_MAIN) {
  if (allDeps[dep]) {
    console.error(`FORBIDDEN dependency: ${dep}`);
    failed = true;
  }
}

try {
  const fnPkg = JSON.parse(readFileSync(resolve(root, 'functions/package.json'), 'utf-8'));
  const fnDeps = { ...fnPkg.dependencies, ...fnPkg.devDependencies };
  for (const dep of FORBIDDEN_FUNCTIONS) {
    if (fnDeps[dep]) {
      console.error(`FORBIDDEN functions dependency: ${dep}`);
      failed = true;
    }
  }
} catch { /* functions/package.json optional */ }

if (failed) {
  console.error('Google-first policy violation — remove forbidden packages.');
  process.exit(1);
} else {
  console.log('Google-first audit passed.');
}
