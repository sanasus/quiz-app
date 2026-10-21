// Fails when the production bundle outgrows bundle-budget.json, and when
// lucide-react / motion are imported in a way that defeats tree-shaking.
// Run after `npm run build`:  npm run size
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const KIB = 1024
const budget = JSON.parse(readFileSync('bundle-budget.json', 'utf8'))
const assets = 'dist/assets'

const gzipKib = (file) => gzipSync(readFileSync(join(assets, file))).length / KIB

let files
try {
  files = readdirSync(assets)
} catch {
  console.error('dist/assets not found - run `npm run build` first')
  process.exit(1)
}

const js = files.filter((f) => f.endsWith('.js'))
const css = files.filter((f) => f.endsWith('.css'))
const failures = []
const rows = []

function check(label, size, limit) {
  const ok = size <= limit
  rows.push({ label, size: size.toFixed(1), limit, ok })
  if (!ok) failures.push(`${label}: ${size.toFixed(1)} KiB > ${limit} KiB`)
}

// The entry is the chunk the HTML loads first: Vite names it index-<hash>.js.
const entry = js.filter((f) => /^index-.*\.js$/.test(f))
if (entry.length !== 1) {
  failures.push(`expected exactly one entry chunk, found ${entry.length}`)
} else {
  check(`entry ${entry[0]}`, gzipKib(entry[0]), budget.entry)
}
for (const file of js) {
  if (entry.includes(file)) continue
  check(`chunk ${file}`, gzipKib(file), budget.chunk)
}
check('total JS', js.reduce((sum, f) => sum + gzipKib(f), 0), budget.totalJs)
check('total CSS', css.reduce((sum, f) => sum + gzipKib(f), 0), budget.css)

// Only the biggest rows are worth printing.
for (const r of rows.sort((a, b) => b.size - a.size).slice(0, 8)) {
  console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.size.padStart(7)} / ${String(r.limit).padStart(3)} KiB  ${r.label}`)
}

// Tree-shaking guard: named imports only.
function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sources(path)
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path
  }
}
const barrel = /import\s+(\*\s+as\s+\w+|\w+)\s+from\s+['"](lucide-react|motion(\/react)?)['"]/
for (const file of sources('src')) {
  const hit = readFileSync(file, 'utf8').split('\n').find((line) => barrel.test(line))
  if (hit) failures.push(`${file}: namespace/default import defeats tree-shaking: ${hit.trim()}`)
}

if (failures.length > 0) {
  console.error(`\nBundle budget exceeded:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('\nBundle budget OK')
