import { Injectable } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import axios, { AxiosError, AxiosInstance } from 'axios'
import { AiAvailabilityService } from '../../../ai-availability'
import { OmniRouteConfig } from './omniroute.config'
import {
  OmniRouteVideoGenerationRequest,
  OmniRouteVideoGenerationResponse,
  OmniRouteVideoModelCatalogResponse,
} from './omniroute.interface'

@Injectable()
export class OmniRouteLibService {
  private readonly httpClient: AxiosInstance

  constructor(
    private readonly config: OmniRouteConfig,
    private readonly aiAvailability: AiAvailabilityService,
  ) {
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl.replace(/\/+$/, ''),
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    })
  }

  async createVideo(request: OmniRouteVideoGenerationRequest): Promise<OmniRouteVideoGenerationResponse> {
    return this.aiAvailability.execute(
      { provider: 'omniroute', operation: 'videoGeneration', model: request.model },
      async () => {
        try {
          const response = await this.httpClient.post<OmniRouteVideoGenerationResponse>('/videos/generations', request)
          const result = response.data
          if (!Array.isArray(result?.data) || !result.data[0]?.url) {
            throw new AppException(ResponseCode.AiCallFailed, { error: 'OmniRoute returned a malformed video response' })
          }
          return result
        }
        catch (error) {
          if (error instanceof AppException) {
            throw error
          }
          throw this.normalizeError(error)
        }
      },
    )
  }

  async listVideoModels(): Promise<OmniRouteVideoModelCatalogResponse> {
    return this.aiAvailability.execute(
      { provider: 'omniroute', operation: 'listVideoModels' },
      async () => {
        try {
          const response = await this.httpClient.get<OmniRouteVideoModelCatalogResponse>('/videos/generations')
          const result = response.data
          if (!Array.isArray(result?.data)) {
            throw new AppException(ResponseCode.AiCallFailed, { error: 'OmniRoute returned a malformed video model catalog' })
          }
          return result
        }
        catch (error) {
          if (error instanceof AppException) {
            throw error
          }
          throw this.normalizeError(error)
        }
      },
    )
  }

  private normalizeError(error: unknown): AppException {
    const axiosError = error as AxiosError<Record<string, unknown>>
    const status = axiosError.response?.status
    const data = axiosError.response?.data
    const nestedError = data?.['error']
    const nestedMessage = typeof nestedError === 'object' && nestedError !== null
      ? (nestedError as Record<string, unknown>)['message']
      : undefined
    const message = typeof nestedMessage === 'string'
      ? nestedMessage
      : typeof data?.['message'] === 'string'
        ? data.message
        : axiosError.message || 'OmniRoute request failed'

    return new AppException(ResponseCode.AiCallFailed, {
      error: status ? `OmniRoute API error (${status}): ${message}` : `OmniRoute API error: ${message}`,
    })
  }
}
