#!/usr/bin/env node
/* Simple static server for CI smoke test */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const host = '127.0.0.1';
const port = 8080;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function send(res, status, content, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(content);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') {
      urlPath = '/index.html';
    }
    const filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      return send(res, 403, 'Forbidden');
    }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        return send(res, 404, 'Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = mime[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err2, data) => {
        if (err2) {
          return send(res, 500, 'Internal Server Error');
        }
        send(res, 200, data, type);
      });
    });
  } catch (e) {
    send(res, 500, 'Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`Dev server listening on http://${host}:${port}`);
});
