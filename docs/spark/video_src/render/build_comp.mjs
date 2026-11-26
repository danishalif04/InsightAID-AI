// Fills comp.html from metrics/spark2026.json, the synthetic review data and timeline.json.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const [DIR, REPO, QRTOOL] = process.argv.slice(2)
const QRCode = createRequire(QRTOOL + '/package.json')('qrcode')
const m = JSON.parse(fs.readFileSync(path.join(REPO, 'metrics/spark2026.json'), 'utf8'))
const data = JSON.parse(fs.readFileSync(path.join(REPO, 'src/data/koperasiSiswaMaju.json'), 'utf8'))
const tl = JSON.parse(fs.readFileSync(path.join(DIR, 'timeline.json'), 'utf8'))
const w = m.waste
const pick = (lang, item, from = '2026-11-21') => data.reviews.find(([d, l, , s, it]) => l === lang && s === 'negative' && (!item || it === item) && d >= from)
const FRESH = /basi|stale|not fresh|tak fresh|不新鲜|异味|berbau/i
const negRow = (lang) => data.reviews.find(([, l, , s, , t]) => l === lang && s === 'negative' && FRESH.test(t)) ?? data.reviews.find(([, l, , s]) => l === lang && s === 'negative')
const stars = (row) => '★'.repeat(row[2]) + '<span style="opacity:.22">' + '★'.repeat(5 - row[2]) + '</span>'
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

const DEMO_URL = 'https://insightaid-ai.vercel.app/welcome'
const o1 = m.o1.mainModel
const langs = [['English', 'en'], ['Bahasa Melayu', 'ms'], ['中文 Mandarin', 'zh']].map(([name, k]) => ({ name, acc: +(o1.perLanguage[k].accuracy * 100).toFixed(2), n: o1.perLanguage[k].n }))
const pages = m.o3.responseTime.pages.map((p) => ({ page: p.page, ms: p.medianMs }))
const M = { wasteBefore: w.lastWeekHabit.wasteRM, wasteAfter: w.forecastHabit.wasteRM, pct: w.savingPct, shortBefore: w.lastWeekHabit.stockoutUnits, shortAfter: w.forecastHabit.stockoutUnits, acc: +(o1.accuracy * 100).toFixed(2), langs, pages }

const screenIds = { '7': 'r01', '8': 'r01', '10': 'r02', '11': 'r02', '12': 'r02', '14': 'r03', '15': 'r04', '16': 'r05', '19': 'r06', '22': 'r07' }
const chapterOf = (id) => (+id >= 22 ? '05 <i>·</i> COMMERCIALISATION POTENTIAL' : +id >= 17 ? '04 <i>·</i> IMPACTS' : '03 <i>·</i> SOLUTION')
const screenScenes = Object.keys(screenIds).map((id) => {
  const tag = id === '22' ? '<span class="tag sim">Proposed pricing · real app screen</span>'
    : id === '19' ? '<span class="tag real">Real app screen · real results</span>'
    : '<span class="tag real">Real app screen · synthetic demo data</span>'
  const extra = id === '16' ? `<div id="q16" style="position:absolute;left:0;right:0;top:330px;text-align:center;z-index:6">
      <div class="card" style="position:relative;display:inline-block;padding:50px 70px;max-width:1300px;border-color:rgba(110,231,183,.4)">
        <div class="serif" style="font-size:72px;line-height:1.15;color:#f5d38a">“AI explains the evidence.<br/>The system calculates the results.”</div></div></div>` : ''
  return `<section class="scene" id="sc-${id}"><div class="chapter">${chapterOf(id)}</div><div class="tagbox">${tag}</div>
    <div class="stage3d"><div class="scr"><div class="in"><img /></div></div></div>${extra}</section>`
}).join('\n')

const langBars = langs.map((l, i) => `<div style="display:grid;grid-template-columns:230px 1fr 130px;align-items:center;margin:22px 0;font-size:28px;font-weight:600">
  <div class="${i === 2 ? 'zh' : ''}">${l.name}</div><div class="bar"><i id="lb${i}" style="background:linear-gradient(90deg,#10b981,#22c55e)"></i></div><div id="lv${i}" class="kin" style="text-align:right;font-size:40px">0%</div></div>`).join('')
const rtRows = pages.map((p, i) => `<div class="muted">${esc(p.page)}</div><div class="bar" style="height:14px"><i id="rb${i}" style="background:var(--brand)"></i></div><div style="text-align:right;font-weight:600">${(p.ms / 1000).toFixed(1)} s</div>`).join('')

const maxf = {}
for (const d of fs.readdirSync(path.join(DIR, 'src'))) maxf[d] = fs.readdirSync(path.join(DIR, 'src', d)).length

const fill = {
  STARS_MS: stars(negRow('ms')), STARS_ZH: stars(negRow('zh')), STARS_EN: stars(negRow('en')),
  REV_MS: esc(negRow('ms')[5]), REV_ZH: esc(negRow('zh')[5]), REV_EN: esc(negRow('en')[5]),
  STARS_KZH: stars(pick('zh', 'Karipap')), STARS_KEN: stars(pick('en', 'Karipap')), KAR_ZH: esc(pick('zh', 'Karipap')[5]), KAR_EN: esc(pick('en', 'Karipap')[5]),
  FLAG_CUT: String(w.settings.flagReductionPct), WASTE_DAYS: String(w.settings.replayDays), WASTE_BUFFER: String(w.settings.bufferPct),
  UNITS_BEFORE: String(w.lastWeekHabit.wasteUnits), UNITS_AFTER: String(w.forecastHabit.wasteUnits),
  SHORT_BEFORE: String(w.lastWeekHabit.stockoutUnits), SHORT_AFTER: String(w.forecastHabit.stockoutUnits),
  SALES_ROWS: data.sales.length.toLocaleString('en-US'), REVIEW_ROWS: String(data.reviews.length),
  O1_TARGET: '80', LANG_TARGET: '75', RING_TGT_DEG: String(0.8 * 360), TEST_N: o1.testSamples.toLocaleString('en-US'),
  LANG_BARS: langBars, RT_ROWS: rtRows, RT_PASS: String(m.o3.responseTime.passing), RT_PAGES: String(m.o3.responseTime.pageCount), RT_VERDICT: m.o3.responseTime.verdict,
  RT_NOTE: 'median of 5 runs per page, production build, 25 Nov 2026. A first visit after new data can take longer.',
  MAPE_MET: String(m.o2.mape.metCount), MAPE_N: String(m.o2.mape.protocolCount), MAPE_VERDICT: m.o2.mape.verdict,
  DEMO_URL_SHORT: 'insightaid-ai.vercel.app',
  QR: await QRCode.toString(DEMO_URL, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#050807', light: '#FFFFFF' } }),
  SCREEN_SCENES: screenScenes, TIMELINE: JSON.stringify(tl), MAXF: JSON.stringify(maxf), M: JSON.stringify(M),
}
if (m.o1.verdict !== 'MET' || !o1.targetMet) throw new Error('O1 no longer MET: scene 20 wording must change')
if (m.o3.responseTime.verdict !== 'MET') throw new Error('Response time no longer MET: scene 21 wording must change')
let html = fs.readFileSync(path.join(DIR, 'comp.html'), 'utf8')
for (const [k, v] of Object.entries(fill)) { if (v === undefined || v === '') throw new Error('missing ' + k); html = html.replaceAll(`{{${k}}}`, v) }
const left = html.match(/\{\{[A-Z_0-9]+\}\}/g); if (left) throw new Error('unfilled ' + left)
fs.writeFileSync(path.join(DIR, 'comp.filled.html'), html)
console.log('ok', JSON.stringify(M).slice(0, 200), maxf)
