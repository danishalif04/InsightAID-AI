import { loadFont as loadManrope } from '@remotion/google-fonts/Manrope'
import { loadFont as loadInstrument } from '@remotion/google-fonts/InstrumentSerif'

// The app's own faces: Manrope for UI and headlines, Instrument Serif italic
// for the single accent word in each page title ("at a Glance").
export const { fontFamily: manrope } = loadManrope('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
})

export const { fontFamily: instrument } = loadInstrument('italic', {
  weights: ['400'],
  subsets: ['latin'],
})

// Mandarin glyphs are not in Manrope; fall back to the OS CJK face so the
// Chinese comment renders instead of tofu boxes.
export const ui = `${manrope}, "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
export const serif = `${instrument}, Georgia, serif`
