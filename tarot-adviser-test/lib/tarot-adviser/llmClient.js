"use strict";

// Lightweight LLM client abstraction. We provide a Stub client for tests.

class LLMClient {
  /** @param {object} opts */
  constructor(opts = {}) {
    this.opts = opts;
  }
  /**
   * @param {string} prompt
   * @returns {Promise<string>} raw model text output
   */
  async generate(prompt) {
    throw new Error("Not implemented");
  }
}

class StubLLMClient extends LLMClient {
  /**
   * Options: { mode: 'valid' | 'invalid', template?: function }
   */
  constructor(opts = {}) {
    super(opts);
    this.mode = opts.mode || "valid";
    this.template = opts.template;
  }
  async generate(prompt) {
    if (typeof this.template === "function") {
      return this.template(prompt);
    }
    if (this.mode === "invalid") {
      return "This is not JSON";
    }
    // Extract input block if present to craft deterministic JSON
    let inputJson = null;
    const m = prompt.match(/\nInput:\n([\s\S]*)\n\nRules:/);
    if (m) {
      try { inputJson = JSON.parse(m[1]); } catch (_) {}
    }
    const cards = inputJson?.cards || [];
    const cardOut = cards.map((c) => ({
      cardName: c.name,
      position: c.position === "reversed" ? "reversed" : "upright",
      meaning: `${c.name} (${c.position}) suggests reflection about "${inputJson?.question || "your situation"}"`,
      advice: "Consider small, practical next steps.",
    }));
    const out = {
      summary: `A balanced view on: ${inputJson?.question || "your question"}.`,
      cards: cardOut,
    };
    return JSON.stringify(out);
  }
}

class OpenAIClient extends LLMClient {
  /**
   * opts: { apiKey?: string, model?: string, baseURL?: string, temperature?: number }
   * - apiKey: if omitted, uses process.env.OPENAI_API_KEY
   * - model: default 'gpt-4o-mini'
   * - baseURL: override for compatible endpoints (default https://api.openai.com/v1)
   */
  constructor(opts = {}) {
    super(opts);
    this.apiKey = opts.apiKey || process.env.OPENAI_API_KEY;
    this.model = opts.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    this.baseURL = (opts.baseURL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    this.temperature = typeof opts.temperature === "number" ? opts.temperature : 0.2;
    if (!this.apiKey) {
      throw new Error("OpenAIClient requires an API key. Set opts.apiKey or OPENAI_API_KEY env var.");
    }
  }
  async generate(prompt) {
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: "You are an expert tarot adviser. Respond ONLY with valid JSON matching the schema and input." },
        { role: "user", content: prompt },
      ],
      temperature: this.temperature,
      response_format: { type: "json_object" },
    };
    const url = `${this.baseURL}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    // Prefer fetch if available; fallback to https
    if (typeof fetch === "function") {
      const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI API error ${res.status}: ${text}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new Error("OpenAI response missing message.content");
      }
      return content;
    }

    // Node without fetch: use https
    const https = require("https");
    const payload = JSON.stringify(body);
    const { URL } = require("url");
    const u = new URL(url);
    const options = {
      method: "POST",
      hostname: u.hostname,
      path: u.pathname + (u.search || ""),
      headers: { ...headers, "Content-Length": Buffer.byteLength(payload) },
    };
    const raw = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (d) => { buf += d; });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve(buf);
          return reject(new Error(`OpenAI API error ${res.statusCode}: ${buf}`));
        });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
    let data;
    try { data = JSON.parse(raw); } catch (e) { throw new Error(`Invalid JSON from OpenAI: ${e.message}`); }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI response missing message.content");
    }
    return content;
  }
}

function createClient(kind = "stub", opts = {}) {
  switch (kind) {
    case "stub":
      return new StubLLMClient(opts);
    case "openai":
      return new OpenAIClient(opts);
    default:
      throw new Error(`Unknown LLM client: ${kind}`);
  }
}

module.exports = { LLMClient, StubLLMClient, OpenAIClient, createClient };
