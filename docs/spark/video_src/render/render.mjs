// Deterministic frame render: renderFrame(t) for each frame, JPEG screenshots piped into ffmpeg.
// Usage: node render.mjs <repo> <comp.filled.html> <ffmpeg> <fromFrame> <toFrame> <out.mp4|dir-for-stills> [--stills t1,t2,...]
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const [REPO, COMP, FF, FROM, TO, OUT, mode, list] = process.argv.slice(2)
const { chromium } = createRequire(REPO + '/package.json')('@playwright/test')
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
page.on('pageerror', (e) => { console.error('PAGEERROR', e.message); process.exitCode = 2 })
await page.goto('file:///' + COMP.replace(/\\/g, '/'))
await page.waitForLoadState('networkidle')
await page.evaluate(() => window.ready)

if (mode === '--stills') {
  fs.mkdirSync(OUT, { recursive: true })
  for (const t of list.split(',').map(Number)) {
    await page.evaluate((t) => window.renderFrame(t), t)
    await page.screenshot({ path: path.join(OUT, `t${String(t.toFixed(2)).padStart(7, '0')}.jpg`), type: 'jpeg', quality: 88 })
  }
  await browser.close(); process.exit()
}

const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30', OUT], { stdio: ['pipe', 'inherit', 'inherit'] })
const t0 = Date.now()
for (let f = +FROM; f < +TO; f++) {
  await page.evaluate((t) => window.renderFrame(t), f / 30)
  const buf = await page.screenshot({ type: 'jpeg', quality: 93 })
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r))
  if ((f - FROM) % 150 === 0) console.log(path.basename(OUT), f, `${((Date.now() - t0) / 1000).toFixed(0)}s`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
await browser.close()
console.log('done', OUT, `${((Date.now() - t0) / 1000).toFixed(0)}s`)
