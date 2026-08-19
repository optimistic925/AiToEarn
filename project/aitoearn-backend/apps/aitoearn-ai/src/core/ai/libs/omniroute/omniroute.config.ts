import { createZodDto } from '@yikart/common'
import { z } from 'zod'

export const OMNIROUTE_DEFAULT_TIMEOUT_MS = 12 * 60 * 1000

export const omniRouteConfigSchema = z.object({
  apiKey: z.string().describe('OmniRoute API key, sent as a Bearer token'),
  baseUrl: z.string().describe('OmniRoute API root, including the /v1 prefix'),
  timeout: z.number().default(OMNIROUTE_DEFAULT_TIMEOUT_MS).describe('Request timeout in milliseconds; defaults to 12 minutes to cover provider polling plus transfer margin'),
})

export class OmniRouteConfig extends createZodDto(omniRouteConfigSchema) {}
