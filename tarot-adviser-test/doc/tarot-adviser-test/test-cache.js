"use strict";

const path = require("path");
const { createClient, GenerateReadingUseCase } = require(path.join("..", "..", "..", "lib", "tarot-adviser"));

(async () => {
  const llm = createClient("stub", { mode: "valid" });
  const usecase = new GenerateReadingUseCase({ llmClient: llm });
  const input = {
    question: "恋愛運を教えてください",
    cards: [
      { name: "The Lovers", position: "upright", slot: "theme" },
      { name: "Justice", position: "upright", slot: "advice" },
    ],
    spread: { name: "Two Card", slots: ["theme", "advice"] },
  };

  const first = await usecase.execute(input);
  const second = await usecase.execute(input);

  console.log("=== test-cache results ===");
  console.log("first.cached:", first.meta.cached, "second.cached:", second.meta.cached);
  if (!second.meta.cached) {
    console.error("[FAIL] expected cache to be used on second call");
    process.exit(1);
  }
  console.log("[PASS] cache test");
})();
