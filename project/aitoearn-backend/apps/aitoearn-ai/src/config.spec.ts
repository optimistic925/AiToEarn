import { AiLogChannel } from '@yikart/mongodb'
import { describe, expect, it } from 'vitest'
import { agentConfigSchema, aiModelsConfigSchema } from './config'

const baseAgentConfig = {
  baseUrl: 'https://agent.example.com/v1/messages',
  apiKey: 'agent-key',
  analysis: {
    apiKey: 'gemini-key',
  },
}

const baseVideoModel = {
  name: 'test-video',
  description: 'Test Video',
  channel: AiLogChannel.Grok,
  modes: ['text2video' as const],
  resolutions: ['720p'],
  durations: [8],
  maxInputImages: 0,
  aspectRatios: ['16:9'],
  defaults: {
    resolution: '720p',
    aspectRatio: '16:9',
    duration: 8,
  },
}

function parseVideoModel(model: typeof baseVideoModel & { durationControl?: 'select' | 'none' }) {
  const result = aiModelsConfigSchema.parse({
    chat: [],
    image: {
      generation: [],
      edit: [],
    },
    video: {
      generation: [model],
    },
  })
  return result.video.generation[0]!
}

describe('agentConfigSchema', () => {
  it('applies the existing Claude model defaults', () => {
    const agentConfig = agentConfigSchema.parse(baseAgentConfig)

    expect(agentConfig.defaultModel).toBe('claude-opus-4-6')
    expect(agentConfig.backgroundModel).toBe('claude-haiku-4-5-20251001')
    expect(agentConfig.thinkModel).toBe('claude-opus-4-6')
    expect(agentConfig.models).toContain('claude-opus-4-6')
  })

  it('accepts an Anthropic-compatible third-party model set', () => {
    const agentConfig = agentConfigSchema.parse({
      ...baseAgentConfig,
      models: ['deepseek-anthropic-chat', 'deepseek-anthropic-lite'],
      defaultModel: 'deepseek-anthropic-chat',
      backgroundModel: 'deepseek-anthropic-lite',
      thinkModel: 'deepseek-anthropic-chat',
    })

    expect(agentConfig.models).toEqual(['deepseek-anthropic-chat', 'deepseek-anthropic-lite'])
    expect(agentConfig.defaultModel).toBe('deepseek-anthropic-chat')
  })

  it('rejects route models that are not configured', () => {
    expect(() => agentConfigSchema.parse({
      ...baseAgentConfig,
      models: ['deepseek-anthropic-chat'],
      defaultModel: 'missing-model',
      backgroundModel: 'deepseek-anthropic-chat',
      thinkModel: 'deepseek-anthropic-chat',
    })).toThrow(/defaultModel must be included in agent\.models/)
  })
})

describe('video model duration control', () => {
  it('keeps legacy models selectable by default', () => {
    const model = parseVideoModel(baseVideoModel)

    expect(model.durationControl).toBe('select')
    expect(model.durations).toEqual([8])
    expect(model.defaults.duration).toBe(8)
  })

  it('accepts duration-not-applicable metadata without inventing durations', () => {
    const model = parseVideoModel({
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
