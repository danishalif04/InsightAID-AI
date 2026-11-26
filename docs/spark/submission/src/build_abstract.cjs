// Builds the ISPARK 2026 extended abstract (.docx) in the organiser's template format.
// Figures are read from metrics/spark2026.json so the text cannot drift from the results.
// Usage (repo root): node docs/spark/submission/src/build_abstract.cjs
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, BorderStyle, ShadingType, LevelFormat, VerticalAlign,
} = require('docx')

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'docs/spark/submission')
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'metrics/spark2026.json'), 'utf8'))
const kop = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/koperasiSiswaMaju.json'), 'utf8'))
const o1 = m.o1.mainModel, w = m.waste, rt = m.o3.responseTime, cr = m.o3.crisis.schemes.scheme_b_classified
const pct = (x) => (x * 100).toFixed(2) + '%'
const transl = m.o1.models.find((r) => r.model === 'xlmr' && r.evalPath === 'translate_to_english')
const bestMape = Math.min(...m.o2.mape.protocols.flatMap((p) => p.rows.map((r) => r.mape)))
const medians = rt.pages.map((p) => p.medianMs / 1000)
const rm = (x) => 'RM ' + x.toFixed(2)
if (m.o1.verdict !== 'MET' || rt.verdict !== 'MET' || m.o2.mape.verdict !== 'PARTIAL' || m.o2.sentiment.verdict !== 'NOT MET') throw new Error('Verdicts changed: review the wording first')

const F = 'Times New Roman'
const SZ = 24 // 12 pt
const LINE = 276 // 1.15
const t = (text, o = {}) => new TextRun({ text, font: F, size: SZ, ...o })
// rich text: **bold** and *italic*
function rich(s, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, mm
  while ((mm = re.exec(s))) {
    if (mm.index > last) out.push(t(s.slice(last, mm.index), base))
    const v = mm[0]
    out.push(v.startsWith('**') ? t(v.slice(2, -2), { ...base, bold: true }) : t(v.slice(1, -1), { ...base, italics: true }))
    last = mm.index + v.length
  }
  if (last < s.length) out.push(t(s.slice(last), base))
  return out
}
const P = (s, o = {}) => new Paragraph({ children: rich(s, o.run), alignment: o.align ?? AlignmentType.JUSTIFIED, spacing: { line: LINE, after: o.after ?? 120, before: o.before ?? 0 }, keepNext: o.keepNext })
const H = (s) => new Paragraph({ children: [t(s, { bold: true })], spacing: { line: LINE, before: 200, after: 100 }, keepNext: true })
const C = (s, o = {}) => P(s, { align: AlignmentType.CENTER, after: o.after ?? 0, run: o.run })
const bullet = (s) => new Paragraph({ children: rich(s), numbering: { reference: 'bul', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE, after: 60 } })
const num = (s) => new Paragraph({ children: rich(s), numbering: { reference: 'num', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE, after: 60 } })
const caption = (s, keepNext = false) => new Paragraph({ children: rich(s, { size: 22 }), alignment: AlignmentType.CENTER, keepNext, spacing: { line: LINE, before: 60, after: keepNext ? 80 : 160 } })
const img = (file, widthPx, type) => {
  const data = fs.readFileSync(path.join(OUT, 'src', file))
  const [wpx, hpx] = file.endsWith('.png') ? [data.readUInt32BE(16), data.readUInt32BE(20)] : [2560, 760]
  return new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 0 },
    children: [new ImageRun({ type, data, transformation: { width: widthPx, height: Math.round(widthPx * hpx / wpx) }, altText: { title: file, description: file, name: file } })] })
}
fs.copyFileSync(path.join(ROOT, 'poster/assets/s-planner-flag.jpg'), path.join(OUT, 'src/fig2_planner.jpg'))

// ---------- table 1 ----------
const TW = 9026 // A4 text width at 2.54 cm margins (DXA)
const cols = [2450, 1900, 3376, 1300]
const border = { style: BorderStyle.SINGLE, size: 4, color: '808080' }
const borders = { top: border, bottom: border, left: border, right: border }
const cell = (s, i, head = false, fill) => new TableCell({
  width: { size: cols[i], type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
  shading: head ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  margins: { top: 50, bottom: 50, left: 90, right: 90 },
  children: [new Paragraph({ children: rich(s, { size: 20, bold: head }), spacing: { line: 240 } })],
})
const rows = [
  ['Indicator', 'Target (fixed in advance)', 'Result', 'Status'],
  ['Sentiment accuracy, XLM-RoBERTa', '≥ 80% overall, ≥ 75% per language', `${pct(o1.accuracy)} overall; EN ${pct(o1.perLanguage.en.accuracy)}, BM ${pct(o1.perLanguage.ms.accuracy)}, ZH ${pct(o1.perLanguage.zh.accuracy)}; ${o1.testSamples.toLocaleString('en-US')} test comments`, 'Met'],
  ['Forecast error (MAPE, rolling origin)', '< 15%', `Met in ${m.o2.mape.metCount} of ${m.o2.mape.protocolCount} protocols (best ${bestMape.toFixed(2)}%)`, 'Partly met'],
  ['Sentiment-enhanced vs sales-only forecast', 'Significant gain (Diebold-Mariano p < 0.05)', `${m.o2.sentiment.significantImprovements} of ${m.o2.sentiment.comparisons} comparisons significant (p ${m.o2.sentiment.pMin.toFixed(2)} to ${m.o2.sentiment.pMax.toFixed(2)})`, 'Not met'],
  ['Crisis detection (simulated)', 'Correct alerts', `Precision ${cr.precision.toFixed(2)}, recall ${cr.recall.toFixed(2)} on ${cr.scenarios} crises and ${cr.controls} control spikes; alert ${Math.abs(cr.meanLeadTimeDays).toFixed(1)} days after the sales drop on average`, 'Met, with lag'],
  ['Response time', '< 3 s on every page', `${rt.passing} of ${rt.pageCount} pages; medians ${Math.min(...medians).toFixed(1)} to ${Math.max(...medians).toFixed(1)} s`, 'Met'],
  ['Food waste, 28-day replay', 'Reduction', `${rm(w.lastWeekHabit.wasteRM)} → ${rm(w.forecastHabit.wasteRM)} (${w.savingPct}% less); units short ${w.lastWeekHabit.stockoutUnits} → ${w.forecastHabit.stockoutUnits}`, 'Simulated, synthetic data'],
]
const fills = { 'Met': 'E2EFDA', 'Partly met': 'FFF2CC', 'Not met': 'FCE4D6', 'Met, with lag': 'E2EFDA', 'Simulated, synthetic data': 'FFF2CC' }
const table = new Table({
  width: { size: TW, type: WidthType.DXA }, columnWidths: cols,
  rows: rows.map((r, ri) => new TableRow({ tableHeader: ri === 0, cantSplit: true, children: r.map((s, ci) => cell(s, ci, ri === 0, ci === 3 && ri > 0 ? fills[s] : undefined)) })),
})

// ---------- text ----------
const abstract = `Campus cooperatives and small food outlets in Malaysia decide every morning how much food to prepare, yet the evidence they need sits in two disconnected places: sales records, and customer reviews written in Bahasa Melayu, English, Mandarin and code-mixed text. Commercial business intelligence tools are costly, rarely handle Malaysian languages, and leave owners reacting after waste or complaints occur. INSIGHTAID AI is a web-based decision support system that combines sales history with multilingual customer opinion and turns both into explainable daily actions. Its Prep & Stock Planner recommends tomorrow's quantity for each item, shows the reason behind every number, and reduces the batch of items that recent reviews call stale. The system was developed using Design Science Research, with CRISP-DM for the analytics modules, on React, Supabase and open-source models running on free-tier cloud. Acceptance targets were fixed before development. A fine-tuned XLM-RoBERTa model reached ${pct(o1.accuracy)} accuracy on ${o1.testSamples.toLocaleString('en-US')} held-out comments, above 75% in each language, and all ${rt.pageCount} analysis pages loaded in under three seconds. In a ${w.settings.replayDays}-day replay on a synthetic cooperative dataset, forecast-based ordering reduced simulated waste by ${w.savingPct}% (${rm(w.lastWeekHabit.wasteRM)} to ${rm(w.forecastHabit.wasteRM)}), with more stock-outs as a reported trade-off. The forecasting target was met in ${m.o2.mape.metCount} of ${m.o2.mape.protocolCount} protocols, and adding sentiment did not significantly improve forecasts. The novelty lies in linking multilingual review evidence directly to prep quantities through transparent rules. A freemium model and a planned 2027 cooperative pilot support commercialisation.`

const children = [
  C('**INSIGHTAID AI: An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups**', { run: { size: 28 }, after: 160 }),
  C('**Author(s):** Muhammad Danish Alif Bin Azrul¹'),
  C('**Affiliation(s):** ¹Department of Computing, Universiti Teknologi PETRONAS, Malaysia'),
  C('**Corresponding Author:** muhammad_22006390@utp.edu.my', { after: 240 }),
  C('**ABSTRACT**', { after: 120 }),
  P(abstract),
  P('**Keywords:** Innovation; Technology; Sustainability; Commercialisation; Multilingual Sentiment Analysis; Decision Support System; Food Waste; Cooperatives', { after: 160, align: AlignmentType.LEFT }),

  H('1. INTRODUCTION AND PROBLEM STATEMENT'),
  P('Cooperatives (koperasi) run cafés and mini marts on many Malaysian campuses, and small food businesses such as kedai runcit and kopitiam face the same daily question: how much of each item to prepare. Over-preparation becomes food waste and lost margin; under-preparation means sold-out items and disappointed customers. At the same time, customers describe quality problems in reviews and social posts written in Bahasa Melayu, English, Mandarin and mixed BM-English, for example a complaint that a karipap was “basi” (stale).'),
  P('Three gaps motivated this innovation. First, **affordability**: business intelligence platforms are priced for larger firms. Second, **language**: many sentiment tools are built for English, and translating Malay or Chinese text loses meaning. Third, **actionability**: dashboards report what happened but rarely turn feedback into a decision before the next day’s preparation. Small operators therefore read multilingual feedback manually and estimate quantities by habit, reacting only after waste or complaints occur. INSIGHTAID AI closes this gap with an affordable, multilingual and explainable decision support system.'),

  H('2. OBJECTIVES OF THE INNOVATION'),
  num('To develop a multilingual sentiment model (XLM-RoBERTa) that classifies customer opinion in Bahasa Melayu, English and Mandarin with at least 80% overall accuracy and at least 75% in each language.'),
  num('To evaluate whether adding customer sentiment to a sales forecast (Prophet) improves accuracy over a sales-only forecast, against a target error (MAPE) below 15%.'),
  num('To build and evaluate an integrated, explainable decision support system (crisis detection, rule-based recommendations and a Prep & Stock Planner) that responds in under three seconds and helps reduce food waste.'),
  num('To explore its commercialisation and scalability potential for cooperatives and small food businesses.'),

  H('3. INNOVATION DESCRIPTION AND NOVELTY'),
  P('INSIGHTAID AI is a web application organised in five layers (Figure 1): data collection (POS sales, Google and Shopee reviews and social posts, uploaded as CSV), data processing (validation, cleaning, language detection and feature extraction), storage (PostgreSQL on Supabase with row-level security), an analytics engine, and a decision dashboard.'),
  img('fig1_architecture.png', 600, 'png'),
  caption('**Figure 1.** System architecture of INSIGHTAID AI.'),
  P('Functions include multilingual sentiment analysis, sales forecasting, crisis detection with its evidence, and rule-based recommendations whose wording alone is produced by a language model. The **Prep & Stock Planner** (Figure 2) forecasts tomorrow’s demand per item from the same weekday over four weeks, adds a manager-controlled safety buffer, and cuts the batch by 20% when recent reviews raise a freshness complaint, giving a plain-language reason for every quantity. Users are cooperative managers, café operators and small food sellers; a one-click demo needs no sign-up. The live prototype scores sentiment from ratings; XLM-RoBERTa was evaluated offline.'),
  img('fig2_planner.jpg', 600, 'jpg'),
  caption('**Figure 2.** Prep & Stock Planner: “basi” reviews flag the karipap, its batch is cut, and the reason is shown (synthetic demo data).'),
  P('**Unique value proposition:** unlike general dashboards, INSIGHTAID AI links what customers say, in their own languages, to what the kitchen prepares tomorrow, and explains why. It is affordable (free-tier cloud, open-source models) and publishes every result against targets fixed in advance, including misses.'),

  H('4. METHODOLOGY AND DEVELOPMENT PROCESS'),
  P('The project followed **Design Science Research** (build and evaluate an artefact), with **CRISP-DM** structuring each analytics module.'),
  bullet('**Problem identification:** four gaps (language, forecasting, integration, affordability) from the needs of small businesses and cooperatives.'),
  bullet('**Concept development:** a five-layer architecture with explainable rules; acceptance targets fixed before development.'),
  bullet('**Prototype development:** React and Vite front end, Supabase back end and Python machine-learning layer, built iteratively with 615 automated tests.'),
  bullet(`**Testing and validation:** TF-IDF with logistic regression, mBERT and XLM-RoBERTa compared on ${o1.testSamples.toLocaleString('en-US')} held-out public comments; moving average, ARIMA, Prophet (with and without sentiment) and XGBoost compared by rolling-origin evaluation and the Diebold-Mariano test on the public Olist dataset; crisis detection on ${cr.scenarios} simulated crises and ${cr.controls} control spikes; response time over five runs per page; waste replayed over ${w.settings.replayDays} days on Koperasi Siswa Maju, a synthetic cooperative (${kop.sales.length.toLocaleString('en-US')} sales rows, ${kop.reviews.length} reviews).`),
  bullet('**Implementation:** MVP deployed online with a public demo; a real cooperative pilot is planned for 2027.'),
  P('Indicators: accuracy, macro-F1, MAPE, precision, recall, response time and simulated waste.', { before: 60 }),

  H('5. RESULTS AND INNOVATION IMPACT'),
  P('Table 1 reports each result against its fixed target. All values are produced by re-runnable scripts.', { keepNext: true }),
  caption('**Table 1.** Results against the acceptance targets.', true),
  table,
  P(`**Functional performance:** the multilingual model met its target in all three languages, and classifying comments in their original language beat translating them to English (${pct(o1.accuracy)} versus ${pct(transl.accuracy)}). Pages respond in ${Math.min(...medians).toFixed(1)} to ${Math.max(...medians).toFixed(1)} seconds. Forecasting is reported as measured; sentiment did not significantly improve it, which sets future work.`, { before: 160 }),
  P(`**Economic and environmental impact:** in the simulation, forecast-based ordering saved ${rm(w.savingRM)} over ${w.settings.replayDays} days and cut wasted units from ${w.lastWeekHabit.wasteUnits} to ${w.forecastHabit.wasteUnits} (SDG 12). Stock-outs rose, so a safety buffer lets managers balance waste against availability.`),
  P('**Social impact:** owners without data-science skills get plain-language reasons from feedback in their customers’ own languages.'),
  P('**Achieved versus expected:** accuracy, response time and crisis detection are measured; waste reduction is simulated on synthetic data. Real waste reduction and faster complaint response at pilot cooperatives are expected, not yet measured. The innovation won a Silver Award at AIMIX: IID 2026.'),

  H('6. COMMERCIALISATION AND SCALABILITY POTENTIAL'),
  P('The target market is campus, school and community cooperatives, cafés and small food outlets in Malaysia, then multi-outlet operators. The proposed model is freemium software-as-a-service: a free tier, a Pro plan at RM 49 per month (unlimited uploads, full recommendations, forecasting and crisis detection) and Business plans for multi-outlet operators. Operating cost is low because it runs on free-tier cloud and open-source models, positioning it as an affordable, multilingual and explainable alternative to general business intelligence tools. Opportunities include cooperative pilot partnerships, licensing to point-of-sale vendors and copyright registration. **Current stage:** working MVP deployed online with a public demo; not yet pilot-tested.'),

  H('7. CONCLUSION'),
  P(`INSIGHTAID AI shows that a small operator can receive daily, explainable prep decisions grounded in both sales and multilingual customer voice, at near-zero infrastructure cost. Its originality lies in linking review evidence in Bahasa Melayu, English and Mandarin to tomorrow’s quantities with transparent reasons, and in publishing every result against fixed targets, including the misses. Measured accuracy and speed, and a simulated ${w.savingPct}% waste reduction, demonstrate its potential. The next stage is to integrate the multilingual model into the live pipeline and run a 2027 pilot with a real campus cooperative to measure waste and complaint response on real sales.`),

  H('ACKNOWLEDGEMENT'),
  P('The author thanks his supervisor, Ts. Ahmad Izuddin Bin Zainal Abidin, Universiti Teknologi PETRONAS, for his guidance, and the providers of the public datasets used for evaluation: Shopee Malaysia reviews, Mesolitica Malay sentiment, ChineseNlpCorpus, Amazon Reviews 2023 and Olist.'),

  H('REFERENCES'),
  ...[
    'Conneau, A., Khandelwal, K., Goyal, N., Chaudhary, V., Wenzek, G., Guzmán, F., Grave, E., Ott, M., Zettlemoyer, L., & Stoyanov, V. (2020). Unsupervised cross-lingual representation learning at scale. In *Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics* (pp. 8440–8451). Association for Computational Linguistics. https://doi.org/10.18653/v1/2020.acl-main.747',
    'Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. *Journal of Business & Economic Statistics, 13*(3), 253–263. https://doi.org/10.1080/07350015.1995.10524599',
    'Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. *MIS Quarterly, 28*(1), 75–105. https://doi.org/10.2307/25148625',
    'Taylor, S. J., & Letham, B. (2018). Forecasting at scale. *The American Statistician, 72*(1), 37–45. https://doi.org/10.1080/00031305.2017.1380080',
    'Wirth, R., & Hipp, J. (2000). CRISP-DM: Towards a standard process model for data mining. In *Proceedings of the 4th International Conference on the Practical Applications of Knowledge Discovery and Data Mining* (pp. 29–39).',
  ].map((r) => new Paragraph({ children: rich(r), alignment: AlignmentType.LEFT, indent: { left: 720, hanging: 720 }, spacing: { line: LINE, after: 80 } })),
]

// word count (body, excluding references): every paragraph before REFERENCES
const plain = (s) => s.replace(/\*\*|\*/g, '')
const bodyTexts = [abstract]
const doc = new Document({
  creator: 'Muhammad Danish Alif Bin Azrul',
  title: 'INSIGHTAID AI: ISPARK 2026 extended abstract',
  styles: { default: { document: { run: { font: F, size: SZ } } } },
  numbering: { config: [
    { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
})
void bodyTexts; void plain
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(OUT, 'INSIGHTAID_AI_ISPARK2026_Extended_Abstract.docx')
  fs.writeFileSync(out, buf)
  console.log('wrote', out)
})
