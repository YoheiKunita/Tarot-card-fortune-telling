"use strict";

const path = require("path");
const { createClient, GenerateReadingUseCase } = require(path.join("..", "..", "..", "lib", "tarot-adviser"));

(async () => {
  // Return JSON missing required fields and with invalid position to trigger schema_mismatch
  const llm = createClient("stub", {
    template: () => JSON.stringify({
      summary: 123, // invalid type
      cards: [
        { cardName: "The Tower", position: "sideways", meaning: 42 }, // invalid position+type
        { position: "upright", meaning: "ok but missing cardName" },
      ],
    }),
  });
  const usecase = new GenerateReadingUseCase({ llmClient: llm });
  const input = {
    question: "テスト: スキーマ不一致の扱いは?",
    cards: [ { name: "The Tower", position: "upright" } ],
    spread: { name: "One", slots: ["focus"] },
  };

  const res = await usecase.execute(input);
  console.log("=== test-schema-mismatch result ===");
  console.log(JSON.stringify(res, null, 2));
  if (res.valid !== false || res.meta.reason !== "schema_mismatch") {
    console.error("[FAIL] expected schema_mismatch fallback");
    process.exit(1);
  }
  console.log("[PASS] schema mismatch fallback test");
})();
