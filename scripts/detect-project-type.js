#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const resolve = (rel) => path.join(root, rel);
const exists = (rel) => fs.existsSync(resolve(rel));

const result = {
  projectType: 'holosync-webapp',
  packageManager: null,
  stack: [],
  flags: [],
};

let pkgJson = null;
if (exists('package.json')) {
  try {
    const raw = fs.readFileSync(resolve('package.json'), 'utf8');
    pkgJson = JSON.parse(raw);
    result.packageManager = pkgJson.packageManager || 'npm';
    result.stack.push('node');
  } catch (error) {
    result.flags.push('package-json-invalid');
  }
}

if (pkgJson?.dependencies || pkgJson?.devDependencies) {
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  if (deps.prettier) {
    result.flags.push('prettier');
  }
  if (deps.eslint) {
    result.flags.push('eslint');
  }
  if (deps.husky) {
    result.flags.push('husky');
  }
}

if (exists('scripts/main.js')) {
  result.stack.push('vanilla-js');
}
if (exists('styles/main.css')) {
  result.stack.push('css');
}
if (exists('index.html')) {
  result.stack.push('html');
}
if (exists('docs/TESTING.md')) {
  result.flags.push('manual-tests-defined');
}
if (exists('docs/WORKFLOW.md')) {
  result.flags.push('workflow-defined');
}
if (exists('Doxyfile')) {
  result.flags.push('doxygen');
}

result.stack = Array.from(new Set(result.stack));
result.flags = Array.from(new Set(result.flags));

console.log(JSON.stringify(result, null, 2));
