import '@/api/ai/ai.types'

declare module '@/api/ai/ai.types' {
  interface VideoModelInfo {
    durationControl?: 'select' | 'none'
  }
}
