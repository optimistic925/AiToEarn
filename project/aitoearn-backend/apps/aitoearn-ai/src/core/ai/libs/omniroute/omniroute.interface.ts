export interface OmniRouteVideoGenerationRequest {
  model: string
  prompt: string
  duration?: number
  resolution?: string
  aspect_ratio?: string
  image?: string
}

export interface OmniRouteVideoResultItem {
  url: string
  format?: string
}

export interface OmniRouteVideoGenerationResponse {
  created?: number
  data: OmniRouteVideoResultItem[]
}

export interface OmniRouteVideoModelCatalogEntry {
  id: string
  name?: string
  type?: string
  owned_by?: string
  [key: string]: unknown
}

export interface OmniRouteVideoModelCatalogResponse {
  object?: string
  data: OmniRouteVideoModelCatalogEntry[]
}
