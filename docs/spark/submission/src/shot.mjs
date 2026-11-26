// Renders a figure HTML file to a 2x PNG (the .wrap element).
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
const { chromium } = createRequire(process.cwd() + '/package.json')('@playwright/test')
const [src, out] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 600 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(path.resolve(src)).href)
await p.evaluate(() => document.fonts.ready)
await p.locator('.wrap').screenshot({ path: out })
await b.close()
