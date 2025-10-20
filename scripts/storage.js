/**
 * Storage abstraction layer for HoloSync
 * Provides fallback from chrome.storage to localStorage to URL parameters
 */

class StorageAdapter {
  constructor() {
    this.storageTypes = ['chrome', 'local', 'url'];
    this.currentStorage = this.detectStorage();
  }

  detectStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return 'chrome';
    }
    return 'local';
  }

  async setItem(key, value) {
    const data = { value, timestamp: Date.now() };
    try {
      switch (this.currentStorage) {
        case 'chrome':
          await this.setChromeStorage(key, data);
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

  async getChromeStorage(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const data = result[key];
          resolve(data ? data.value : null);
        }
      });
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
    // For presets, encode video IDs in URL
    const url = new URL(window.location);
    if (key === 'preset') {
      url.searchParams.set('videos', value.join(','));
    }
    window.history.replaceState(null, '', url.toString());
  }

  getUrlParameter(key) {
    const url = new URL(window.location);
    if (key === 'preset') {
      const videos = url.searchParams.get('videos');
      return videos ? videos.split(',') : null;
    }
    return null;
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
