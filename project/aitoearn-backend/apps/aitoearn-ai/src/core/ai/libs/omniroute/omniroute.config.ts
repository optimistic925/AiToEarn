import { createZodDto } from '@yikart/common'
import { z } from 'zod'

export const omniRouteConfigSchema = z.object({
  apiKey: z.string().describe('OmniRoute API key, sent as a Bearer token'),
  baseUrl: z.string().describe('OmniRoute API root, including the /v1 prefix'),
  timeout: z.number().default(300 * 1000).describe('Request timeout in milliseconds'),
})

export class OmniRouteConfig extends createZodDto(omniRouteConfigSchema) {}
