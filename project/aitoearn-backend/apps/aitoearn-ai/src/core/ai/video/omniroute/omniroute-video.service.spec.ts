import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@yikart/mongodb', () => ({
  AiLogChannel: { OmniRoute: 'omniroute' },
  AiLogStatus: { Success: 'success' },
  AiLogType: { Video: 'video' },
  AssetType: { AiVideo: 'ai-video' },
  AiLogRepository: class AiLogRepository {},
}))

import { AiLogChannel, AiLogStatus } from '@yikart/mongodb'
import { OmniRouteVideoService } from './omniroute-video.service'

const modelConfig = {
  name: 'omniroute-test-video',
  channel: AiLogChannel.OmniRoute,
  modes: ['text2video'],
  resolutions: ['720p'],
  durations: [4],
  maxInputImages: 0,
  aspectRatios: ['9:16'],
  defaults: { resolution: '720p', aspectRatio: '9:16', duration: 4 },
  runtimeModels: [{ model: 'provider/video-model', mode: 'text2video', resolution: '720p' }],
}

describe('omniRouteVideoService', () => {
  const createVideo = vi.fn()
  const createAiLog = vi.fn()
  const uploadFromUrl = vi.fn()
  const uploadFromBuffer = vi.fn()

  let service: OmniRouteVideoService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OmniRouteVideoService(
      { createVideo } as any,
      { create: createAiLog } as any,
      { uploadFromUrl, uploadFromBuffer } as any,
      { config: { video: { generation: [modelConfig] } } } as any,
    )
  })

  it('normalizes a completed URL response into a successful local video task', async () => {
    createVideo.mockResolvedValue({
      created: 123,
      data: [{ url: 'https://cdn.example/video.mp4', format: 'mp4' }],
    })
    uploadFromUrl.mockResolvedValue({ asset: { path: '/ai/video.mp4' } })
    createAiLog.mockImplementation(async (input: any) => ({ ...input, id: 'ai-log-1' }))

    const result = await service.createFromRequest({
      userId: 'user-1',
      userType: 'user',
      model: 'omniroute-test-video',
      prompt: 'A neutral test scene',
      mode: 'text2video',
      resolution: '720p',
      ratio: '9:16',
      duration: 4,
    } as any)

    expect(result).toEqual({ id: 'ai-log-1' })
    expect(uploadFromUrl).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ url: 'https://cdn.example/video.mp4' }),
      'omniroute-test-video',
    )
    expect(createAiLog).toHaveBeenCalledWith(expect.objectContaining({
      channel: AiLogChannel.OmniRoute,
      status: AiLogStatus.Success,
    }))
  })

  it('uploads base64 MP4 output and excludes the base64 payload from AiLog', async () => {
    const largeBase64 = 'A'.repeat(1024 * 1024)
    createVideo.mockResolvedValue({
      created: 123,
      data: [{ b64_json: largeBase64, format: 'mp4' }],
    })
    uploadFromBuffer.mockResolvedValue({ asset: { path: '/ai/base64-video.mp4' } })
    createAiLog.mockImplementation(async (input: any) => ({ ...input, id: 'ai-log-2' }))

    await service.createFromRequest({
      userId: 'user-1',
      userType: 'user',
      model: 'omniroute-test-video',
      prompt: 'test',
      mode: 'text2video',
      resolution: '720p',
      ratio: '9:16',
      duration: 4,
    } as any)

    expect(uploadFromBuffer).toHaveBeenCalledWith(
      'user-1',
      expect.any(Buffer),
      expect.objectContaining({ type: expect.anything(), mimeType: 'video/mp4' }),
      'omniroute-test-video',
    )
    const logged = createAiLog.mock.calls[0]?.[0]
    expect(logged.response.videoUrl).toBe('/ai/base64-video.mp4')
    expect(logged.response.data).toEqual([{ format: 'mp4' }])
    expect(JSON.stringify(logged.response)).not.toContain(largeBase64.slice(0, 100))
  })

  it('reports completion locally without an upstream polling endpoint', () => {
    const result = service.getTaskResult({
      created: 123,
      data: [{ format: 'mp4' }],
      videoUrl: '/ai/video.mp4',
    })
    expect(result.status).toBe('success')
    expect(result.error).toBeUndefined()
  })

  it('does not advertise or accept a mode absent from the model configuration', async () => {
    await expect(service.createFromRequest({
      userId: 'user-1',
      userType: 'user',
      model: 'omniroute-test-video',
      prompt: 'test',
      mode: 'image2video',
    } as any)).rejects.toBeDefined()
    expect(createVideo).not.toHaveBeenCalled()
  })
})
