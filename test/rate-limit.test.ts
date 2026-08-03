// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import rateLimit from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests below the limit', async () => {
    const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 })
    
    await expect(limiter.check(3, 'token-1')).resolves.toBeUndefined()
    await expect(limiter.check(3, 'token-1')).resolves.toBeUndefined()
    await expect(limiter.check(3, 'token-1')).resolves.toBeUndefined()
  })

  it('should reject requests above the limit', async () => {
    const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 })
    
    await expect(limiter.check(2, 'token-2')).resolves.toBeUndefined()
    await expect(limiter.check(2, 'token-2')).resolves.toBeUndefined()
    
    await expect(limiter.check(2, 'token-2')).rejects.toThrow('Rate limit exceeded')
  })

  it('should reset limits after interval', async () => {
    const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 })
    
    await expect(limiter.check(1, 'token-3')).resolves.toBeUndefined()
    
    await expect(limiter.check(1, 'token-3')).rejects.toThrow('Rate limit exceeded')
    
    // Fast forward 61 seconds
    vi.advanceTimersByTime(61000)
    
    await expect(limiter.check(1, 'token-3')).resolves.toBeUndefined()
  })

  it('should track separate tokens independently', async () => {
    const limiter = rateLimit({ uniqueTokenPerInterval: 500, interval: 60000 })
    
    await expect(limiter.check(1, 'user-A')).resolves.toBeUndefined()
    await expect(limiter.check(1, 'user-B')).resolves.toBeUndefined()
    
    await expect(limiter.check(1, 'user-A')).rejects.toThrow()
    await expect(limiter.check(1, 'user-B')).rejects.toThrow()
  })
})
