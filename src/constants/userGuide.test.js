import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { USER_GUIDE } from './userGuide'

const publicDir = fileURLToPath(new URL('../../public', import.meta.url))

describe('USER_GUIDE', () => {
  it('covers both pathways', () => {
    expect(USER_GUIDE.map((g) => g.id)).toEqual(['local-shop', 'business-startup'])
  })

  it('every step has a title, a menu location, text and a screenshot that exists', () => {
    for (const guide of USER_GUIDE) {
      expect(guide.steps.length).toBeGreaterThanOrEqual(5)
      for (const step of guide.steps) {
        expect(step.title).toBeTruthy()
        expect(step.where).toBeTruthy()
        expect(step.body.length).toBeGreaterThan(40)
        expect(step.image).toMatch(/^\/guide\/.+\.jpg$/)
        expect(existsSync(publicDir + step.image), step.image).toBe(true)
      }
    }
  })
})
