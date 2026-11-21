// Builds the AIMIX: IID 2026 poster.
//
//   node poster/build/build.mjs          -> poster/index.html, PDF and PNG preview
//
// Every result on the poster is read here from the project's own result
// files, never typed into the template:
//   sentiment  ml/sentiment/results/O1_SCORECARD.md   (original-language rows)
//   forecast   ml/forecasting/results/protocol_summary_a8b3bb637d28.json
// QR codes are generated from poster/links.json. An empty link renders a
// clearly marked "link pending" box instead of a QR, so the poster can never
// point at a wrong address.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'C:/Users/User/FYP/insightaid-ai'
const appRequire = createRequire(ROOT + '/package.json')
const { chromium } = appRequire('@playwright/test')
const QRCode = createRequire(process.env.QRTOOL + '/package.json')('qrcode')

const P = path.join(ROOT, 'poster')

// ------------------------------------------------------------- real numbers
const scorecard = fs.readFileSync(path.join(ROOT, 'ml/sentiment/results/O1_SCORECARD.md'), 'utf8')
const sent = {}
for (const line of scorecard.split('\n')) {
  const m = line.match(/^\| (\w+) \| original_language \| ([\d.]+)% \| ([\d.]+)% \| ([\d.]+)% \| ([\d.]+)% \|/)
  if (m) sent[m[1]] = { overall: +m[2], en: +m[3], ms: +m[4], zh: +m[5] }
}
for (const k of ['tfidf_lr', 'mbert', 'xlmr']) if (!sent[k]) throw new Error('scorecard row missing: ' + k)

const RUN = 'a8b3bb637d28'
const proto = JSON.parse(fs.readFileSync(path.join(ROOT, `ml/forecasting/results/protocol_summary_${RUN}.json`), 'utf8'))
const PROTO_LABEL = { daily_h7: 'Daily · 7-day', daily_h30: 'Daily · 30-day', weekly_h4: 'Weekly · 4-week' }
const MODEL_LABEL = { moving_average: 'Moving avg', arima: 'ARIMA', prophet: 'Prophet', xgboost: 'XGBoost' }
const best = proto.protocols.map((p) => {
  const rows = p.rows.filter((r) => r.variant === 'sales_only' && r.mape != null)
  const b = rows.reduce((a, r) => (r.mape < a.mape ? r : a))
  return { key: p.protocol.name, label: PROTO_LABEL[p.protocol.name] ?? p.protocol.name, mape: b.mape, model: MODEL_LABEL[b.model_type] ?? b.model_type }
})
const order = ['daily_h7', 'daily_h30', 'weekly_h4']
best.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
const dm = proto.sentiment_comparisons ?? []
const dmSignificantWins = dm.filter((c) => c.diebold_mariano?.significant_at_05 && c.diebold_mariano.dm_statistic > 0).length
const metMape = best.filter((b) => b.mape < 15).length

// ------------------------------------------------------------- SVG charts
const C = { emerald: '#22C55E', mint: '#34D399', lime: '#A3E635', gold: '#FBBF24', red: '#EF4444', text: '#E8F0EC', muted: '#8A9A93', grid: 'rgba(255,255,255,0.10)', teal: '#14B8A6' }
const f2 = (n) => n.toFixed(2)

function hbar({ rows, max = 100, target, targetLabel, w = 760, rowH = 62, labelW = 290, unit = '%' }) {
  const h = rows.length * rowH + 50
  const x = (v) => labelW + (v / max) * (w - labelW - 175)
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Inter, sans-serif">`
  rows.forEach((r, i) => {
    const y = i * rowH + 8
    s += `<text x="${labelW - 18}" y="${y + rowH / 2 + 2}" fill="${r.strong ? C.text : C.muted}" font-size="36" font-weight="${r.strong ? 800 : 600}" text-anchor="end" dominant-baseline="middle">${r.label}</text>`
    s += `<rect x="${labelW}" y="${y + 8}" width="${x(r.value) - labelW}" height="${rowH - 20}" rx="10" fill="${r.color}"/>`
    s += `<text x="${x(r.value) + 12}" y="${y + rowH / 2 + 2}" fill="${C.text}" font-size="38" font-weight="800" dominant-baseline="middle">${f2(r.value)}${unit}</text>`
  })
  if (target != null) {
    const tx = x(target)
    s += `<line x1="${tx}" x2="${tx}" y1="0" y2="${rows.length * rowH + 8}" stroke="${C.gold}" stroke-width="3" stroke-dasharray="8 7"/>`
    s += `<text x="${tx}" y="${rows.length * rowH + 40}" fill="${C.gold}" font-size="32" font-weight="700" text-anchor="middle">${targetLabel}</text>`
  }
  return s + '</svg>'
}

const chartModels = hbar({
  rows: [
    { label: 'TF-IDF + LR', value: sent.tfidf_lr.overall, color: 'rgba(138,154,147,0.45)' },
    { label: 'mBERT', value: sent.mbert.overall, color: 'rgba(52,211,153,0.55)' },
    { label: 'XLM-RoBERTa', value: sent.xlmr.overall, color: C.emerald, strong: true },
  ],
  target: 80,
  targetLabel: 'target ≥ 80%',
})
const chartLang = hbar({
  rows: [
    { label: 'English', value: sent.xlmr.en, color: C.mint },
    { label: 'B. Melayu', value: sent.xlmr.ms, color: C.emerald },
    { label: '中文', value: sent.xlmr.zh, color: C.lime },
  ],
  target: 75,
  targetLabel: 'target ≥ 75% each',
})
const chartMape = hbar({
  rows: best.map((b) => ({ label: b.label, value: b.mape, color: b.mape < 15 ? C.emerald : 'rgba(248,113,113,0.6)' })),
  max: 30,
  target: 15,
  targetLabel: 'target < 15%',
  labelW: 320,
})

// ------------------------------------------------------------- QR codes
const links = JSON.parse(fs.readFileSync(path.join(P, 'links.json'), 'utf8'))
async function qr(url, label) {
  if (!url) {
    return `<div class="qr pending"><div class="qr-pending">LINK<br/>PENDING</div></div><div class="qr-label">${label}</div>`
  }
  const svg = await QRCode.toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#052E16', light: '#FFFFFF' } })
  return `<div class="qr">${svg}</div><div class="qr-label">${label}</div>`
}
const qrVideo = await qr(links.video, 'Watch the demo video')
const qrGithub = await qr(links.github, 'Source code · GitHub')
const qrApp = links.app ? await qr(links.app, 'Try the live app') : ''

// ------------------------------------------------------------- fill template
let html = fs.readFileSync(path.join(P, 'build/template.html'), 'utf8')
const fill = {
  CHART_MODELS: chartModels,
  CHART_LANG: chartLang,
  CHART_MAPE: chartMape,
  QR_VIDEO: qrVideo,
  QR_GITHUB: qrGithub,
  QR_APP: qrApp,
  XLMR: f2(sent.xlmr.overall),
  MET_MAPE: String(metMape),
  N_PROTO: String(best.length),
  RUN,
  DM_WINS: String(dmSignificantWins),
  N_DM: String(dm.length),
}
for (const [k, v] of Object.entries(fill)) html = html.replaceAll(`{{${k}}}`, v)
const left = html.match(/\{\{[A-Z_]+\}\}/g)
if (left) throw new Error('unfilled placeholders: ' + left.join(', '))
fs.writeFileSync(path.join(P, 'index.html'), html)
console.log('sentiment', sent.xlmr, '| MAPE best', best.map((b) => `${b.key}=${f2(b.mape)} (${b.model})`).join(', '), '| DM sig. wins', dmSignificantWins, '/', dm.length)

// ------------------------------------------------------------- render
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 2245, height: 3179 }, deviceScaleFactor: 2480 / 2245 })
await page.goto('file:///' + path.join(P, 'index.html').replace(/\\/g, '/'))
await page.waitForLoadState('networkidle')
await page.evaluate(() => document.fonts.ready)
// Fit: scale the whole layout so its natural height fills the frame exactly.
const fit = await page.evaluate(() => {
  const c = document.querySelector('.content')
  const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad'))
  const W = 2245 - 2 * pad, H = 3179 - 2 * pad
  c.style.inset = 'auto'; c.style.left = pad + 'px'; c.style.top = pad + 'px'; c.style.width = W + 'px'; c.style.height = 'auto'
  const natural = c.scrollHeight
  let z = Math.min(1, H / natural)
  for (let i = 0; i < 12; i++) {
    c.style.width = W / z + 'px'
    const nat = c.scrollHeight
    z = Math.min(1, H / nat)
  }
  c.style.width = W / z + 'px'; c.style.zoom = z
  // stretch the last flexible row so the page ends flush
  c.style.height = H / z + 'px'
  return { natural, zoom: +z.toFixed(3) }
})
if (fit.zoom < (process.env.MINZOOM ? +process.env.MINZOOM : 0.75)) throw new Error('content too tall to fit legibly (zoom ' + fit.zoom + '); trim content')
console.log('fit', JSON.stringify(fit))
const over = await page.evaluate(() => {
  const poster = document.querySelector('.poster')
  const out = []
  for (const el of poster.querySelectorAll('section, .card, .row > *')) {
    if (el.scrollHeight > el.clientHeight + 2) out.push(`${el.className || el.tagName} overflows by ${el.scrollHeight - el.clientHeight}px`)
  }
  return { content: document.querySelector('.content').scrollHeight, frame: document.querySelector('.content').clientHeight, out }
})
console.log('layout', JSON.stringify(over))
await page.screenshot({ path: path.join(P, 'insightaid_poster_preview.png'), clip: { x: 0, y: 0, width: 2245, height: 3179 } })
await page.pdf({ path: path.join(P, 'insightaid_poster.pdf'), width: '594mm', height: '841mm', printBackground: true, pageRanges: '1' })
await browser.close()
const mb = (f) => (fs.statSync(path.join(P, f)).size / 1048576).toFixed(2) + ' MB'
console.log('wrote insightaid_poster.pdf', mb('insightaid_poster.pdf'), '| preview', mb('insightaid_poster_preview.png'))
