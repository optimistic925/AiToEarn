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

export const OMNIROUTE_MAX_VIDEO_BYTES = 100 * 1024 * 1024
export const OMNIROUTE_MAX_BASE64_LENGTH = 4 * Math.ceil(OMNIROUTE_MAX_VIDEO_BYTES / 3)
export const OMNIROUTE_MAX_RESPONSE_BYTES = OMNIROUTE_MAX_BASE64_LENGTH + 64 * 1024
export const OMNIROUTE_SUPPORTED_VIDEO_FORMATS = new Set(['mp4', 'webm'])

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const MAX_PROVIDER_ERROR_MESSAGE_LENGTH = 512

export function getOmniRouteDecodedBase64Size(value: string): number | null {
  if (!value || value.length % 4 !== 0 || value.trim() !== value || !BASE64_PATTERN.test(value)) {
    return null
  }

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return (value.length / 4) * 3 - padding
}

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
      maxContentLength: OMNIROUTE_MAX_RESPONSE_BYTES,
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
          return this.validateVideoResponse(response.data)
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

  private validateVideoResponse(result: unknown): OmniRouteVideoGenerationResponse {
    if (!result || typeof result !== 'object') {
      throw this.malformedResponse()
    }

    const data = (result as Record<string, unknown>)['data']
    if (!Array.isArray(data) || data.length === 0) {
      throw this.malformedResponse()
    }

    const first = data[0]
    if (!first || typeof first !== 'object') {
      throw this.malformedResponse()
    }

    const item = first as Record<string, unknown>
    const url = item['url']
    const base64 = item['b64_json']
    const hasUrl = url !== undefined
    const hasBase64 = base64 !== undefined

    if (!hasUrl && !hasBase64) {
      throw this.malformedResponse()
    }

    if (hasUrl) {
      if (typeof url !== 'string' || !this.isValidHttpUrl(url)) {
        throw this.malformedResponse('OmniRoute returned an invalid video URL')
      }
    }

    if (hasBase64) {
      if (typeof base64 !== 'string' || !base64) {
        throw this.malformedResponse('OmniRoute returned an invalid base64 video payload')
      }
      if (base64.length > OMNIROUTE_MAX_BASE64_LENGTH) {
        throw this.mediaTooLarge()
      }

      const decodedSize = getOmniRouteDecodedBase64Size(base64)
      if (decodedSize == null) {
        throw this.malformedResponse('OmniRoute returned malformed base64 video data')
      }
      if (decodedSize > OMNIROUTE_MAX_VIDEO_BYTES) {
        throw this.mediaTooLarge()
      }

      const format = item['format']
      if (typeof format !== 'string' || !OMNIROUTE_SUPPORTED_VIDEO_FORMATS.has(format.trim().toLowerCase())) {
        throw this.malformedResponse('OmniRoute returned an unsupported video format')
      }
    }

    return result as OmniRouteVideoGenerationResponse
  }

  private isValidHttpUrl(value: string): boolean {
    if (!value.trim() || value.trim() !== value) {
      return false
    }
    try {
      const url = new URL(value)
      return url.protocol === 'https:' || url.protocol === 'http:'
    }
    catch {
      return false
    }
  }

  private malformedResponse(message = 'OmniRoute returned a malformed video response'): AppException {
    return new AppException(ResponseCode.AiCallFailed, { error: message })
  }

  private mediaTooLarge(): AppException {
    return new AppException(ResponseCode.AiCallFailed, {
      error: `OmniRoute video exceeds the ${OMNIROUTE_MAX_VIDEO_BYTES / 1024 / 1024} MiB media limit`,
    })
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
        ? data['message']
        : axiosError.message || 'OmniRoute request failed'
    const safeMessage = this.sanitizeProviderMessage(message)

    return new AppException(ResponseCode.AiCallFailed, {
      error: status ? `OmniRoute API error (${status}): ${safeMessage}` : `OmniRoute API error: ${safeMessage}`,
    })
  }

  private sanitizeProviderMessage(message: string): string {
    const redacted = this.config.apiKey
      ? message.split(this.config.apiKey).join('[REDACTED]')
      : message
    if (redacted.length <= MAX_PROVIDER_ERROR_MESSAGE_LENGTH) {
      return redacted
    }
    return `${redacted.slice(0, MAX_PROVIDER_ERROR_MESSAGE_LENGTH - 3)}...`
  }
}
