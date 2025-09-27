// Minimal preload to bridge safe events to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onModeChange: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = (_evt, kind) => cb(kind);
    ipcRenderer.on('mode:change', handler);
    return () => ipcRenderer.off('mode:change', handler);
  },
  onStartRun: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = (_evt, kind) => cb(kind);
    ipcRenderer.on('start:run', handler);
    return () => ipcRenderer.off('start:run', handler);
  },
  onOpenSettings: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('settings:open', handler);
    return () => ipcRenderer.off('settings:open', handler);
  }
});
