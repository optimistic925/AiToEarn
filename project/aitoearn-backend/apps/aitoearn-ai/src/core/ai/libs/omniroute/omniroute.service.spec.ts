import { AppException } from '@yikart/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiAvailabilityService } from '../../../ai-availability'
import { OMNIROUTE_DEFAULT_TIMEOUT_MS, OmniRouteConfig, omniRouteConfigSchema } from './omniroute.config'
import {
  OMNIROUTE_MAX_RESPONSE_BYTES,
  OmniRouteLibService,
} from './omniroute.service'

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

describe('omniRouteLibService', () => {
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
      timeout: OMNIROUTE_DEFAULT_TIMEOUT_MS,
    } as OmniRouteConfig, availability)
  })

  it('defaults to a 12-minute provider timeout', () => {
    const parsed = omniRouteConfigSchema.parse({
      apiKey: 'test-key',
      baseUrl: 'https://omniroute.example/v1',
    })
    expect(parsed.timeout).toBe(12 * 60 * 1000)
  })

  it('configures Bearer authentication, timeout, and a bounded response size', () => {
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://omniroute.example/v1',
      timeout: OMNIROUTE_DEFAULT_TIMEOUT_MS,
      maxContentLength: OMNIROUTE_MAX_RESPONSE_BYTES,
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
      }),
    }))
  })

  it('creates a video from a final URL response for the canonical VEO model', async () => {
    mocks.post.mockResolvedValue({
      data: {
        created: 123,
        data: [{ url: 'https://cdn.example/video.mp4', format: 'mp4' }],
      },
    })

    const result = await service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })
    expect(result.data[0]?.url).toBe('https://cdn.example/video.mp4')
    expect(mocks.post).toHaveBeenCalledWith('/videos/generations', expect.objectContaining({
      model: 'veoaifree-web/veo',
      prompt: 'test',
    }))
  })

  it('creates a video from a final base64 response for the canonical Seedance model', async () => {
    mocks.post.mockResolvedValue({
      data: {
        created: 123,
        data: [{ b64_json: 'AAAAIGZ0eXBpc29t', format: 'mp4' }],
      },
    })

    const result = await service.createVideo({ model: 'veoaifree-web/seedance', prompt: 'test' })
    expect(result.data[0]?.b64_json).toBe('AAAAIGZ0eXBpc29t')
    expect(mocks.post).toHaveBeenCalledWith('/videos/generations', expect.objectContaining({
      model: 'veoaifree-web/seedance',
      prompt: 'test',
    }))
  })

  it('rejects an empty terminal data array', async () => {
    mocks.post.mockResolvedValue({ data: { created: 123, data: [] } })
    await expect(service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('rejects a malformed URL result before asset processing', async () => {
    mocks.post.mockResolvedValue({ data: { created: 123, data: [{ url: 'not-a-url', format: 'mp4' }] } })
    await expect(service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('rejects malformed base64 before asset processing', async () => {
    mocks.post.mockResolvedValue({ data: { created: 123, data: [{ b64_json: 'not-base64!!', format: 'mp4' }] } })
    await expect(service.createVideo({ model: 'veoaifree-web/seedance', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('rejects unsupported base64 video formats', async () => {
    mocks.post.mockResolvedValue({ data: { created: 123, data: [{ b64_json: 'AAAAIGZ0eXBpc29t', format: 'mov' }] } })
    await expect(service.createVideo({ model: 'veoaifree-web/seedance', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('normalizes provider rejection responses', async () => {
    mocks.post.mockRejectedValue({ message: 'Request failed', response: { status: 400, data: { error: { message: 'Invalid video model' } } } })
    await expect(service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('redacts the configured credential from provider error normalization', async () => {
    mocks.post.mockRejectedValue({
      message: 'Request failed',
      response: { status: 401, data: { error: { message: 'Unauthorized for test-key' } } },
    })

    let thrown: unknown
    try {
      await service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })
    }
    catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(AppException)
    expect(JSON.stringify(thrown)).not.toContain('test-key')
  })

  it('normalizes request timeouts using the generation timeout', async () => {
    mocks.post.mockRejectedValue({ code: 'ECONNABORTED', message: `timeout of ${OMNIROUTE_DEFAULT_TIMEOUT_MS}ms exceeded` })
    await expect(service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('normalizes an Axios response-size rejection', async () => {
    mocks.post.mockRejectedValue({ code: 'ERR_BAD_RESPONSE', message: `maxContentLength size of ${OMNIROUTE_MAX_RESPONSE_BYTES} exceeded` })
    await expect(service.createVideo({ model: 'veoaifree-web/veo', prompt: 'test' })).rejects.toBeInstanceOf(AppException)
  })

  it('lists the authenticated video model catalog', async () => {
    mocks.get.mockResolvedValue({
      data: {
        object: 'list',
        data: [
          { id: 'veoaifree-web/veo', type: 'video' },
          { id: 'veoaifree-web/seedance', type: 'video' },
        ],
      },
    })
    const result = await service.listVideoModels()
    expect(result.data.map(item => item.id)).toEqual(['veoaifree-web/veo', 'veoaifree-web/seedance'])
    expect(mocks.get).toHaveBeenCalledWith('/videos/generations')
  })
})
