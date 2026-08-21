'use client'

import type { VideoModelInfo } from '../../../src/api/ai/ai.types'
import type { ToolBarInlineProps } from '../../../src/components/draft-box/components/AiBatchGenerateBar/components/ToolBarInline/types'
import type { AiBatchGenerateBarLocalState } from '../../../src/components/draft-box/components/AiBatchGenerateBar/store'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import ToolBarInline from '../../../src/components/draft-box/components/AiBatchGenerateBar/components/ToolBarInline'

function videoModel(name: string): VideoModelInfo {
  const noDuration = name === 'veoaifree-web/veo' || name === 'veoaifree-web/seedance'
  return {
    name,
    description: name,
    channel: noDuration ? 'omniroute' : 'openai',
    modes: ['text2video'],
    resolutions: noDuration ? [] : ['720p'],
    durations: noDuration ? [] : [4, 8, 12],
    durationControl: noDuration ? 'none' : 'select',
    maxInputImages: 0,
    aspectRatios: ['16:9'],
    tags: [],
    defaults: noDuration
      ? { aspectRatio: '16:9' }
      : { resolution: '720p', aspectRatio: '16:9', duration: 8 },
    pricing: [],
  }
}

function ToolbarFixture() {
  const searchParams = useSearchParams()
  const model = videoModel(searchParams.get('model') ?? 'selectable-video')
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
      [model.name]: { aspectRatio: '16:9', duration: 8 },
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
    configKey: `duration-browser-${model.name}`,
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

  return (
    <div data-testid="duration-toolbar-fixture">
      <ToolBarInline {...props} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading toolbar fixture</div>}>
      <ToolbarFixture />
    </Suspense>
  )
}
