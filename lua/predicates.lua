-- Business logic loaded at runtime by agentplug-runner's LogicHost.
-- Editing this file changes behaviour with no Rust rebuild.

local SUITE_DIRS = {
  test = true, tests = true, __tests__ = true,
  fixtures = true, __fixtures__ = true, __mocks__ = true, mocks = true,
}
local NAME_MARKERS = {
  ".test.", ".spec.", "_test.", ".mock.", ".stub.", ".fixture.", "_mock.", "_stub.", "_fixture.",
}

function predicate_no_synthetic_test_files(input)
  local path = string.lower(input.path or "")
  local name = string.match(path, "([^/]*)$") or ""
  local is_test = string.find(name, "^test_") ~= nil
  for _, marker in ipairs(NAME_MARKERS) do
    if string.find(name, marker, 1, true) then is_test = true end
  end
  for dir in string.gmatch(path, "([^/]+)/") do
    if SUITE_DIRS[dir] then is_test = true end
  end
  return { rule = "no-synthetic-test-files", ok = not is_test }
end
