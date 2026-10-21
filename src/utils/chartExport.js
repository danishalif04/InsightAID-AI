/**
 * Real PNG export for a rendered Recharts SVG — no new dependency needed
 * (html2canvas is only a transitive dep of jspdf, never imported directly
 * elsewhere in src/, so it isn't relied on here). Serializes the SVG,
 * draws it onto an offscreen <canvas> via the browser's own Image/Canvas
 * APIs, then downloads the canvas as a PNG. Pure DOM side effect — like
 * csvExport.js's downloadCsv(), not unit-tested beyond its pure sizing
 * helper below.
 */

/** Pure: picks the pixel size to rasterize at, given the live SVG element's
 * own measured box (falls back to its viewBox, then a safe default — an
 * SVG that hasn't been laid out yet, e.g. in a hidden tab, has 0 for both). */
export function resolveSvgExportSize(svgElement) {
  const rect = svgElement.getBoundingClientRect?.() ?? { width: 0, height: 0 }
  const viewBox = svgElement.viewBox?.baseVal
  const width = rect.width || viewBox?.width || 800
  const height = rect.height || viewBox?.height || 400
  return { width: Math.round(width), height: Math.round(height) }
}

/** Finds the first rendered <svg> inside `container` — Recharts' own chart
 * root. Returns null if nothing's rendered yet (e.g. still loading). */
export function findChartSvg(container) {
  return container?.querySelector?.('svg') ?? null
}

function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** Exports the first <svg> found inside `container` as a downloaded PNG.
 * Resolves once the download has been triggered; throws if there's no SVG
 * to export (caller should only offer this action once a chart has data). */
export async function exportChartAsPng(container, filename = 'chart.png') {
  const svgElement = findChartSvg(container)
  if (!svgElement) throw new Error('No chart is currently rendered to export.')

  const { width, height } = resolveSvgExportSize(svgElement)
  const svgString = new XMLSerializer().serializeToString(svgElement)
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not rasterize the chart for export.'))
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    // Flatten transparency to white — a PNG with a transparent chart
    // background looks broken when opened outside a themed page.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    triggerDownload(canvas.toDataURL('image/png'), filename)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

/** Toggles native browser fullscreen on `element`. No-op (resolves) if the
 * Fullscreen API isn't available — never throws for an unsupported browser. */
export async function toggleFullscreen(element) {
  if (!element) return
  if (document.fullscreenElement) {
    await document.exitFullscreen?.()
  } else {
    await element.requestFullscreen?.()
  }
}
