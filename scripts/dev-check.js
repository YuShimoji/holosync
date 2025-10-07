#!/usr/bin/env node
/* Simple smoke check: ensure dev server responds 200 at / */
const http = require('node:http');

function request(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const { statusCode } = res;
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const { statusCode, body } = await request('http://127.0.0.1:8080/');
    if (statusCode !== 200) {
      console.error(`Smoke check failed: status ${statusCode}`);
      process.exit(1);
    }
    if (!/(<html|<!doctype)/i.test(body)) {
      console.error('Smoke check failed: HTML not detected');
      process.exit(2);
    }
    console.log('Smoke check passed');
  } catch (e) {
    console.error('Smoke check error:', e.message || e);
    process.exit(3);
  }
})();
