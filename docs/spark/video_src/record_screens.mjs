// Scripted 1080p screen recordings of the real app (production build, demo session).
// One browser context = one anonymous demo user for every clip.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = process.argv[2]
const BASE = 'http://localhost:4173'
fs.mkdirSync(OUT, { recursive: true })

// Visible cursor + click ripple (Playwright recordings have no pointer).
const CURSOR = `
(() => {
  const add = () => {
    if (document.getElementById('__cur')) return
    const c = document.createElement('div'); c.id = '__cur'
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-4px 0 0 -4px;z-index:2147483647;pointer-events:none;transition:transform .08s;'
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#fff" stroke="#062D7B" stroke-width="1.6" stroke-linejoin="round"/></svg>'
    document.body.appendChild(c)
    window.addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px' }, true)
    window.addEventListener('mousedown', (e) => {
      const r = document.createElement('div')
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;border-radius:50%;border:3px solid #22C55E;left:' + (e.clientX - 7) + 'px;top:' + (e.clientY - 7) + 'px;transition:all .45s ease-out;opacity:1'
      document.body.appendChild(r)
      requestAnimationFrame(() => { r.style.transform = 'scale(4)'; r.style.opacity = '0' })
      setTimeout(() => r.remove(), 500)
    }, true)
  }
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add)
})()`

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
})
await context.addInitScript(CURSOR)

let mouse = { x: 960, y: 540 }
async function glide(page, x, y, ms = 700) {
  const steps = Math.max(10, Math.round(ms / 16))
  await page.mouse.move(x, y, { steps })
  mouse = { x, y }
}
async function glideTo(page, locator, ms = 800) {
  const b = await locator.boundingBox()
  await glide(page, b.x + b.width / 2, b.y + b.height / 2, ms)
}
async function smoothScroll(page, dy, ms = 1600) {
  const steps = Math.round(ms / 16)
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps)
    await page.waitForTimeout(16)
  }
}
const pause = (page, ms) => page.waitForTimeout(ms)

async function clip(name, fn) {
  const page = await context.newPage()
  await page.mouse.move(mouse.x, mouse.y)
  await fn(page)
  const video = page.video()
  await page.close()
  const src = await video.path()
  fs.renameSync(src, path.join(OUT, name + '.webm'))
  console.log('recorded', name)
}

// 1. Welcome -> Try demo -> Dashboard (scenes 7 to 9, 18)
await clip('rec_01_welcome_demo', async (page) => {
  await page.goto(BASE + '/welcome'); await page.waitForLoadState('networkidle'); await pause(page, 1500)
  const btn = page.getByRole('button', { name: /Try the demo, no sign up/ }).first()
  await glideTo(page, btn, 1200); await pause(page, 500)
  await btn.click()
  await page.waitForURL((u) => u.pathname === '/', { timeout: 60000 })
  await page.waitForLoadState('networkidle'); await pause(page, 3500)
  await glide(page, 700, 95, 900); await pause(page, 1800)
  await smoothScroll(page, 520, 2200); await pause(page, 3000)
  await smoothScroll(page, 560, 2200); await pause(page, 3500)
})

// 2. Prep & Stock Planner (scenes 10 to 13)
await clip('rec_02_planner', async (page) => {
  await page.goto(BASE + '/prep-planner'); await page.waitForLoadState('networkidle'); await pause(page, 2500)
  await smoothScroll(page, 330, 1500); await pause(page, 1500)
  const karipap = page.getByRole('cell', { name: 'Karipap' }).first()
  await glideTo(page, karipap, 1000); await pause(page, 1200)
  const badge = page.getByText(/Freshness complaint/).first()
  await glideTo(page, badge, 900); await pause(page, 2500)
  await smoothScroll(page, -330, 1200); await pause(page, 800)
  const slider = page.getByLabel('Safety buffer')
  const b = await slider.boundingBox()
  const at = (pct) => b.x + (b.width * pct) / 50
  await glide(page, at(10), b.y + b.height / 2, 900); await pause(page, 400)
  await page.mouse.down()
  for (let v = 10; v <= 20; v += 0.5) { await page.mouse.move(at(v), b.y + b.height / 2); await page.waitForTimeout(40) }
  await page.mouse.up(); await pause(page, 2500)
  await smoothScroll(page, 330, 1500); await pause(page, 3000)
  await smoothScroll(page, 900, 2500); await pause(page, 4000)
})

// 3. Sentiment Analysis (scene 14)
await clip('rec_03_sentiment', async (page) => {
  await page.goto(BASE + '/sentiment'); await page.waitForLoadState('networkidle'); await pause(page, 3000)
  await smoothScroll(page, 500, 2500); await pause(page, 2500)
  await smoothScroll(page, 600, 2500); await pause(page, 3000)
})

// 4. Dashboard sentiment trend + Crisis Detection (scene 15)
await clip('rec_04_trend_crisis', async (page) => {
  await page.goto(BASE + '/'); await page.waitForLoadState('networkidle'); await pause(page, 2000)
  await smoothScroll(page, 650, 2000); await pause(page, 3500)
  await page.goto(BASE + '/crisis-detection'); await page.waitForLoadState('networkidle'); await pause(page, 3000)
  await smoothScroll(page, 500, 2500); await pause(page, 3000)
})

// 5. AI Recommendations (scene 16). First visit waits for the AI wording.
await clip('rec_05_recommendations', async (page) => {
  await page.goto(BASE + '/recommendations'); await page.waitForLoadState('networkidle'); await pause(page, 4000)
  await smoothScroll(page, 500, 2500); await pause(page, 3500)
})

// 6. Model & Evidence (scenes 19 to 21)
await clip('rec_06_evidence', async (page) => {
  await page.goto(BASE + '/model-evidence'); await page.waitForLoadState('networkidle'); await pause(page, 2500)
  for (let i = 0; i < 6; i++) { await smoothScroll(page, 600, 2200); await pause(page, 1800) }
})

// 7. Pricing on the Welcome page (scene 22)
await clip('rec_07_pricing', async (page) => {
  await page.goto(BASE + '/welcome#pricing'); await page.waitForLoadState('networkidle'); await pause(page, 1000)
  await page.locator('#pricing').scrollIntoViewIfNeeded(); await pause(page, 4500)
})

await context.close()
await browser.close()
