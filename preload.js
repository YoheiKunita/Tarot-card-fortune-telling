// Minimal preload to bridge safe events to renderer
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { AdviserService } = require(path.join(__dirname, 'lib', 'adviser-service'));
let adviserExports = null;
try {
  adviserExports = require(path.join(__dirname, 'lib', 'tarot-adviser'));
} catch (_) {
  adviserExports = null;
}
try { console.log('[preload] adviser module loaded (internal only):', !!adviserExports); } catch(_) {}

// Instantiate service once; preload is long-lived per renderer
const adviserService = new AdviserService({
  backend: 'auto',
  // APIキー/モデルは renderer 側の input で上書き可能
  adviserExports,
  logger: console,
});

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
  onOpenStartMenu: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('menu:start', handler);
    return () => ipcRenderer.off('menu:start', handler);
  },
  onOpenSettings: (cb) => {
    if (typeof cb !== 'function') return () => {};
    const handler = () => cb();
    ipcRenderer.on('settings:open', handler);
    return () => ipcRenderer.off('settings:open', handler);
  }
});

// Adviser API: generate reading from selected cards
contextBridge.exposeInMainWorld('adviser', {
  // 安定契約: 失敗時も resolve（valid:false または stub にフォールバック）
  generate: async (input) => {
    try {
      const res = await adviserService.generate(input || {});
      return res;
    } catch (e) {
      try { console.warn('[preload] AdviserService fatal error, inline fallback:', e?.message || e); } catch {}
      // 最終フォールバック（理論上到達しない想定）
      const question = (input && input.question) || '';
      const cards = Array.isArray(input && input.cards) ? input.cards : [];
      const mapped = cards.map(c => ({
        cardName: c?.name || c?.cardName || 'Unknown',
        position: c?.position === 'reversed' ? 'reversed' : 'upright',
        meaning: `${(c?.name||c?.cardName||'Card')} (${c?.position||'upright'}) suggests reflection about "${question||'your situation'}"`,
        advice: 'Consider small, practical next steps.',
      }));
      return { reading: { summary: `Fallback: ${question||'your question'}`, cards: mapped }, valid: true, meta: { inferenceId: 'inline-stub-fatal', durationMs: 0, cached: false, backend: 'stub', reason: 'FATAL' } };
    }
  }
});
