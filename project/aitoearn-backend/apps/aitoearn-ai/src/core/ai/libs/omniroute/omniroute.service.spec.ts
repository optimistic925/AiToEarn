import { AppException } from '@yikart/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiAvailabilityService } from '../../../ai-availability'
import { OmniRouteConfig } from './omniroute.config'
import { OmniRouteLibService } from './omniroute.service'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: mocks.create,
  },
}))

describe('OmniRouteLibService', () => {
  let service: OmniRouteLibService

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockReturnValue({
      post: mocks.post,
      get: mocks.get,
    })
    const availability = {
      execute: async (_context: unknown, executor: () => Promise<unknown>) => executor(),
    } as AiAvailabilityService
    service = new OmniRouteLibService({
      apiKey: 'test-key',
      baseUrl: 'https://omniroute.example/v1',
      timeout: 300000,
    } as OmniRouteConfig, availability)
  })

  it('creates a video from a valid final OmniRoute response', async () => {
    mocks.post.mockResolvedValue({
      data: {
        created: 123,
        data: [{ url: 'https://cdn.example/video.mp4', format: 'mp4' }],
      },
    })

    const result = await service.createVideo({
      model: 'provider/model',
      prompt: 'A neutral test scene',
      duration: 4,
      resolution: '720p',
      aspect_ratio: '9:16',
    })

    expect(result.data[0]?.url).toBe('https://cdn.example/video.mp4')
    expect(mocks.post).toHaveBeenCalledWith('/videos/generations', expect.objectContaining({
      model: 'provider/model',
      prompt: 'A neutral test scene',
    }))
  })

  it('rejects malformed provider responses', async () => {
    mocks.post.mockResolvedValue({ data: { created: 123, data: [] } })

    await expect(service.createVideo({ model: 'provider/model', prompt: 'test' }))
      .rejects.toBeInstanceOf(AppException)
  })

  it('normalizes provider rejection responses', async () => {
    mocks.post.mockRejectedValue({
      message: 'Request failed',
      response: { status: 400, data: { error: { message: 'Invalid video model' } } },
    })

    await expect(service.createVideo({ model: 'provider/model', prompt: 'test' }))
      .rejects.toBeInstanceOf(AppException)
  })

  it('normalizes unauthorized credentials without exposing the key', async () => {
    mocks.post.mockRejectedValue({
      message: 'Request failed',
      response: { status: 401, data: { error: { message: 'Unauthorized' } } },
    })

    await expect(service.createVideo({ model: 'provider/model', prompt: 'test' }))
      .rejects.toBeInstanceOf(AppException)
  })

  it('normalizes request timeouts', async () => {
    mocks.post.mockRejectedValue({
      code: 'ECONNABORTED',
      message: 'timeout of 300000ms exceeded',
    })

    await expect(service.createVideo({ model: 'provider/model', prompt: 'test' }))
      .rejects.toBeInstanceOf(AppException)
  })

  it('lists the authenticated video model catalog', async () => {
    mocks.get.mockResolvedValue({
      data: { object: 'list', data: [{ id: 'provider/model', type: 'video' }] },
    })

    const result = await service.listVideoModels()

    expect(result.data).toEqual([{ id: 'provider/model', type: 'video' }])
    expect(mocks.get).toHaveBeenCalledWith('/videos/generations')
  })
})
