import type { VideoModelInfo } from '../src/api/ai/ai.types'
import { expect, test } from '@playwright/test'
import { getVideoModelDurationLimits } from '../src/components/draft-box/components/AiBatchGenerateBar/utils/constants'
import {
  buildVideoModelGenerationInput,
  hasSelectableVideoDuration,
  isVideoModelSubmitParamsValid,
} from '../src/components/draft-box/components/AiBatchGenerateBar/utils/durationControl'

function videoModel(overrides: Partial<VideoModelInfo> = {}): VideoModelInfo {
  return {
    name: 'legacy-video',
    description: 'Legacy Video',
    channel: 'openai',
    modes: ['text2video'],
    resolutions: ['720p'],
    durations: [4, 8, 12],
    maxInputImages: 0,
    aspectRatios: ['16:9'],
    tags: [],
    defaults: {
      resolution: '720p',
      aspectRatio: '16:9',
      duration: 8,
    },
    pricing: [],
    ...overrides,
  }
}

test('OmniRoute VEO hides duration semantics and omits duration from submission', () => {
  const model = videoModel({
    name: 'veoaifree-web/veo',
    channel: 'omniroute',
    resolutions: [],
    durations: [],
    durationControl: 'none',
    defaults: { aspectRatio: '16:9' },
  })

  expect(hasSelectableVideoDuration(model)).toBe(false)
  expect(isVideoModelSubmitParamsValid(model, { aspectRatio: '16:9' })).toBe(true)

  const input = buildVideoModelGenerationInput(model, {
    aspectRatio: '16:9',
    duration: 8,
  })
  expect(input.modelType).toBe('veoaifree-web/veo')
  expect(input.duration).toBeUndefined()
  expect(input.aspectRatio).toBe('16:9')
})

test('OmniRoute Seedance uses the same no-duration capability', () => {
  const model = videoModel({
    name: 'veoaifree-web/seedance',
    channel: 'omniroute',
    resolutions: [],
    durations: [],
    durationControl: 'none',
    defaults: { aspectRatio: '16:9' },
  })

  expect(hasSelectableVideoDuration(model)).toBe(false)
  expect(buildVideoModelGenerationInput(model, { aspectRatio: '16:9' })).toEqual({
    modelType: 'veoaifree-web/seedance',
    resolution: undefined,
    duration: undefined,
    aspectRatio: '16:9',
  })
})

test('legacy empty durations retain the existing 4-15 second fallback', () => {
  const model = videoModel({
    durations: [],
    durationControl: undefined,
    defaults: { aspectRatio: '16:9' },
  })

  expect(hasSelectableVideoDuration(model)).toBe(true)
  expect(getVideoModelDurationLimits(model, '', false)).toEqual({ min: 4, max: 15 })
  expect(isVideoModelSubmitParamsValid(model, { aspectRatio: '16:9' })).toBe(false)
})

test('selectable video models preserve explicit duration behavior', () => {
  const model = videoModel({
    name: 'sora-compatible-duration-model',
    channel: 'openai',
    durations: [4, 8, 12],
    durationControl: 'select',
  })

  expect(hasSelectableVideoDuration(model)).toBe(true)
  expect(getVideoModelDurationLimits(model, '720p', false)).toEqual({ min: 4, max: 12 })
  expect(isVideoModelSubmitParamsValid(model, { aspectRatio: '16:9', duration: 8 })).toBe(true)
  expect(buildVideoModelGenerationInput(model, {
    resolution: '720p',
    duration: 8,
    aspectRatio: '16:9',
  })).toEqual({
    modelType: 'sora-compatible-duration-model',
    resolution: '720p',
    duration: 8,
    aspectRatio: '16:9',
  })
})

test('fixed-duration legacy models remain locked to their configured duration range', () => {
  const model = videoModel({
    name: 'fixed-10s-model',
    durations: [10],
    defaults: { aspectRatio: '16:9', duration: 10 },
  })

  expect(getVideoModelDurationLimits(model, '720p', false)).toEqual({ min: 10, max: 10 })
})
