"use strict";

function buildPrompt(question, cards, spread) {
  const schema = `Schema:\n{\n  \"summary\": string,\n  \"cards\": [ { \"cardName\": string, \"position\": \"upright\"|\"reversed\", \"meaning\": string, \"advice\"?: string } ]\n}`;
  const input = {
    question: question || "",
    cards: (cards || []).map((c) => ({ name: c.name || c.cardName || "", position: c.position || "upright", slot: c.slot || "" })),
    spread: spread || null,
  };
  const rules = `Rules:\n- Respond ONLY with valid JSON that matches the schema.\n- Keep \"summary\" concise (1-3 sentences).\n- Reflect the \"position\" (upright/reversed) in each card's meaning.\n- If unsure, be neutral and practical.`;
  return [
    "You are an expert tarot adviser.",
    schema,
    "\nInput:",
    JSON.stringify(input, null, 2),
    "\n",
    rules,
  ].join("\n");
}

module.exports = { buildPrompt };

