// Fills stills.html from metrics/spark2026.json and the synthetic review data, then renders each 1920x1080 frame.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const [STAGE, REPO, QRTOOL, OUT] = process.argv.slice(2)
const appRequire = createRequire(REPO + '/package.json')
const { chromium } = appRequire('@playwright/test')
const QRCode = createRequire(QRTOOL + '/package.json')('qrcode')

const m = JSON.parse(fs.readFileSync(path.join(REPO, 'metrics/spark2026.json'), 'utf8'))
const data = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/koperasiSiswaMaju.json'), 'utf8'))
const w = m.waste
const pick = (lang, item, from = '2026-11-21') => data.reviews.find(([d, l, , s, it]) => l === lang && s === 'negative' && (!item || it === item) && d >= from)?.[5]
const FRESH = /basi|stale|not fresh|tak fresh|不新鲜|异味|berbau/i
const negRow = (lang) => data.reviews.find(([, l, , s, , t]) => l === lang && s === 'negative' && FRESH.test(t)) ?? data.reviews.find(([, l, , s]) => l === lang && s === 'negative')
const karRow = (lang) => data.reviews.find(([d, l, , s, it]) => l === lang && s === 'negative' && it === 'Karipap' && d >= '2026-11-21')
const stars = (row) => '★'.repeat(row[2]) + '☆'.repeat(5 - row[2])
const anyNeg = (lang) => negRow(lang)?.[5]

const fill = {
  WASTE_BEFORE: w.lastWeekHabit.wasteRM.toFixed(2), WASTE_AFTER: w.forecastHabit.wasteRM.toFixed(2),
  UNITS_BEFORE: String(w.lastWeekHabit.wasteUnits), UNITS_AFTER: String(w.forecastHabit.wasteUnits),
  WASTE_PCT: w.savingPct.toFixed(1), SHORT_BEFORE: String(w.lastWeekHabit.stockoutUnits), SHORT_AFTER: String(w.forecastHabit.stockoutUnits),
  WASTE_DAYS: String(w.settings.replayDays), WASTE_BUFFER: String(w.settings.bufferPct),
  KAR_ZH: pick('zh', 'Karipap'), KAR_EN: pick('en', 'Karipap'),
  REV_MS: anyNeg('ms'), REV_ZH: anyNeg('zh'), REV_EN: anyNeg('en'),
  STARS_MS: stars(negRow('ms')), STARS_ZH: stars(negRow('zh')), STARS_EN: stars(negRow('en')), STARS_KZH: stars(karRow('zh')), STARS_KEN: stars(karRow('en')),
  QR: await QRCode.toString('https://insightaid-ai.vercel.app/welcome', { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#050807', light: '#FFFFFF' } }),
}
let html = fs.readFileSync(path.join(STAGE, 'stills.html'), 'utf8')
for (const [k, v] of Object.entries(fill)) { if (!v) throw new Error('missing ' + k); html = html.replaceAll(`{{${k}}}`, v) }
const left = html.match(/\{\{[A-Z_]+\}\}/g); if (left) throw new Error('unfilled ' + left)
fs.writeFileSync(path.join(STAGE, 'stills.filled.html'), html)

fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
await page.goto('file:///' + path.join(STAGE, 'stills.filled.html').replace(/\\/g, '/'))
await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready)
const names = { s1: '01_introduction', s2: '02_title', s3: '03_problem', s4: '04_solution_planner', s5: '05_impacts_waste', s6: '06_end_card' }
for (const [id, name] of Object.entries(names)) {
  await page.locator('#' + id).screenshot({ path: path.join(OUT, `still_${name}.png`) })
  console.log('still', name)
}
await browser.close()
