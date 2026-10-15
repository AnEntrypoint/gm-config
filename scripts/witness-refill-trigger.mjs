import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const gmRoot = resolve(here, "..", "..");
const proseTarget = process.argv[2] ?? join(here, "..", "prose", "entry.md");
const rustTarget = process.argv[3]
  ?? join(gmRoot, "rs-plugkit", "crates", "plugkit-core", "src", "orchestrator", "instructions", "mod.rs");

const proseLines = readFileSync(proseTarget, "utf8").replace(/\r\n/g, "\n").split("\n");
const heading = "## Parallel slots (standing rules)";
const start = proseLines.indexOf(heading);
let end = proseLines.length;
for (let i = start + 1; start >= 0 && i < proseLines.length; i++) {
  if (proseLines[i].startsWith("## ")) { end = i; break; }
}
const section = start < 0 ? "" : proseLines.slice(start, end).join("\n").replace(/`/g, "");

const rust = readFileSync(rustTarget, "utf8").replace(/\r\n/g, "\n");
const fnAt = rust.indexOf("pub(crate) fn concurrency_shortfall(");
let fnBody = "";
if (fnAt >= 0) {
  let depth = 0;
  for (let i = rust.indexOf("{", fnAt); i < rust.length; i++) {
    if (rust[i] === "{") depth++;
    else if (rust[i] === "}" && --depth === 0) { fnBody = rust.slice(fnAt, i + 1); break; }
  }
}

const checks = [
  ["prose-section-present", start >= 0],
  ["refill-trigger-named", /A host completion notice is the refill trigger/.test(section)],
  ["launch-list-is-the-trigger-payload", /launch every node-only row id in its concurrency_shortfall\.launch list/.test(section)],
  ["informational-rule-absent", !/completion notifications are informational/.test(section) && !/informational, not a trigger/.test(section)],
  ["wait-fallback-measured", /The wait fallback is measured/.test(section)],
  ["distribution-samples-recorded", /admission_waited_ms over 13 admitted dispatches/.test(section) && /n=13, values 0 x7, 1413, 4050, 27793, 48256, 48465, 82659/.test(section)],
  ["distribution-stats-recorded", /median 0 ms, p90 48465 ms, max 82659 ms/.test(section)],
  ["starved-dispatches-recorded", /dispatch_starved_waiting_for_admission, re_dispatch_safe: true/.test(section)],
  ["rust-function-present", fnAt >= 0 && fnBody.length > 0],
  ["rust-signature-takes-candidates", /candidates: &\[String\]/.test(fnBody)],
  ["rust-emits-launch-list", /"launch":\s*launch\b/.test(fnBody)],
  ["rust-launch-bounded-by-shortfall", /\.take\(shortfall\.min\(LAUNCH_LIST_MAX\)\)/.test(fnBody)],
  ["rust-launch-list-capped", /const LAUNCH_LIST_MAX: usize = 32;/.test(rust)],
  ["rust-call-site-passes-candidates", /concurrency_shortfall\(subagents_running,\s*prd_pending,\s*&launch_candidates\)/.test(rust)],
];
const missing = checks.filter(([, ok]) => !ok).map(([id]) => id);
if (missing.length > 0) {
  console.log(`RESULT: FAIL missing=${missing.join(",")} prose=${proseTarget} rust=${rustTarget}`);
  process.exitCode = 1;
} else {
  console.log(`RESULT: PASS checks=${checks.length} prose=${proseTarget} rust=${rustTarget}`);
  process.exitCode = 0;
}
