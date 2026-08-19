import { AiLogChannel, AiLogStatus, AiLogType } from '@yikart/mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskStatus } from '../../../common'
import { VideoService } from './video.service'

const videoModels = [
  {
    name: 'veoaifree-web/veo',
    channel: AiLogChannel.OmniRoute,
    modes: ['text2video'],
    resolutions: [],
    durations: [],
    maxInputImages: 0,
    aspectRatios: ['VIDEO_ASPECT_RATIO_LANDSCAPE'],
    defaults: { aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE' },
  },
  {
    name: 'veoaifree-web/seedance',
    channel: AiLogChannel.OmniRoute,
    modes: ['text2video'],
    resolutions: [],
    durations: [],
    maxInputImages: 0,
    aspectRatios: ['VIDEO_ASPECT_RATIO_LANDSCAPE'],
    defaults: { aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE' },
  },
]

describe('VideoService OmniRoute integration', () => {
  const aiLogRepo = {
    getById: vi.fn(),
    updateById: vi.fn(),
    listWithPagination: vi.fn(),
  }
  const omniRouteVideoService = {
    createFromRequest: vi.fn(),
    extractInput: vi.fn(),
    getTaskResult: vi.fn(),
  }

  let service: VideoService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VideoService(
      {} as any,
      aiLogRepo as any,
      { config: { video: { generation: videoModels } } } as any,
      {} as any,
      {} as any,
      { getInfo: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      omniRouteVideoService as any,
    )
  })

  it.each(['veoaifree-web/veo', 'veoaifree-web/seedance'])(
    'routes %s creation through OmniRoute and normalizes submitted status',
    async (model) => {
      omniRouteVideoService.createFromRequest.mockResolvedValue({ id: 'task-1' })

      const result = await service.userVideoGeneration({
        userId: 'user-1',
        userType: 'user',
        model,
        prompt: 'A neutral test scene',
        mode: 'text2video',
      } as any)

      expect(omniRouteVideoService.createFromRequest).toHaveBeenCalledWith(expect.objectContaining({ model }))
      expect(result).toEqual({ id: 'task-1', status: TaskStatus.Submitted })
    },
  )

  it('normalizes a completed OmniRoute AiLog through the common task-status interface', async () => {
    const startedAt = new Date('2026-08-19T20:00:00.000Z')
    aiLogRepo.getById.mockResolvedValue({
      id: 'task-2',
      userId: 'user-1',
      userType: 'user',
      type: AiLogType.Video,
      channel: AiLogChannel.OmniRoute,
      model: 'veoaifree-web/veo',
      status: AiLogStatus.Success,
      startedAt,
      duration: 1000,
      request: { prompt: 'test' },
      response: { videoUrl: '/ai/video.mp4' },
    })
    omniRouteVideoService.extractInput.mockReturnValue({ prompt: 'test' })
    omniRouteVideoService.getTaskResult.mockReturnValue({
      status: TaskStatus.Success,
      videoUrl: 'https://assets.example/ai/video.mp4',
      error: undefined,
    })

    const result = await service.getVideoTaskStatus({ taskId: 'task-2' } as any)

    expect(omniRouteVideoService.extractInput).toHaveBeenCalled()
    expect(omniRouteVideoService.getTaskResult).toHaveBeenCalledWith({ videoUrl: '/ai/video.mp4' })
    expect(result).toEqual(expect.objectContaining({
      id: 'task-2',
      model: 'veoaifree-web/veo',
      status: TaskStatus.Success,
      videoUrl: 'https://assets.example/ai/video.mp4',
    }))
  })
})
