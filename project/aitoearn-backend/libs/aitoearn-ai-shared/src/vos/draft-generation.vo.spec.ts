import { describe, expect, it } from 'vitest'
import { VideoModelVoSchema } from './draft-generation.vo'

const baseVideoModel = {
  name: 'test-video',
  description: 'Test Video',
  channel: 'openai',
  modes: ['text2video'],
  resolutions: ['720p'],
  durations: [8],
  maxInputImages: 0,
  aspectRatios: ['16:9'],
  tags: [],
  defaults: {
    resolution: '720p',
    aspectRatio: '16:9',
    duration: 8,
  },
}

describe('video model durationControl metadata', () => {
  it('defaults existing video models to selectable duration', () => {
    const model = VideoModelVoSchema.parse(baseVideoModel)

    expect(model.durationControl).toBe('select')
    expect(model.durations).toEqual([8])
    expect(model.defaults.duration).toBe(8)
  })

  it('represents duration-not-applicable without inventing a duration', () => {
    const model = VideoModelVoSchema.parse({
      ...baseVideoModel,
      name: 'veoaifree-web/veo',
      resolutions: [],
      durations: [],
      durationControl: 'none',
      defaults: {
        aspectRatio: '16:9',
      },
    })

    expect(model.durationControl).toBe('none')
    expect(model.durations).toEqual([])
    expect(model.defaults.duration).toBeUndefined()
    expect(model.defaults.aspectRatio).toBe('16:9')
  })
})
