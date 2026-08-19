import type { UserVideoGenerationRequestDto } from '../video.dto'
import type { VideoTaskInput } from '../video.vo'
import { Injectable } from '@nestjs/common'
import { AssetsService } from '@yikart/assets'
import { AppException, FileUtil, ResponseCode } from '@yikart/common'
import { AiLogChannel, AiLogRepository, AiLogStatus, AiLogType, AssetType } from '@yikart/mongodb'
import { TaskStatus } from '../../../../common'
import { OmniRouteLibService, OmniRouteVideoGenerationResponse } from '../../libs/omniroute'
import { ModelsConfigService } from '../../models-config'

interface OmniRouteModelConfig {
  name: string
  modes: string[]
  maxInputImages: number
  runtimeModels?: Array<{
    model: string
    mode?: string
    resolution?: string
  }>
}

export interface OmniRouteVideoAiLogResponse extends OmniRouteVideoGenerationResponse {
  videoUrl: string
}

@Injectable()
export class OmniRouteVideoService {
  constructor(
    private readonly omniRouteLibService: OmniRouteLibService,
    private readonly aiLogRepo: AiLogRepository,
    private readonly assetsService: AssetsService,
    private readonly modelsConfigService: ModelsConfigService,
  ) {}

  async createFromRequest(request: UserVideoGenerationRequestDto): Promise<{ id: string }> {
    const modelConfig = this.getModelConfig(request.model)
    const mode = request.mode ?? 'text2video'
    if (!modelConfig.modes.includes(mode)) {
      throw new AppException(ResponseCode.InvalidModel)
    }

    const providerModel = this.getProviderModel(modelConfig, mode, request.resolution)
    const startedAt = new Date()
    const result = await this.omniRouteLibService.createVideo({
      model: providerModel,
      prompt: request.prompt,
      duration: request.duration,
      resolution: request.resolution,
      aspect_ratio: request.ratio ?? (request.metadata?.['aspectRatio'] as string | undefined),
    })

    const first = result.data[0]!
    const uploaded = first.url
      ? await this.assetsService.uploadFromUrl(request.userId, {
          url: first.url,
          type: AssetType.AiVideo,
        }, request.model)
      : await this.assetsService.uploadFromBuffer(
          request.userId,
          Buffer.from(first.b64_json!, 'base64'),
          {
            type: AssetType.AiVideo,
            mimeType: first.format === 'webm' ? 'video/webm' : 'video/mp4',
            filename: `omniroute-video.${first.format === 'webm' ? 'webm' : 'mp4'}`,
          },
          request.model,
        )

    const elapsedMs = Date.now() - startedAt.getTime()
    const response: OmniRouteVideoAiLogResponse = {
      ...result,
      videoUrl: uploaded.asset.path,
    }

    const aiLog = await this.aiLogRepo.create({
      userId: request.userId,
      userType: request.userType,
      model: request.model,
      channel: AiLogChannel.OmniRoute,
      startedAt,
      duration: elapsedMs,
      type: AiLogType.Video,
      request: {
        model: request.model,
        prompt: request.prompt,
        groupId: request.groupId,
        mode,
        resolution: request.resolution,
        ratio: request.ratio ?? (request.metadata?.['aspectRatio'] as string | undefined),
        duration: request.duration,
        metadata: {
          ...(request.metadata ?? {}),
          providerModel,
        },
      },
      response,
      status: AiLogStatus.Success,
    })

    return { id: aiLog.id }
  }

  extractInput(request: {
    prompt?: string
    groupId?: string
    duration?: number
    resolution?: string
    ratio?: string
  }): VideoTaskInput {
    return {
      prompt: request.prompt ?? '',
      groupId: request.groupId,
      duration: request.duration,
      resolution: request.resolution,
      aspectRatio: request.ratio,
    }
  }

  getTaskResult(result: OmniRouteVideoAiLogResponse) {
    return {
      status: TaskStatus.Success,
      videoUrl: FileUtil.buildUrl(result.videoUrl),
      error: undefined,
    }
  }

  private getModelConfig(model: string): OmniRouteModelConfig {
    const modelConfig = this.modelsConfigService.config.video.generation.find(m => m.name === model)
    if (!modelConfig || modelConfig.channel !== AiLogChannel.OmniRoute) {
      throw new AppException(ResponseCode.InvalidModel)
    }
    return modelConfig as OmniRouteModelConfig
  }

  private getProviderModel(modelConfig: OmniRouteModelConfig, mode: string, resolution?: string): string {
    if (!modelConfig.runtimeModels?.length) {
      return modelConfig.name
    }

    const runtimeModel = modelConfig.runtimeModels
      .filter(item => (item.mode == null || item.mode === mode) && (item.resolution == null || item.resolution === resolution))
      .sort((a, b) => Number(b.mode != null) + Number(b.resolution != null) - Number(a.mode != null) - Number(a.resolution != null))[0]
    if (!runtimeModel) {
      throw new AppException(ResponseCode.InvalidModel)
    }
    return runtimeModel.model
  }
}
