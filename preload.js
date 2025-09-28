// Minimal preload to bridge safe events to renderer
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
let adviserExports = null;
try {
  adviserExports = require(path.join(__dirname, 'lib', 'tarot-adviser'));
} catch (_) {
  adviserExports = null;
}
try { console.log('[preload] adviser module loaded (internal only):', !!adviserExports); } catch(_) {}

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

// Adviser API: generate reading from selected cards
contextBridge.exposeInMainWorld('adviser', {
  /**
   * input: { question, cards:[{name,position,slot}], spread:{name,slots}, userId?, backend?, apiKey?, model? }
   */
  generate: async (input) => {
    try {
      if (adviserExports) {
        const { createClient, GenerateReadingUseCase } = adviserExports;
        const backend = input.backend || (input.apiKey ? 'openai' : 'stub');
        const clientOpts = backend === 'openai'
          ? { apiKey: input.apiKey, model: input.model }
          : { mode: 'valid' };
        const llm = createClient(backend, clientOpts);
        const usecase = new GenerateReadingUseCase({ llmClient: llm });
        return await usecase.execute({
          question: input.question || '',
          cards: input.cards || [],
          spread: input.spread || null,
          userId: input.userId || null,
        });
      }
    } catch (e) {
      try { console.warn('[preload] adviser error, using inline stub:', e && e.message ? e.message : e); } catch(_) {}
    }
    // Inline stub fallback (module not available): produce deterministic JSON
    const question = input.question || '';
    const cards = Array.isArray(input.cards) ? input.cards : [];
    const mapped = cards.map(c => ({
      cardName: c.name || c.cardName || 'Unknown',
      position: c.position === 'reversed' ? 'reversed' : 'upright',
      meaning: `${(c.name||c.cardName||'Card')} (${c.position||'upright'}) suggests reflection about "${question||'your situation'}"`,
      advice: 'Consider small, practical next steps.',
    }));
    return { reading: { summary: `A balanced view on: ${question||'your question'}.`, cards: mapped }, valid: true, meta: { inferenceId: 'inline-stub', userId: input.userId||null, durationMs: 0, approxTokens: 0, cached: false, reason: null } };
  }
});
