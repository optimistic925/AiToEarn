import type { DraftGenerationPricingVo, VideoModelInfo } from '../src/api/ai/ai.types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from '@playwright/test'
import { getVideoModelsCommonStaticConfig } from '../src/components/draft-box/components/AiBatchGenerateBar/utils/constants'
import { useAiBatchSubmitHandler } from '../src/components/draft-box/components/AiBatchGenerateBar/hooks/useAiBatchSubmitHandler'
import { usePlanDetailStore } from '../src/store/draft-box/planDetailStore'
import http from '../src/utils/request'

function videoModel(overrides: Partial<VideoModelInfo> = {}): VideoModelInfo {
  return {
    name: 'selectable-video',
    description: 'Selectable Video',
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

type PricingCache = {
  data: DraftGenerationPricingVo | null
  promise: Promise<DraftGenerationPricingVo | null> | null
}

function primePricing(videoModels: VideoModelInfo[]) {
  const pricingGlobal = globalThis as typeof globalThis & {
    __draftGenerationPricingCache?: PricingCache
  }
  pricingGlobal.__draftGenerationPricingCache = {
    data: {
      imageModels: [],
      videoModels,
    },
    promise: null,
  }
}

type SubmitParams = Parameters<typeof useAiBatchSubmitHandler>[0]
type StoreState = ReturnType<typeof usePlanDetailStore.getState>
type StoreCreate = StoreState['createBatchGenerationWithModels']

function renderSubmitHandler(params: SubmitParams) {
  let submit: (() => Promise<void>) | undefined

  function Harness() {
    submit = useAiBatchSubmitHandler(params)
    return createElement('span')
  }

  renderToStaticMarkup(createElement(Harness))

  if (!submit)
    throw new Error('submit handler was not initialized')

  return submit
}

function createSubmissionParams(videoModels: VideoModelInfo[], selectedVideoModels: string[]) {
  primePricing(videoModels)

  const realCreate = usePlanDetailStore.getState().createBatchGenerationWithModels
  let capturedModelInputs: Parameters<StoreCreate>[1] = []
  let capturedGlobalDuration: number | undefined = Number.NaN

  const createBatchGenerationWithModels: StoreCreate = async (...args) => {
    capturedModelInputs = args[1]
    capturedGlobalDuration = args[2]
    return realCreate(...args)
  }

  const params: SubmitParams = {
    isUploading: false,
    promptValue: 'integration prompt',
    isDraftMode: false,
    captionSystemPrompt: '',
    localImages: [],
    localVideos: [],
    localAudios: [],
    contentType: 'video',
    selectedImageModels: [],
    selectedVideoModels,
    videoModelSelectionMode: selectedVideoModels.length > 1 ? 'multiple' : 'single',
    currentImageAspectRatios: [],
    imagePricing: [],
    currentVideoModelConfig: getVideoModelsCommonStaticConfig(videoModels),
    resolvedVideoModelParams: {},
    effectiveQuantity: 1,
    imageCount: 1,
    aspectRatio: '16:9',
    duration: 8,
    groupId: 'group-integration-test',
    imageSize: '1K',
    effectiveSelectedPlatforms: [],
    createImageTextBatchGenerationWithModels: async () => ({
      success: false,
      successCount: 0,
      failedCount: 0,
    }),
    createBatchGenerationWithModels,
    t: key => key,
  }

  return {
    params,
    getCapturedModelInputs: () => capturedModelInputs,
    getCapturedGlobalDuration: () => capturedGlobalDuration,
  }
}

type HttpPost = typeof http.post

async function captureDraftGenerationRequests(run: (requests: Record<string, unknown>[]) => Promise<void>) {
  const originalPost = http.post
  const requests: Record<string, unknown>[] = []
  let requestIndex = 0

  http.post = (async (url: string, data?: unknown) => {
    if (url !== 'ai/draft-generation/v2')
      throw new Error(`unexpected POST: ${url}`)

    requestIndex += 1
    requests.push(JSON.parse(JSON.stringify(data)) as Record<string, unknown>)
    return {
      code: 0,
      data: {
        taskIds: [`task-${requestIndex}`],
      },
    }
  }) as HttpPost

  try {
    await run(requests)
  }
  finally {
    http.post = originalPost
  }
}

for (const modelName of ['veoaifree-web/veo', 'veoaifree-web/seedance']) {
  test(`${modelName} stays durationless through the real submit and store path`, async () => {
    const noDurationModel = videoModel({
      name: modelName,
      channel: 'omniroute',
      resolutions: [],
      durations: [],
      durationControl: 'none',
      defaults: { aspectRatio: '16:9' },
    })
    const capture = createSubmissionParams([noDurationModel], [modelName])
    capture.params.resolvedVideoModelParams = {
      [modelName]: {
        aspectRatio: '16:9',
        duration: 8,
      },
    }

    await captureDraftGenerationRequests(async (requests) => {
      await renderSubmitHandler(capture.params)()

      expect(capture.getCapturedModelInputs()).toHaveLength(1)
      expect(capture.getCapturedModelInputs()[0]?.modelType).toBe(modelName)
      expect(capture.getCapturedModelInputs()[0]?.duration).toBeUndefined()
      expect(capture.getCapturedGlobalDuration()).toBeUndefined()

      expect(requests).toHaveLength(1)
      expect(requests[0]?.model).toBe(modelName)
      expect(Object.prototype.hasOwnProperty.call(requests[0], 'duration')).toBe(false)
    })
  })
}

test('mixed-model submission preserves selectable duration without leaking it to no-duration model', async () => {
  const selectableModel = videoModel({
    name: 'sora-compatible-duration-model',
    channel: 'openai',
    durations: [4, 8, 12],
    durationControl: 'select',
  })
  const noDurationModel = videoModel({
    name: 'veoaifree-web/seedance',
    channel: 'omniroute',
    resolutions: [],
    durations: [],
    durationControl: 'none',
    defaults: { aspectRatio: '16:9' },
  })
  const capture = createSubmissionParams(
    [selectableModel, noDurationModel],
    [selectableModel.name, noDurationModel.name],
  )
  capture.params.resolvedVideoModelParams = {
    [selectableModel.name]: {
      resolution: '720p',
      duration: 12,
      aspectRatio: '16:9',
    },
    [noDurationModel.name]: {
      duration: 4,
      aspectRatio: '16:9',
    },
  }

  await captureDraftGenerationRequests(async (requests) => {
    await renderSubmitHandler(capture.params)()

    const modelInputs = capture.getCapturedModelInputs()
    const selectableInput = modelInputs.find(input => input.modelType === selectableModel.name)
    const noDurationInput = modelInputs.find(input => input.modelType === noDurationModel.name)

    expect(selectableInput?.duration).toBe(12)
    expect(noDurationInput?.duration).toBeUndefined()
    expect(capture.getCapturedGlobalDuration()).toBeUndefined()

    const selectableRequest = requests.find(request => request.model === selectableModel.name)
    const noDurationRequest = requests.find(request => request.model === noDurationModel.name)

    expect(selectableRequest?.duration).toBe(12)
    expect(noDurationRequest).toBeDefined()
    expect(Object.prototype.hasOwnProperty.call(noDurationRequest, 'duration')).toBe(false)
  })
})
