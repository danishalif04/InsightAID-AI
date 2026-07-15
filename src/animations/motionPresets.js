/**
 * Shared Framer Motion presets so every card / list / page
 * animates consistently (spread onto <motion.*> elements).
 */
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
}
