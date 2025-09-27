"use strict";

function isReadingLike(obj) {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.summary !== "string") return false;
  if (!Array.isArray(obj.cards)) return false;
  for (const c of obj.cards) {
    if (!c || typeof c !== "object") return false;
    if (typeof c.cardName !== "string") return false;
    if (c.position !== "upright" && c.position !== "reversed") return false;
    if (typeof c.meaning !== "string") return false;
    if ("advice" in c && typeof c.advice !== "string") return false;
  }
  return true;
}

function fallbackFrom(cards, question) {
  const items = (cards || []).map((c) => ({
    cardName: c?.name || c?.cardName || "Unknown",
    position: c?.position === "reversed" ? "reversed" : "upright",
    meaning: `${c?.name || c?.cardName || "Card"} hints at perspective on "${question || "your topic"}"`,
    advice: "Reflect, then take one small step.",
  }));
  return {
    summary: `Tentative summary for: ${question || "your question"}.`,
    cards: items,
  };
}

/**
 * Parse and validate a model output string. If invalid, return a reasonable fallback.
 * @param {string} raw
 * @param {object} ctx
 * @param {Array=} ctx.cards - original input cards for fallback
 * @param {string=} ctx.question - original question for fallback
 */
function parseReading(raw, ctx = {}) {
  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    return { reading: fallbackFrom(ctx.cards, ctx.question), valid: false, reason: "non_json" };
  }
  if (!isReadingLike(parsed)) {
    return { reading: fallbackFrom(ctx.cards, ctx.question), valid: false, reason: "schema_mismatch" };
  }
  return { reading: parsed, valid: true };
}

module.exports = { parseReading };

