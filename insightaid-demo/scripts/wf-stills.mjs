// Stills for the two workflow videos. Bundles once, then renders the listed
// frames of each composition into ./stills/wf.
//   node scripts/wf-stills.mjs LocalShopWorkflow 60 180 ...
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const [comp, ...frames] = process.argv.slice(2)
const run = (args) => execFileSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' })
mkdirSync('stills/wf', { recursive: true })
if (!process.env.NO_BUNDLE) run(['remotion', 'bundle', 'src/index.ts', '--out-dir=build', '--log=error'])
for (const f of frames) {
  const out = `stills/wf/${comp}_f${String(f).padStart(4, '0')}.png`
  run(['remotion', 'still', 'build', comp, out, `--frame=${f}`, '--gl=angle', '--log=error'])
}
