/**
 * Storage abstraction layer for HoloSync
 * Provides fallback from chrome.storage to localStorage to URL parameters
 */

class StorageAdapter {
  constructor() {
    this.storageTypes = ['chrome', 'indexeddb', 'local', 'url'];
    this.currentStorage = this.detectStorage();
    this.dbName = 'HoloSyncDB';
    this.dbVersion = 1;
  }

  detectStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return 'chrome';
    }
    if (this.isIndexedDBSupported()) {
      return 'indexeddb';
    }
    return 'local';
  }

  isIndexedDBSupported() {
    try {
      return !!(
        window.indexedDB ||
        window.mozIndexedDB ||
        window.webkitIndexedDB ||
        window.msIndexedDB
      );
    } catch (e) {
      return false;
    }
  }

  async setItem(key, value) {
    const data = { value, timestamp: Date.now() };
    try {
      switch (this.currentStorage) {
        case 'chrome':
          await this.setChromeStorage(key, data);
          break;
        case 'indexeddb':
          await this.setIndexedDB(key, data);
          break;
        case 'local':
          this.setLocalStorage(key, data);
          break;
        case 'url':
          this.setUrlParameter(key, value);
          break;
      }
    } catch (error) {
      console.warn(`Storage set failed for ${key}:`, error);
      // Fallback to next storage type
      this.fallbackSet(key, value);
    }
  }

  async getItem(key) {
    try {
      switch (this.currentStorage) {
        case 'chrome':
          return await this.getChromeStorage(key);
        case 'indexeddb':
          return await this.getIndexedDB(key);
        case 'local':
          return this.getLocalStorage(key);
        case 'url':
          return this.getUrlParameter(key);
      }
    } catch (error) {
      console.warn(`Storage get failed for ${key}:`, error);
      return this.fallbackGet(key);
    }
  }

  async setChromeStorage(key, data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('keyValueStore')) {
          db.createObjectStore('keyValueStore');
        }
      };
    });
  }

  async setIndexedDB(key, data) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['keyValueStore'], 'readwrite');
      const store = transaction.objectStore('keyValueStore');
      const request = store.put(data, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getIndexedDB(key) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['keyValueStore'], 'readonly');
      const store = transaction.objectStore('keyValueStore');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const data = request.result;
        resolve(data ? data.value : null);
      };
    });
  }

  setLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      throw new Error(`localStorage set failed: ${error.message}`);
    }
  }

  getLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }
      const data = JSON.parse(item);
      return data.value;
    } catch (error) {
      throw new Error(`localStorage get failed: ${error.message}`);
    }
  }

  setUrlParameter(key, value) {
    // Encode various data types in URL parameters
    const url = new URL(window.location);
    if (key === 'videos') {
      // Array of video IDs
      url.searchParams.set('videos', value.join(','));
    } else if (key === 'volume') {
      // Volume number
      url.searchParams.set('volume', value.toString());
    } else if (key === 'preset') {
      // For preset sharing, encode video IDs
      url.searchParams.set('preset', value.join(','));
    }
    window.history.replaceState(null, '', url.toString());
  }

  getUrlParameter(key) {
    const url = new URL(window.location);
    const param = url.searchParams.get(key);
    if (!param) {
      return null;
    }

    if (key === 'videos' || key === 'preset') {
      return param.split(',').filter((id) => id.length === 11); // Filter valid YouTube IDs
    } else if (key === 'volume') {
      const vol = parseInt(param, 10);
      return Number.isFinite(vol) ? vol : null;
    }
    return param;
  }

  async fallbackSet(key, value) {
    // Try next storage type
    const nextIndex = this.storageTypes.indexOf(this.currentStorage) + 1;
    if (nextIndex < this.storageTypes.length) {
      const original = this.currentStorage;
      this.currentStorage = this.storageTypes[nextIndex];
      try {
        await this.setItem(key, value);
        console.log(`Fallback storage: ${original} -> ${this.currentStorage}`);
      } catch (error) {
        console.error(`All storage fallbacks failed for ${key}`);
      }
      this.currentStorage = original;
    }
  }

  fallbackGet(key) {
    // Try next storage type
    const nextIndex = this.storageTypes.indexOf(this.currentStorage) + 1;
    if (nextIndex < this.storageTypes.length) {
      const original = this.currentStorage;
      this.currentStorage = this.storageTypes[nextIndex];
      try {
        const value = this.getItem(key);
        console.log(`Fallback storage: ${original} -> ${this.currentStorage}`);
        this.currentStorage = original;
        return value;
      } catch (error) {
        this.currentStorage = original;
        console.error(`All storage fallbacks failed for ${key}`);
        return null;
      }
    }
    return null;
  }

  // Preset-specific methods
  async savePreset(name, videoIds) {
    const presets = (await this.getItem('presets')) || [];
    const existingIndex = presets.findIndex((p) => p.name === name);
    const preset = {
      id: crypto.randomUUID(),
      name,
      videoIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      preset.createdAt = presets[existingIndex].createdAt;
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
      // Keep only last 10 presets
      if (presets.length > 10) {
        presets.shift();
      }
    }

    await this.setItem('presets', presets);
    return preset;
  }

  async loadPresets() {
    return (await this.getItem('presets')) || [];
  }

  async loadPreset(name) {
    const presets = await this.loadPresets();
    return presets.find((p) => p.name === name) || null;
  }

  // Search history
  async saveSearchHistory(query) {
    const history = (await this.getItem('searchHistory')) || [];
    const existingIndex = history.indexOf(query);
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }
    history.unshift(query);
    // Keep only last 5
    if (history.length > 5) {
      history.pop();
    }
    await this.setItem('searchHistory', history);
  }

  async getSearchHistory() {
    return (await this.getItem('searchHistory')) || [];
  }
}

// Global instance
window.storageAdapter = new StorageAdapter();
