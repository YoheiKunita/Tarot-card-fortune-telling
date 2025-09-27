"use strict";

function buildPrompt(question, cards, spread) {
  const header = [
    "You are an expert tarot adviser.",
    "Produce a clear, empathetic reading strictly as JSON.",
    "Use the schema shown below. Keep language concise.",
  ].join(" ");

  const schemaHint = {
    summary: "string",
    cards: [
      {
        cardName: "string",
        position: "upright|reversed",
        meaning: "string",
        advice: "string (optional)",
      },
    ],
  };

  const input = {
    question,
    spread: spread ? { name: spread.name, slots: spread.slots || [] } : null,
    cards: cards.map((c) => ({ name: c.name, position: c.position, slot: c.slot || null })),
  };

  const instructions = [
    "Rules:",
    "- Interpret each card in context of the question and its position.",
    "- Reflect on upright/reversed nuances.",
    "- Provide actionable but non-prescriptive advice.",
    "- Output ONLY JSON. No markdown, no extra text.",
  ].join("\n");

  return [
    header,
    "\nSchema:",
    JSON.stringify(schemaHint, null, 2),
    "\nInput:",
    JSON.stringify(input, null, 2),
    "\n",
    instructions,
  ].join("\n");
}

module.exports = { buildPrompt };

