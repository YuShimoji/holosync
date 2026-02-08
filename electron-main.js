const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

let mainWindow;
// ポートを動的に割り当てるため 0 を指定
const PORT = 0;

const logPath = path.join(app.getPath('userData'), 'holosync.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp}: ${message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
  console.log(message);
}

// アプリケーションのルートパスを取得
function getAppPath() {
  // __dirname はパッケージ化されていても app.asar 内部を正しく指す
  return __dirname;
}

// MIMEタイプの定義
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown',
};

function startServer() {
  // ログファイルの場所を出力（開発時コンソール用）
  console.log(`Log file: ${logPath}`);
  log('Starting server...');

  const appPath = getAppPath();
  log(`App path (__dirname): ${appPath}`);
  log(`Resources path: ${process.resourcesPath}`);

  server = http.createServer((req, res) => {
    try {
      // リクエストURLからファイルパスを生成
      let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(
        appPath,
        safePath === '/' || safePath === '\\' ? 'index.html' : safePath
      );

      // クエリパラメータの除去
      filePath = filePath.split('?')[0];

      log(`Request: ${req.url} -> FilePath: ${filePath}`);

      const extname = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          log(`Error reading file: ${filePath}, Error: ${error.code}`);
          if (error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(500);
            res.end('500: ' + error.code);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    } catch (err) {
      log(`Critical error in request handler: ${err.message}`);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  server.on('error', (e) => {
    log(`Server error: ${e.code}`);
  });

  // ポート0を指定して空いているポートを自動割り当て
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const assignedPort = address.port;
    log(`Internal server running at http://localhost:${assignedPort}/`);
    createWindow(assignedPort);
  });
}

function createWindow(port) {
  const appPath = getAppPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(appPath, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // YouTube IFrame APIのために必要
    },
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  // 開発時は以下を有効化しても良い
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', startServer);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  if (server) {
    server.close();
  }
});

app.on('activate', function () {
  if (mainWindow === null) startServer();
});
