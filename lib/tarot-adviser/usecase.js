"use strict";

const { buildPrompt } = require("./promptBuilder");
const { parseReading } = require("./parser");

function makeId() { const rnd = Math.random().toString(16).slice(2); const ts = Date.now().toString(16); return `${ts}-${rnd}`; }

class InMemoryCache { constructor() { this.map = new Map(); } get(k){ return this.map.get(k); } set(k,v){ this.map.set(k,v); } }
class ConsoleLogger { info(msg, meta){ try{ console.log("[info]", msg, meta||""); }catch(_){} } warn(msg, meta){ try{ console.warn("[warn]", msg, meta||""); }catch(_){} } }

class GenerateReadingUseCase {
  constructor({ llmClient, cache, logger }) { this.llm = llmClient; this.cache = cache || new InMemoryCache(); this.logger = logger || new ConsoleLogger(); }
  async execute({ question, cards, spread, userId }) {
    const cacheKey = JSON.stringify({ question, cards, spread });
    const cached = this.cache.get(cacheKey);
    if (cached) { this.logger.info("Cache hit", { userId }); return { ...cached, meta: { ...cached.meta, cached: true } }; }
    const prompt = buildPrompt(question, cards, spread);
    const start = Date.now();
    const raw = await this.llm.generate(prompt);
    const durationMs = Date.now() - start;
    const approxTokens = Math.ceil((prompt.length + raw.length) / 4);
    const parsed = parseReading(raw, { cards, question });
    const result = { reading: parsed.reading, valid: parsed.valid, meta: { inferenceId: makeId(), userId: userId || null, durationMs, approxTokens, cached: false, reason: parsed.valid ? null : parsed.reason } };
    this.logger.info("Generated reading", { valid: parsed.valid, durationMs, approxTokens });
    this.cache.set(cacheKey, result);
    return result;
  }
}

module.exports = { GenerateReadingUseCase, InMemoryCache, ConsoleLogger };

