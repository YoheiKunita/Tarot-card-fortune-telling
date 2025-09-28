"use strict";

function validateReading(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object") { errors.push({ path: "$", msg: "must be object" }); return { valid: false, errors }; }
  if (typeof obj.summary !== "string") { errors.push({ path: "$.summary", msg: "must be string" }); }
  if (!Array.isArray(obj.cards)) { errors.push({ path: "$.cards", msg: "must be array" }); }
  else {
    obj.cards.forEach((c, i) => {
      const base = `$.cards[${i}]`;
      if (!c || typeof c !== "object") { errors.push({ path: base, msg: "must be object" }); return; }
      if (typeof c.cardName !== "string") { errors.push({ path: `${base}.cardName`, msg: "must be string" }); }
      if (c.position !== "upright" && c.position !== "reversed") { errors.push({ path: `${base}.position`, msg: "must be 'upright'|'reversed'" }); }
      if (typeof c.meaning !== "string") { errors.push({ path: `${base}.meaning`, msg: "must be string" }); }
      if ("advice" in c && typeof c.advice !== "string") { errors.push({ path: `${base}.advice`, msg: "must be string if present" }); }
    });
  }
  return { valid: errors.length === 0, errors };
}

function fallbackFrom(cards, question) {
  const items = (cards || []).map((c) => ({
    cardName: c?.name || c?.cardName || "Unknown",
    position: c?.position === "reversed" ? "reversed" : "upright",
    meaning: `${c?.name || c?.cardName || "Card"} hints at perspective on "${question || "your topic"}"`,
    advice: "Reflect, then take one small step.",
  }));
  return { summary: `Tentative summary for: ${question || "your question"}.`, cards: items };
}

function parseReading(raw, ctx = {}) {
  let parsed = null;
  try { parsed = JSON.parse(raw); }
  catch (_) { return { reading: fallbackFrom(ctx.cards, ctx.question), valid: false, reason: "non_json" }; }
  const v = validateReading(parsed);
  if (!v.valid) { return { reading: fallbackFrom(ctx.cards, ctx.question), valid: false, reason: "schema_mismatch", errors: v.errors }; }
  return { reading: parsed, valid: true };
}

module.exports = { parseReading, validateReading };

