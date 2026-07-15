import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { pressable } from '@/animations/motionPresets'

/** Floating action button, bottom-right, opening the AI assistant (Phase 3+). */
export default function AiAssistantButton() {
  return (
    <motion.button
      type="button"
      aria-label="Open AI assistant"
      className="fixed bottom-6 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-brand-950 shadow-card"
      {...pressable}
    >
      <Zap className="size-6 text-accent-400" aria-hidden="true" />
    </motion.button>
  )
}
