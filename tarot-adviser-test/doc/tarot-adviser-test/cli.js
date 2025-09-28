"use strict";

// Simple CLI for tarot-adviser: supports args, JSON input, or interactive mode.
// Usage examples:
//   node doc/tarot-adviser-test/cli.js --question "恋愛は進展しますか？" \
//     --cards "The Fool@upright@present,The Hermit@reversed@challenge,The Sun@upright@outcome" \
//     --spread "Three Card:present,challenge,outcome" --user me --mode valid
//   node doc/tarot-adviser-test/cli.js --input sample.json
//   node doc/tarot-adviser-test/cli.js            (interactive prompts)

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { createClient, GenerateReadingUseCase } = require(path.join("..", "..", "..", "lib", "tarot-adviser"));

function printHelp() {
  const help = `Tarot Adviser CLI\n\n` +
    `Options:\n` +
    `  --question "..."           Question text\n` +
    `  --cards "NAME@POS@SLOT,..."  Cards list (separated by comma). POS: upright|reversed\n` +
    `  --spread "NAME:slot1,slot2"  Spread name and slots (name optional: ":slot1,slot2")\n` +
    `  --user "ID"                 User ID (optional)\n` +
    `  --backend stub|openai       Backend (default: stub)\n` +
    `  --mode valid|invalid        Stub LLM mode (default: valid)\n` +
    `  --apiKey sk-...             OpenAI API key (fallback OPENAI_API_KEY)\n` +
    `  --model gpt-...             OpenAI model (fallback OPENAI_MODEL, default gpt-4o-mini)\n` +
    `  --input file.json           Read full input JSON {question,cards:[{name,position,slot}],spread:{name,slots},userId}\n` +
    `  --summary                   Print only reading.summary\n` +
    `  --help                      Show this help\n` +
    `\nExamples:\n` +
    `  node doc/tarot-adviser-test/cli.js --question "仕事は好転する？" \\\n` +
    `    --cards "The Fool@upright@present,The Hermit@reversed@challenge,The Sun@upright@outcome" \\\n` +
    `    --spread "Three Card:present,challenge,outcome" --user demo --mode valid\n` +
    `  node doc/tarot-adviser-test/cli.js --input sample.json\n` +
    `  node doc/tarot-adviser-test/cli.js\n` +
    `    (interactive prompts)\n`;
  console.log(help);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("-")) { args._.push(a); continue; }
    const key = a.replace(/^--?/, "");
    if (key === "help" || key === "h") { args.help = true; continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) { args[key] = next; i++; }
    else { args[key] = true; }
  }
  return args;
}

function parseCardsSpec(spec) {
  // "Name@upright@slot,Another@reversed@slot2"
  if (!spec) return [];
  return spec.split(/\s*,\s*/).filter(Boolean).map((chunk) => {
    const parts = chunk.split(/[@:\/|]/); // accept multiple separators
    const name = (parts[0] || "").trim();
    const position = (parts[1] || "upright").trim();
    const slot = (parts[2] || "").trim();
    return { name, position, slot };
  });
}

function parseSpreadSpec(spec) {
  // "Name:slot1,slot2" or ":slot1,slot2" or just "slot1,slot2"
  if (!spec) return null;
  let name = "Custom";
  let slotsStr = spec;
  const m = spec.match(/^(.*?):(.*)$/);
  if (m) { name = (m[1] || "Custom").trim(); slotsStr = m[2]; }
  const slots = String(slotsStr).split(/\s*,\s*/).filter(Boolean);
  return { name, slots };
}

async function promptInteractive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans)));
  try {
    const question = await ask("Question: ");
    const cards = [];
    console.log("Enter cards (blank name to finish):");
    while (true) {
      const name = await ask("  Card name: ");
      if (!name) break;
      let position = await ask("  Position (upright/reversed) [upright]: ");
      position = position && position.trim() ? position.trim() : "upright";
      const slot = await ask("  Slot label (e.g., present/challenge/outcome): ");
      cards.push({ name: name.trim(), position, slot: slot.trim() });
      const more = await ask("  Add another? (y/N): ");
      if (!/^y(es)?$/i.test(more || "")) break;
    }
    let spreadName = await ask("Spread name [Custom]: ");
    spreadName = spreadName && spreadName.trim() ? spreadName.trim() : "Custom";
    // Derive spread slots from cards if not explicitly entered
    const slots = Array.from(new Set(cards.map((c) => c.slot).filter(Boolean)));
    const userId = await ask("User ID (optional): ");
    return { question, cards, spread: { name: spreadName, slots }, userId: userId || undefined };
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return; }

  let input;
  if (args.input) {
    const p = path.resolve(process.cwd(), args.input);
    input = JSON.parse(fs.readFileSync(p, "utf8"));
  } else if (args.question || args.cards || args.spread) {
    const question = args.question || "";
    const cards = parseCardsSpec(args.cards);
    const spread = args.spread ? parseSpreadSpec(args.spread) : { name: "Custom", slots: Array.from(new Set(cards.map(c => c.slot).filter(Boolean))) };
    const userId = args.user || args.userId;
    input = { question, cards, spread, userId };
  } else {
    input = await promptInteractive();
  }

  const mode = (args.mode === "invalid" ? "invalid" : "valid");
  const summaryOnly = Boolean(args.summary);
  const backend = (args.backend === "openai") ? "openai" : "stub";

  const clientOpts = backend === "openai"
    ? { apiKey: args.apiKey || process.env.OPENAI_API_KEY, model: args.model || process.env.OPENAI_MODEL }
    : { mode };

  const llm = createClient(backend, clientOpts);
  const usecase = new GenerateReadingUseCase({ llmClient: llm });
  try {
    const result = await usecase.execute(input);
    if (summaryOnly) {
      console.log(result.reading?.summary || "");
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error("[ERROR]", err && err.stack ? err.stack : String(err));
    process.exit(1);
  }
}

main();
