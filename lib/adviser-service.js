// AdviserService: タロット結果生成の安定API（Electron preload から使用）
// CommonJS モジュール
const path = require('path');

class AdviserService {
  constructor(opts = {}) {
    this.opts = Object.assign({
      backend: 'auto',            // 'auto' | 'openai' | 'stub'
      apiKey: '',
      model: 'gpt-4o-mini',
      timeoutMs: 20000,
      retry: { max: 2, baseMs: 500, factor: 2, jitter: true },
      locale: 'ja',
      logger: console,
      now: () => Date.now(),
      uuid: () => Math.random().toString(36).slice(2),
      cache: null,
      adviserExports: null,       // { createClient, GenerateReadingUseCase }
    }, opts);

    if (!this.opts.adviserExports) {
      try {
        this.opts.adviserExports = require(path.join(__dirname, 'tarot-adviser'));
      } catch (_) {
        this.opts.adviserExports = null;
      }
    }
  }

  async generate(input = {}) {
    const t0 = this.opts.now();
    const inferenceId = this.opts.uuid();
    const n = this.#normalizeInput(input);
    const backend = this.#pickBackend(n);

    if (!n.cards.length) {
      return this.#invalid('NO_CARDS', 'カードが選択されていません', inferenceId, t0);
    }

    const key = this.#cacheKey(n, backend);
    const cached = this.#cacheGet(key);
    if (cached) return cached;

    let out;
    if (backend === 'openai' && this.#canUseOpenAI()) {
      try {
        const run = () => this.#runOpenAI(n);
        const res = await this.#retryWithTimeout(run);
        const reading = (res && res.reading) ? res.reading : { summary: '', cards: [] };
        out = this.#ok({ reading, meta: res && res.meta ? res.meta : {} }, inferenceId, 'openai', t0);
      } catch (e) {
        this.#log('warn', '[AdviserService] OpenAI error; use fallback:', this.#safe(e));
        const fb = this.#stubResult(n);
        out = this.#ok({ reading: fb.reading, meta: fb.meta || {} }, inferenceId, 'stub', t0, 'OPENAI_ERROR');
      }
    } else {
      const fb = this.#stubResult(n);
      out = this.#ok({ reading: fb.reading, meta: fb.meta || {} }, inferenceId, 'stub', t0, backend === 'openai' ? 'OPENAI_NOT_AVAILABLE' : null);
    }

    this.#cacheSet(key, out);
    return out;
  }

  // 内部処理
  #normalizeInput(input) {
    const locale = input.locale || this.opts.locale || 'ja';
    const question = (input.question ? String(input.question) : '').slice(0, 2000);
    const cardsIn = Array.isArray(input.cards) ? input.cards : [];
    const cards = cardsIn.map(c => ({
      name: (c && (c.name || c.cardName)) ? String(c.name || c.cardName) : 'Unknown',
      position: (c && c.position === 'reversed') ? 'reversed' : 'upright',
      slot: c && c.slot ? String(c.slot) : '',
    }));
    const spread = input.spread && typeof input.spread === 'object' ? {
      name: input.spread.name ? String(input.spread.name) : '',
      slots: Array.isArray(input.spread.slots) ? input.spread.slots.map(s => String(s)) : undefined,
    } : null;
    const apiKey = (input.apiKey || this.opts.apiKey || '').trim();
    const model = (input.model || this.opts.model || 'gpt-4o-mini').trim();
    return { question, cards, spread, userId: input.userId || null, apiKey, model, locale };
  }

  #pickBackend(n) {
    const mode = this.opts.backend || 'auto';
    if (mode === 'openai') return 'openai';
    if (mode === 'stub') return 'stub';
    return n.apiKey ? 'openai' : 'stub';
  }

  #canUseOpenAI() {
    const ex = this.opts.adviserExports;
    return !!(ex && typeof ex.createClient === 'function' && typeof ex.GenerateReadingUseCase === 'function');
  }

  async #runOpenAI(n) {
    const ex = this.opts.adviserExports;
    const llm = ex.createClient('openai', { apiKey: n.apiKey, model: n.model });
    const usecase = new ex.GenerateReadingUseCase({ llmClient: llm, locale: n.locale || 'ja' });
    return await usecase.execute({ question: n.question, cards: n.cards, spread: n.spread, userId: n.userId });
  }

  // 例外時/未設定時のフォールバック（インライン <script> の代替）
  #stubResult(n) {
    const q = n.question || '';
    const cards = n.cards.map(c => ({
      cardName: c.name,
      position: c.position,
      meaning: (n.locale === 'ja')
        ? `${c.name}（${c.position === 'reversed' ? '逆位置' : '正位置'}）は「${q || 'あなたの状況'}」について内省を促します。`
        : `${c.name} (${c.position}) suggests reflection about "${q || 'your situation'}"`,
      advice: (n.locale === 'ja') ? 'まずは小さな一歩から。' : 'Start with small, practical steps.',
    }));
    const summary = (n.locale === 'ja')
      ? `フォールバック生成: ${q || 'ご質問'}について、まずは小さな行動から始めましょう。`
      : `Fallback: For ${q || 'your question'}, begin with a small step.`;
    return { reading: { summary, cards }, meta: { backend: 'stub' } };
  }

  async #retryWithTimeout(fn) {
    const { max, baseMs, factor, jitter } = this.opts.retry;
    let attempt = 0;
    let lastErr;
    while (attempt <= max) {
      try {
        return await this.#withTimeout(fn(), this.opts.timeoutMs);
      } catch (e) {
        lastErr = e;
        if (attempt === max || !this.#isRetryable(e)) break;
        const backoff = Math.round(baseMs * Math.pow(factor, attempt));
        const wait = jitter ? this.#jitter(backoff) : backoff;
        await this.#sleep(wait);
        attempt++;
      }
    }
    throw lastErr;
  }

  #withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(this.#timeoutError()), ms);
      promise.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
    });
  }

  #timeoutError() { const e = new Error('timeout'); e.code = 'TIMEOUT'; return e; }
  #isRetryable(e) { const c = (e && (e.code || e.status || e.name)) || ''; return ['429','500','502','503','504','ETIMEDOUT','ECONNRESET','TIMEOUT'].some(k => String(c).includes(k)) || /rate|timeout|temporar/i.test(String(e && e.message)); }
  #sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  #jitter(ms) { const d = Math.floor(ms * 0.2); return ms - d + Math.floor(Math.random() * (2*d + 1)); }

  #ok(mapped, inferenceId, backend, t0, reason = null) {
    return {
      valid: true,
      reading: mapped.reading,
      meta: {
        inferenceId,
        backend,
        durationMs: Math.max(0, this.opts.now() - t0),
        approxTokens: mapped.meta?.approxTokens || 0,
        cached: false,
        reason,
      }
    };
  }

  #invalid(code, message, inferenceId, t0) {
    return {
      valid: false,
      error: { code, message, retryable: false },
      meta: { inferenceId, backend: 'stub', durationMs: Math.max(0, this.opts.now() - t0), cached: false }
    };
  }

  #safe(e) { return (e && e.message) ? e.message : String(e); }
  #log(level, ...args) { try { this.opts.logger && this.opts.logger[level] && this.opts.logger[level](...args); } catch(_){} }

  #cacheKey(n, backend) {
    const data = JSON.stringify({ q: n.question, c: n.cards, s: n.spread, m: n.model, l: n.locale, b: backend });
    let h = 0; for (let i = 0; i < data.length; i++) { h = (h * 31 + data.charCodeAt(i)) >>> 0; }
    return `adv:${h}`;
  }

  #cacheGet(key) { if (!this.opts.cache) return null; try { return this.opts.cache.get(key) || null; } catch { return null; } }
  #cacheSet(key, val) { if (!this.opts.cache) return; try { this.opts.cache.set(key, val, 60_000); } catch {} }
}

module.exports = { AdviserService };
