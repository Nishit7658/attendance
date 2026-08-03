// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateQrToken, verifyQrToken, getQrExpiry } from '@/lib/qr-token'

describe('QR Token Library', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.AUTH_SECRET = 'super_secret_test_key_1234567890'
    vi.useFakeTimers()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.useRealTimers()
  })

  it('should generate and verify a valid token', async () => {
    const sessionId = 'test-session-123'
    const token = await generateQrToken(sessionId)
    
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    
    const payload = await verifyQrToken(token)
    expect(payload.sessionId).toBe(sessionId)
  })

  it('should throw if secret is missing', async () => {
    delete process.env.AUTH_SECRET
    delete process.env.QR_SIGNING_SECRET
    
    await expect(generateQrToken('test-session')).rejects.toThrow('QR signing secret is not set')
  })

  it('should reject an expired token', async () => {
    const sessionId = 'test-session-456'
    const token = await generateQrToken(sessionId)
    
    // Advance time by 16 seconds (expiry is 10s + 5s tolerance = 15s)
    vi.advanceTimersByTime(16000)
    
    await expect(verifyQrToken(token)).rejects.toThrow('"exp" claim timestamp check failed')
  })

  it('should return correct expiry time', () => {
    // 10000ms = 10s
    const now = Date.now()
    vi.setSystemTime(now)
    
    const expiry = getQrExpiry()
    expect(expiry).toBe(now + 10000)
  })
})
