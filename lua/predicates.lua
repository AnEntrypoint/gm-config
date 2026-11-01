-- Business logic loaded at runtime by agentplug-runner's LogicHost.
-- Editing this file changes behaviour with no Rust rebuild.

local SUITE_DIRS = { test = true, tests = true, __tests__ = true, spec = true }
local STEM_SUFFIXES = { ".test", ".spec", "_test", "_spec" }

function predicate_no_synthetic_test_files(input)
  local path = string.lower((string.gsub(input.path or "", "\\", "/")))
  local name = string.match(path, "([^/]*)$") or ""
  local stem = string.match(name, "^(.*)%.[^.]*$") or name
  local is_test = string.find(path, ".test.", 1, true) ~= nil
    or string.find(path, ".spec.", 1, true) ~= nil
  for _, suffix in ipairs(STEM_SUFFIXES) do
    if stem:sub(-#suffix) == suffix then is_test = true end
  end
  for dir in string.gmatch(path, "([^/]+)/") do
    if SUITE_DIRS[dir] then is_test = true end
  end
  return { rule = "no-synthetic-test-files", ok = not is_test }
end
