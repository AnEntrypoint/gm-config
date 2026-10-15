import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ?? join(here, "..", "prose", "entry.md");
const lines = readFileSync(target, "utf8").replace(/\r\n/g, "\n").split("\n");

const heading = "## Parallel slots (standing rules)";
const start = lines.indexOf(heading);
if (start < 0) {
  console.log(`RESULT: FAIL reason=section-heading-missing path=${target}`);
  process.exitCode = 1;
} else {
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) { end = i; break; }
  }
  const section = lines.slice(start, end).join("\n").replace(/`/g, "");
  const checks = [
    ["replaced-same-turn-from-candidates", /A declined or colliding successor is replaced in the same turn by the next eligible row from slots\.candidates/],
    ["decline-never-leaves-slot-empty", /a decline never leaves a slot empty/],
    ["live-count-read-after-refill", /The live count is read after that refill, not before it/],
    ["reason-one-clause", /because a count taken first still counts the freed slot as held/],
  ];
  const missing = checks.filter(([, re]) => !re.test(section)).map(([id]) => id);
  if (missing.length > 0) {
    console.log(`RESULT: FAIL missing=${missing.join(",")} path=${target}`);
    process.exitCode = 1;
  } else {
    console.log(`RESULT: PASS checks=${checks.length} path=${target}`);
    process.exitCode = 0;
  }
}
