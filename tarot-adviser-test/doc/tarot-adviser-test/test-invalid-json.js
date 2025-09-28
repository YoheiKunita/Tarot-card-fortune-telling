"use strict";

const path = require("path");
const { createClient, GenerateReadingUseCase } = require(path.join("..", "..", "..", "lib", "tarot-adviser"));

(async () => {
  const llm = createClient("stub", { mode: "invalid" });
  const usecase = new GenerateReadingUseCase({ llmClient: llm });
  const input = {
    question: "金運の流れは？",
    cards: [ { name: "Wheel of Fortune", position: "upright" } ],
    spread: { name: "One Card", slots: ["focus"] },
  };

  const res = await usecase.execute(input);
  console.log("=== test-invalid-json result ===");
  console.log(JSON.stringify(res, null, 2));
  if (res.valid !== false || !res.meta.reason) {
    console.error("[FAIL] expected fallback due to invalid JSON output");
    process.exit(1);
  }
  console.log("[PASS] invalid-json fallback test");
})();
