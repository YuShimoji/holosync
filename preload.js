/* eslint-env node */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDialog', {
  confirm(message) {
    return ipcRenderer.sendSync('dialog:confirm', message);
  },
});

contextBridge.exposeInMainWorld('electronWindow', {
  async getPreferences() {
    return ipcRenderer.invoke('window:get-preferences');
  },
  async setFramelessMode(enabled) {
    return ipcRenderer.invoke('window:set-frameless', Boolean(enabled));
  },
  minimize() {
    ipcRenderer.send('window:minimize');
  },
  toggleMaximize() {
    ipcRenderer.send('window:toggle-maximize');
  },
  close() {
    ipcRenderer.send('window:close');
  },
});
