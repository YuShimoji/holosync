const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

let mainWindow = null;
let server = null;
let currentPort = null;
let saveStateTimer = null;

const logPath = path.join(app.getPath('userData'), 'holosync.log');
const windowPrefsPath = path.join(app.getPath('userData'), 'window-preferences.json');
const DEFAULT_WINDOW_PREFS = {
  framelessMode: false,
  bounds: { width: 1280, height: 800 },
  isMaximized: false,
};
let windowPrefs = loadWindowPrefs();

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

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `${timestamp}: ${message}\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch (error) {
    console.error('Failed to write log:', error);
  }
  console.log(message);
}

function getAppPath() {
  return __dirname;
}

function loadWindowPrefs() {
  try {
    if (!fs.existsSync(windowPrefsPath)) {
      return { ...DEFAULT_WINDOW_PREFS };
    }
    const raw = fs.readFileSync(windowPrefsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_WINDOW_PREFS,
      ...parsed,
      bounds: {
        ...DEFAULT_WINDOW_PREFS.bounds,
        ...(parsed?.bounds || {}),
      },
    };
  } catch (error) {
    log(`Failed to load window preferences: ${error.message}`);
    return { ...DEFAULT_WINDOW_PREFS };
  }
}

function saveWindowPrefs() {
  try {
    fs.writeFileSync(windowPrefsPath, JSON.stringify(windowPrefs, null, 2));
  } catch (error) {
    log(`Failed to save window preferences: ${error.message}`);
  }
}

function scheduleSaveWindowState() {
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
  }
  saveStateTimer = setTimeout(() => {
    saveStateTimer = null;
    captureWindowState();
  }, 150);
}

function captureWindowState(targetWindow = mainWindow) {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const isMaximized = targetWindow.isMaximized();
  const bounds = isMaximized ? windowPrefs.bounds : targetWindow.getBounds();
  windowPrefs = {
    ...windowPrefs,
    bounds: {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
    },
    isMaximized,
  };
  saveWindowPrefs();
}

function createWindow(port) {
  const appPath = getAppPath();
  const bounds = windowPrefs.bounds || DEFAULT_WINDOW_PREFS.bounds;
  const framelessMode = Boolean(windowPrefs.framelessMode);

  const options = {
    width: Number.isFinite(bounds.width) ? bounds.width : DEFAULT_WINDOW_PREFS.bounds.width,
    height: Number.isFinite(bounds.height) ? bounds.height : DEFAULT_WINDOW_PREFS.bounds.height,
    frame: !framelessMode,
    autoHideMenuBar: true,
    fullscreenable: true,
    icon: path.join(appPath, 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(appPath, 'preload.js'),
    },
  };

  if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    options.x = bounds.x;
    options.y = bounds.y;
  }

  const windowRef = new BrowserWindow(options);
  mainWindow = windowRef;
  windowRef.setMenuBarVisibility(false);
  windowRef.removeMenu();
  windowRef.loadURL(`http://localhost:${port}`);

  windowRef.webContents.setWindowOpenHandler(({ url }) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  const appOrigin = `http://localhost:${port}`;
  windowRef.webContents.on('will-navigate', (event, url) => {
    if (typeof url !== 'string' || url.startsWith(appOrigin)) {
      return;
    }
    event.preventDefault();
    if (/^https?:\/\//.test(url)) {
      void shell.openExternal(url);
    }
  });

  if (windowPrefs.isMaximized) {
    windowRef.maximize();
  }

  windowRef.on('move', scheduleSaveWindowState);
  windowRef.on('resize', scheduleSaveWindowState);
  windowRef.on('maximize', scheduleSaveWindowState);
  windowRef.on('unmaximize', scheduleSaveWindowState);
  windowRef.on('close', () => captureWindowState(windowRef));
  windowRef.on('closed', () => {
    if (mainWindow === windowRef) {
      mainWindow = null;
    }
  });

  return windowRef;
}

function recreateWindowForFrameMode() {
  if (!mainWindow || mainWindow.isDestroyed() || !Number.isFinite(currentPort)) {
    return;
  }
  const oldWindow = mainWindow;
  const wasFullscreen = oldWindow.isFullScreen();
  captureWindowState();

  // Create the replacement window first to avoid triggering an app quit
  // path while switching frame mode.
  const newWindow = createWindow(currentPort);
  if (wasFullscreen && newWindow) {
    newWindow.setFullScreen(true);
  }
  oldWindow.destroy();
}

function startServer() {
  log(`Log file: ${logPath}`);
  log('Starting server...');

  const appPath = getAppPath();
  log(`App path (__dirname): ${appPath}`);
  log(`Resources path: ${process.resourcesPath}`);

  server = http.createServer((req, res) => {
    try {
      const requestPath = (req.url || '/').split('?')[0];
      const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
      const resolvedPath = path.join(
        appPath,
        safePath === '/' || safePath === '\\' ? 'index.html' : safePath
      );

      const extname = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[extname] || 'application/octet-stream';

      fs.readFile(resolvedPath, (error, content) => {
        if (error) {
          log(`Error reading file: ${resolvedPath}, error: ${error.code}`);
          if (error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
          }
          res.writeHead(500);
          res.end(`500: ${error.code}`);
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      });
    } catch (error) {
      log(`Critical error in request handler: ${error.message}`);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  });

  const PREFERRED_PORT = 19876;
  const MAX_PORT_RETRIES = 10;

  function tryListen(port, retries) {
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' && retries > 0) {
        log(`Port ${port} in use, trying ${port + 1}...`);
        tryListen(port + 1, retries - 1);
      } else {
        log(`Server error: ${error.code}`);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      currentPort = address?.port;
      log(`Internal server running at http://localhost:${currentPort}/`);
      createWindow(currentPort);
    });
  }

  tryListen(PREFERRED_PORT, MAX_PORT_RETRIES);
}

ipcMain.handle('window:get-preferences', () => {
  return { framelessMode: Boolean(windowPrefs.framelessMode) };
});

ipcMain.handle('window:set-frameless', (_, enabled) => {
  const nextValue = Boolean(enabled);
  if (windowPrefs.framelessMode === nextValue) {
    return { framelessMode: nextValue, changed: false };
  }
  windowPrefs = { ...windowPrefs, framelessMode: nextValue };
  saveWindowPrefs();
  recreateWindowForFrameMode();
  return { framelessMode: nextValue, changed: true };
});

ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window:toggle-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

app.whenReady().then(startServer);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (saveStateTimer) {
    clearTimeout(saveStateTimer);
    saveStateTimer = null;
  }
  if (server) {
    server.close();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    return;
  }
  if (server && Number.isFinite(currentPort)) {
    createWindow(currentPort);
    return;
  }
  startServer();
});
