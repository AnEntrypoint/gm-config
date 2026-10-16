-- Business logic loaded at runtime by agentplug-runner's LogicHost.
-- Editing this file changes behaviour with no Rust rebuild.

function predicate_no_synthetic_test_files(input)
  local path = string.lower(input.path or "")
  local is_test = string.find(path, "%.test%.") ~= nil
    or string.find(path, "%.spec%.") ~= nil
    or string.find(path, "/test/", 1, true) ~= nil
    or string.find(path, "/tests/", 1, true) ~= nil
  return { rule = "no-synthetic-test-files", ok = not is_test }
end
