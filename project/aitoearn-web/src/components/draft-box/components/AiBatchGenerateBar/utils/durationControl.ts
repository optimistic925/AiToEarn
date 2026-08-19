import type { VideoModelInfo, VideoModelType } from '@/api/ai/ai.types'
import type { VideoModelParams } from '@/store/draft-box/draftBoxConfigStore'

export type VideoDurationControl = 'select' | 'none'

export interface VideoModelGenerationInput {
  modelType: VideoModelType
  resolution?: string
  duration?: number
  aspectRatio?: string
}

export function getVideoDurationControl(model?: Pick<VideoModelInfo, 'durationControl'>): VideoDurationControl {
  return model?.durationControl ?? 'select'
}

export function hasSelectableVideoDuration(model?: Pick<VideoModelInfo, 'durationControl'>): boolean {
  return getVideoDurationControl(model) === 'select'
}

export function isVideoModelSubmitParamsValid(
  model: Pick<VideoModelInfo, 'durationControl'> | undefined,
  params: VideoModelParams | undefined,
): boolean {
  if (!params?.aspectRatio)
    return false
  return !hasSelectableVideoDuration(model) || params.duration !== undefined
}

export function buildVideoModelGenerationInput(
  model: Pick<VideoModelInfo, 'name' | 'durationControl'>,
  params: VideoModelParams | undefined,
): VideoModelGenerationInput {
  return {
    modelType: model.name,
    resolution: params?.resolution || undefined,
    duration: hasSelectableVideoDuration(model) ? params?.duration : undefined,
    aspectRatio: params?.aspectRatio,
  }
}
