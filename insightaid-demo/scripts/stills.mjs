// Renders one still at the midpoint of every scene into ./stills, for review
// before the full render. Bundles ONCE, then renders every still from that
// bundle - re-bundling per still costs about a minute each.
//
// Scene boundaries are read from content.ts's VO table, so this script never
// carries its own copy of the timing.
//
//   node scripts/stills.mjs        all 13
//   node scripts/stills.mjs 7      just scene 7
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/data/content.ts', import.meta.url), 'utf8')
const scenes = [...src.matchAll(/scene:\s*(\d+),\s*from:\s*(\d+),\s*to:\s*(\d+)/g)].map((m) => ({
  n: Number(m[1]),
  from: Number(m[2]),
  to: Number(m[3]),
}))

const only = process.argv[2] ? Number(process.argv[2]) : null
const run = (args) => execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })

mkdirSync('stills', { recursive: true })
console.log('bundling once...')
run(['remotion', 'bundle', 'src/index.ts', '--out-dir=build', '--log=error'])

for (const s of scenes) {
  if (only && s.n !== only) continue
  const frame = Math.round((s.from + s.to) / 2)
  const out = `stills/s${String(s.n).padStart(2, '0')}_f${frame}.png`
  console.log(`scene ${s.n} -> frame ${frame} -> ${out}`)
  run(['remotion', 'still', 'build', 'InsightAidDemo', out, `--frame=${frame}`, '--gl=angle', '--log=error'])
}
console.log('done')
