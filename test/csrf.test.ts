// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { NextRequest } from 'next/server'
import { AppError } from '@/lib/api-error'

describe('CSRF Origin Verification', () => {
  it('should allow valid origin matching host', () => {
    const req = new NextRequest('http://localhost:3000/api/student/scan', {
      method: 'POST',
      headers: {
        'origin': 'http://localhost:3000',
        'host': 'localhost:3000'
      }
    })
    
    expect(() => verifyCsrfOrigin(req)).not.toThrow()
  })

  it('should allow valid referer matching host when origin is missing', () => {
    const req = new NextRequest('http://localhost:3000/api/student/scan', {
      method: 'POST',
      headers: {
        'referer': 'http://localhost:3000/student/scan',
        'host': 'localhost:3000'
      }
    })
    
    expect(() => verifyCsrfOrigin(req)).not.toThrow()
  })

  it('should throw error when origin does not match host', () => {
    const req = new NextRequest('http://localhost:3000/api/student/scan', {
      method: 'POST',
      headers: {
        'origin': 'http://evil-site.com',
        'host': 'localhost:3000'
      }
    })
    
    expect(() => verifyCsrfOrigin(req)).toThrowError(AppError)
    expect(() => verifyCsrfOrigin(req)).toThrowError('Origin mismatch')
  })

  it('should throw error when origin and referer are completely missing', () => {
    const req = new NextRequest('http://localhost:3000/api/student/scan', {
      method: 'POST',
      headers: {
        'host': 'localhost:3000'
      }
    })
    
    expect(() => verifyCsrfOrigin(req)).toThrowError('Missing origin/host header')
  })
})
