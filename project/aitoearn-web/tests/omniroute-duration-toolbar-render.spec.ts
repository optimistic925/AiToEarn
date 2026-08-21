import type { VideoModelInfo } from '../src/api/ai/ai.types'
import type { AiBatchGenerateBarLocalState } from '../src/components/draft-box/components/AiBatchGenerateBar/store'
import type { ToolBarInlineProps } from '../src/components/draft-box/components/AiBatchGenerateBar/components/ToolBarInline/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from '@playwright/test'
import ToolBarInline from '../src/components/draft-box/components/AiBatchGenerateBar/components/ToolBarInline'

function videoModel(name: string, durationControl: 'select' | 'none'): VideoModelInfo {
  return {
    name,
    description: name,
    channel: durationControl === 'none' ? 'omniroute' : 'openai',
    modes: ['text2video'],
    resolutions: durationControl === 'none' ? [] : ['720p'],
    durations: durationControl === 'none' ? [] : [4, 8, 12],
    durationControl,
    maxInputImages: 0,
    aspectRatios: ['16:9'],
    tags: [],
    defaults: durationControl === 'none'
      ? { aspectRatio: '16:9' }
      : { resolution: '720p', aspectRatio: '16:9', duration: 8 },
    pricing: [],
  }
}

function renderToolbar(model: VideoModelInfo) {
  const fallbackState: AiBatchGenerateBarLocalState = {
    promptValue: '',
    promptEditorOpen: false,
    aspectRatio: '16:9',
    duration: 8,
    resolution: model.defaults?.resolution ?? '',
    modelType: model.name,
    selectedVideoModels: [model.name],
    videoModelSelectionMode: 'single',
    videoModelResolutions: {},
    videoModelParams: {
      [model.name]: {
        aspectRatio: '16:9',
        duration: 8,
      },
    },
    contentType: 'video',
    imageModel: '',
    selectedImageModels: [],
    imageModelSelectionMode: 'single',
    imageCount: 1,
    imageSize: '1K',
    quantity: 1,
    isDraftMode: false,
    captionSystemPrompt: '',
    captionSystemPromptDefault: '',
    moreOptionsOpen: false,
    selectedPlatforms: [],
  }

  const noop = () => undefined
  const props: ToolBarInlineProps = {
    configKey: `duration-render-${model.name}`,
    fallbackState,
    imageAspectRatios: [],
    imageModelOptions: [],
    imagePricing: [],
    videoModels: [model],
    videoAspectRatios: ['16:9'],
    videoResolutions: model.resolutions,
    videoModelOptions: [{ value: model.name, label: model.name }],
    resolvedVideoModelParams: fallbackState.videoModelParams,
    videoDurationLimits: { min: 4, max: 15 },
    isVideoEditMode: false,
    inputVideoDuration: null,
    isLoading: false,
    promptsExploreUrl: '',
    promptsExploreLabel: '',
    effectiveLimitsDetailed: {} as ToolBarInlineProps['effectiveLimitsDetailed'],
    disabledPlatforms: new Map(),
    actions: {
      onDraftModeChange: noop,
      onContentTypeChange: noop,
      onVideoModelsChange: noop,
      onVideoModelSelectionModeChange: noop,
      onVideoModelParamChange: noop,
      onResolutionChange: noop,
      onAspectRatioChange: noop,
      onDurationChange: noop,
      onQuantityChange: noop,
      onImageModelsChange: noop,
      onImageModelSelectionModeChange: noop,
      onImageCountChange: noop,
      onImageSizeChange: noop,
      onPlatformsChange: noop,
      onMoreOptionsChange: noop,
      onSubmit: noop,
    },
  }

  return renderToStaticMarkup(createElement(ToolBarInline, props))
}

for (const modelName of ['veoaifree-web/veo', 'veoaifree-web/seedance']) {
  test(`${modelName} renders the real toolbar without the duration selector`, () => {
    const html = renderToolbar(videoModel(modelName, 'none'))
    expect(html).not.toContain('data-testid="draftbox-ai-duration"')
  })
}

test('selectable-duration model renders the real toolbar duration selector baseline', () => {
  const html = renderToolbar(videoModel('selectable-video', 'select'))
  expect(html).toContain('data-testid="draftbox-ai-duration"')
})
