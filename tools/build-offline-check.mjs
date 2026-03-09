#!/usr/bin/env node
import dns from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

function stripRange(version) {
  if (!version) return null;
  return version.replace(/^[~^]/, '');
}

function getElectronVersion() {
  const cwd = process.cwd();
  const installedPkg = path.join(cwd, 'node_modules', 'electron', 'package.json');
  if (fs.existsSync(installedPkg)) {
    const pkg = JSON.parse(fs.readFileSync(installedPkg, 'utf8'));
    if (pkg?.version) return pkg.version;
  }

  const rootPkg = path.join(cwd, 'package.json');
  if (fs.existsSync(rootPkg)) {
    const pkg = JSON.parse(fs.readFileSync(rootPkg, 'utf8'));
    return stripRange(pkg?.devDependencies?.electron);
  }

  return null;
}

function headRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
      resolve({ statusCode: res.statusCode ?? 0 });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timeout'));
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const electronVersion = getElectronVersion();
  if (!electronVersion) {
    console.error('[build:offline-check] electron バージョンを特定できませんでした。');
    console.error('  package.json の devDependencies.electron を確認してください。');
    process.exit(2);
  }

  const releaseUrl = `https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-win32-x64.zip`;

  console.log(`[build:offline-check] electron version: ${electronVersion}`);
  console.log('[build:offline-check] DNS resolve: github.com');

  try {
    await dns.lookup('github.com');
  } catch (error) {
    console.error('[build:offline-check] NG: github.com の名前解決に失敗しました。');
    console.error(`  cause: ${error.code ?? error.message}`);
    console.error('  hint: ネットワーク制限環境では npm run build が失敗します。');
    process.exit(1);
  }

  console.log('[build:offline-check] HTTP HEAD: electron release asset');

  try {
    const response = await headRequest(releaseUrl);
    if (response.statusCode >= 200 && response.statusCode < 400) {
      console.log('[build:offline-check] OK: build に必要な外部アセットへ到達可能です。');
      process.exit(0);
    }

    console.error(`[build:offline-check] NG: HTTP ${response.statusCode}`);
    console.error(`  url: ${releaseUrl}`);
    console.error('  hint: 通信制限またはリリースアセット未取得が原因の可能性があります。');
    process.exit(1);
  } catch (error) {
    console.error('[build:offline-check] NG: 外部アセットへの接続に失敗しました。');
    console.error(`  cause: ${error.code ?? error.message}`);
    console.error(`  url: ${releaseUrl}`);
    console.error('  hint: コード不良ではなくネットワーク制限由来の失敗かを確認してください。');
    process.exit(1);
  }
}

main();
