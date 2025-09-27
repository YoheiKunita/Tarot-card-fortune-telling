"use strict";

const path = require("path");
const { createClient, GenerateReadingUseCase } = require(path.join("..", "..", "lib", "tarot-adviser"));

(async () => {
  const llm = createClient("stub", { mode: "valid" });
  const usecase = new GenerateReadingUseCase({ llmClient: llm });

  const question = "転職活動は今進めるべきですか？";
  const cards = [
    { name: "The Fool", position: "upright", slot: "present" },
    { name: "The Hermit", position: "reversed", slot: "challenge" },
    { name: "The Sun", position: "upright", slot: "outcome" },
  ];
  const spread = { name: "Three Card", slots: ["present", "challenge", "outcome"] };

  const result = await usecase.execute({ question, cards, spread, userId: "demo-user" });
  console.log("=== run-sample result ===");
  console.log(JSON.stringify(result, null, 2));

  // Basic shape assertions
  if (!result.reading || !Array.isArray(result.reading.cards)) {
    console.error("[FAIL] invalid reading shape");
    process.exit(1);
  }
  console.log("[PASS] run-sample");
})();

