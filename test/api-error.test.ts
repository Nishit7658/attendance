// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { AppError, handleApiError } from '@/lib/api-error'
import { ZodError, ZodIssue } from 'zod'

describe('API Error Handling', () => {
  it('should create an AppError with default status code', () => {
    const error = new AppError('Something went wrong')
    expect(error.message).toBe('Something went wrong')
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(true)
  })

  it('should create an AppError with custom status code', () => {
    const error = new AppError('Not Found', 404)
    expect(error.statusCode).toBe(404)
  })

  it('handleApiError should return correct response for AppError', async () => {
    const error = new AppError('Forbidden', 403)
    const response = handleApiError(error)
    
    expect(response.status).toBe(403)
    
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
  })

  it('handleApiError should return 400 for ZodError', async () => {
    const issues: ZodIssue[] = [
      { code: 'custom', path: ['email'], message: 'Invalid email' }
    ]
    const error = new ZodError(issues)
    const response = handleApiError(error)
    
    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('Invalid email')
  })

  it('handleApiError should return 500 for generic Error', async () => {
    const error = new Error('Random system crash')
    const response = handleApiError(error)
    
    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe('Internal server error')
  })
})
