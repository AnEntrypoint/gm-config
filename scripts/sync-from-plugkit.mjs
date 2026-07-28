#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MATERIALIZE_VERB = 'fsm-vendor'
const MATERIALIZE_TASK = '1'
const MATERIALIZE_TIMEOUT_MS = 300000
const MATERIALIZE_POLL_MS = 2000
const SPOOL_LAUNCHER = ['bun', 'x', 'gm-plugkit@latest', 'spool']
const RS_PLUGKIT_PROSE_SUBPATH = 'crates/plugkit-core/src/orchestrator/instructions/prose'

function fail (message) {
  console.error(`sync-from-plugkit: ${message}`)
  process.exit(1)
}

function parseArgs (argv) {
  const options = { check: false, materialized: null, rsPlugkit: null }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--check') options.check = true
    else if (arg === '--materialized') options.materialized = argv[++i]
    else if (arg === '--rs-plugkit') options.rsPlugkit = argv[++i]
    else fail(`unrecognised argument ${arg}`)
  }
  if (!options.rsPlugkit && process.env.RS_PLUGKIT_DIR) options.rsPlugkit = process.env.RS_PLUGKIT_DIR
  return options
}

function readJson (path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
}

function loadRepoShape () {
  const config = readJson(join(REPO_ROOT, 'gm.config.json'))
  const instructions = config.instructions ?? {}
  const messages = config.messages ?? {}
  const fsm = config.fsm ?? {}
  const proseKeys = instructions.keys
  if (!Array.isArray(proseKeys) || proseKeys.length === 0) {
    fail('gm.config.json declares no instructions.keys, so there is nothing to snapshot')
  }
  return {
    proseKeys,
    proseDir: instructions.dir ?? 'prose',
    gatesDir: messages.gates_dir ?? 'gates',
    residualDir: messages.residual_dir ?? 'residual',
    graphPath: fsm.graph ?? 'fsm/graph.json',
    predicatesPath: fsm.predicates_reference ?? 'fsm/predicates.md',
    hooksDir: fsm.hooks_dir ?? 'hooks'
  }
}

function materializeCompiledDefaults () {
  const workdir = mkdtempSync(join(tmpdir(), 'gm-config-sync-'))
  const launcher = spawnSync(SPOOL_LAUNCHER[0], SPOOL_LAUNCHER.slice(1), {
    cwd: workdir,
    encoding: 'utf8',
    timeout: MATERIALIZE_TIMEOUT_MS
  })
  if (launcher.error) fail(`could not start the plugkit spool: ${launcher.error.message}`)

  const inPath = join(workdir, '.gm', 'exec-spool', 'in', MATERIALIZE_VERB, `${MATERIALIZE_TASK}.txt`)
  mkdirSync(dirname(inPath), { recursive: true })
  writeFileSync(inPath, JSON.stringify({ force: true }), 'utf8')

  const outPath = join(workdir, '.gm', 'exec-spool', 'out', `${MATERIALIZE_VERB}-${MATERIALIZE_TASK}.json`)
  const deadline = Date.now() + MATERIALIZE_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (existsSync(outPath)) {
      const response = readJson(outPath)
      if (response.ok === false) fail(`${MATERIALIZE_VERB} refused: ${response.error ?? 'no reason given'}`)
      return join(workdir, '.gm', 'instructions')
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, MATERIALIZE_POLL_MS)
  }
  fail(`${MATERIALIZE_VERB} produced no response within ${MATERIALIZE_TIMEOUT_MS}ms; the compiled defaults were never materialized`)
}

function markdownFilesIn (dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(name => name.endsWith('.md')).sort()
}

function filesIn (dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).sort()
}

function undeclaredProseKeys (instructionsRoot, shape) {
  const declared = new Set(shape.proseKeys)
  return markdownFilesIn(instructionsRoot)
    .map(name => name.slice(0, -'.md'.length))
    .filter(key => !declared.has(key))
}

function planSnapshot (instructionsRoot, shape) {
  const planned = []
  const missing = []

  const record = (sourcePath, repoRelPath) => {
    if (!existsSync(sourcePath)) {
      missing.push(`${repoRelPath} (expected compiled default at ${sourcePath})`)
      return
    }
    planned.push({ repoRelPath, content: readFileSync(sourcePath, 'utf8') })
  }

  for (const key of shape.proseKeys) {
    record(join(instructionsRoot, `${key}.md`), join(shape.proseDir, `${key}.md`))
  }
  for (const name of markdownFilesIn(join(instructionsRoot, 'gates'))) {
    record(join(instructionsRoot, 'gates', name), join(shape.gatesDir, name))
  }
  for (const name of markdownFilesIn(join(instructionsRoot, 'residual'))) {
    record(join(instructionsRoot, 'residual', name), join(shape.residualDir, name))
  }
  for (const name of filesIn(join(instructionsRoot, 'hooks'))) {
    record(join(instructionsRoot, 'hooks', name), join(shape.hooksDir, name))
  }
  record(join(instructionsRoot, 'fsm', 'graph.json'), shape.graphPath)
  record(join(instructionsRoot, 'fsm', 'predicates.md'), shape.predicatesPath)

  if (missing.length > 0) {
    fail(`the materialized compiled defaults are incomplete, so nothing was written:\n  ${missing.join('\n  ')}`)
  }
  if (planned.length === 0) fail('planned an empty snapshot, which can never be correct')
  return planned
}

function crossCheckAgainstSource (instructionsRoot, shape, rsPlugkitDir) {
  const proseSource = join(rsPlugkitDir, RS_PLUGKIT_PROSE_SUBPATH)
  if (!existsSync(proseSource)) {
    fail(`--rs-plugkit ${rsPlugkitDir} has no ${RS_PLUGKIT_PROSE_SUBPATH}, so it is not an rs-plugkit checkout`)
  }
  const divergent = []
  for (const key of shape.proseKeys) {
    const sourcePath = join(proseSource, `${key}.md`)
    const compiledPath = join(instructionsRoot, `${key}.md`)
    if (!existsSync(sourcePath)) continue
    if (readFileSync(sourcePath, 'utf8') !== readFileSync(compiledPath, 'utf8')) divergent.push(key)
  }
  return divergent
}

function applySnapshot (planned, checkOnly) {
  const changed = []
  for (const entry of planned) {
    const absolutePath = join(REPO_ROOT, entry.repoRelPath)
    const current = existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : null
    if (current === entry.content) continue
    changed.push(entry.repoRelPath)
    if (checkOnly) continue
    mkdirSync(dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, entry.content, 'utf8')
  }
  return changed
}

function untrackedSnapshotFiles (planned, shape) {
  const produced = new Set(planned.map(entry => entry.repoRelPath.split(/[\\/]/).join('/')))
  const orphans = []
  for (const dir of [shape.proseDir, shape.gatesDir, shape.residualDir, shape.hooksDir]) {
    for (const name of filesIn(join(REPO_ROOT, dir))) {
      const relPath = `${dir}/${name}`
      if (!produced.has(relPath)) orphans.push(relPath)
    }
  }
  return orphans
}

const options = parseArgs(process.argv.slice(2))
const shape = loadRepoShape()
const instructionsRoot = options.materialized
  ? resolve(options.materialized)
  : materializeCompiledDefaults()

if (!existsSync(instructionsRoot)) fail(`no materialized instructions directory at ${instructionsRoot}`)

const unclaimed = undeclaredProseKeys(instructionsRoot, shape)
if (unclaimed.length > 0) {
  fail(
    `the compiled defaults carry prose key(s) gm.config.json does not declare: ${unclaimed.join(', ')}. ` +
    'Add them to instructions.keys so they enter the snapshot; leaving them undeclared would drop them ' +
    'silently while every run still reported the snapshot level.'
  )
}

const planned = planSnapshot(instructionsRoot, shape)

if (options.rsPlugkit) {
  const divergent = crossCheckAgainstSource(instructionsRoot, shape, resolve(options.rsPlugkit))
  if (divergent.length > 0) {
    fail(
      'the compiled defaults being snapshotted disagree with the rs-plugkit checkout for: ' +
      `${divergent.join(', ')}. The published plugkit build is behind rs-plugkit HEAD, so this snapshot ` +
      'would record stale text as authoritative. Wait for the cascade to publish, then re-run.'
    )
  }
  console.log(`cross-check: all ${shape.proseKeys.length} prose keys match the rs-plugkit checkout`)
}

const changed = applySnapshot(planned, options.check)
const orphans = untrackedSnapshotFiles(planned, shape)

console.log(`snapshot artifacts: ${planned.length}`)
for (const orphan of orphans) console.log(`orphan (present in repo, not produced by the compiled defaults): ${orphan}`)

if (changed.length === 0) {
  console.log('snapshot is level with the compiled defaults')
  process.exit(0)
}

for (const path of changed) console.log(`${options.check ? 'drifted' : 'updated'}: ${path}`)

if (options.check) {
  console.error(`sync-from-plugkit: ${changed.length} snapshot file(s) drifted from the compiled defaults`)
  process.exit(1)
}
