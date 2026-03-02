// ============================================================
// PROVIDERS
// ============================================================

export type ProviderId = 'pollinations' | 'huggingface' | 'magichour'

export type MediaType = 'image' | 'video'

export interface Provider {
  id: ProviderId
  name: string
  color: string
  description: string
  mediaTypes: MediaType[]
  monthlyLimit: number | null  // null = unlimited
  dailyLimit: number | null
  resetCycle: 'daily' | 'monthly' | 'none'
  isFree: boolean
  requiresApiKey: boolean
  models: ProviderModel[]
  baseUrl: string
}

export interface ProviderModel {
  id: string
  name: string
  mediaType: MediaType
  maxWidth?: number
  maxHeight?: number
  maxDuration?: number  // seconds for video
  defaultWidth?: number
  defaultHeight?: number
}

// ============================================================
// GENERATION
// ============================================================

export type GenerationStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export type AcastingTask =
  | 'casting-post'        // Post immagini per casting jobs
  | 'video-teaser'        // Video teaser per annunci
  | 'social-thumbnail'    // Thumbnail social
  | 'actor-headshot'      // Headshot stilizzati attori
  | 'scene-backdrop'      // Sfondi/scenari
  | 'product-showcase'
  | 'advertising'
  | 'abstract'

export type ImageStyle =
  | 'photorealistic'
  | 'cinematic'
  | 'digital-art'
  | 'editorial'
  | 'minimal-clean'
  | 'dramatic'
  | 'anime'
  | 'watercolor'

export type LightingPreset =
  | 'golden-hour'
  | 'studio-light'
  | 'dramatic-shadows'
  | 'neon-glow'
  | 'natural-soft'
  | 'backlit'

export type CompositionPreset =
  | 'rule-of-thirds'
  | 'centered-portrait'
  | 'wide-shot'
  | 'close-up'
  | 'birds-eye'

export interface GenerationRequest {
  prompt: string
  enhancedPrompt?: string
  provider: ProviderId
  model: string
  mediaType: MediaType
  task: AcastingTask
  style: ImageStyle
  lighting: LightingPreset
  composition: CompositionPreset
  aspectRatio: AspectRatio
  width?: number
  height?: number
  seed?: number
}

export interface GenerationJob {
  id: string
  request: GenerationRequest
  status: GenerationStatus
  resultUrl?: string
  thumbnailUrl?: string
  errorMessage?: string
  creditsUsed?: number
  createdAt: Date
  completedAt?: Date
  providerJobId?: string  // for async polling (Magic Hour)
}

// ============================================================
// PROMPT ENGINEER
// ============================================================

export interface PromptEnhancement {
  originalPrompt: string
  enhancedPrompt: string
  suggestedProvider: ProviderId
  suggestedModel: string
  reasoning: string
  tags: string[]
}

// ============================================================
// USAGE MONITORING
// ============================================================

export type UsageLevel = 'safe' | 'warning' | 'critical' | 'exhausted'

export interface ProviderUsageStats {
  providerId: ProviderId
  usageCount: number
  dailyLimit: number | null
  monthlyLimit: number | null
  dailyUsed: number
  monthlyUsed: number
  resetDate: Date
  level: UsageLevel
  percentageDaily: number
  percentageMonthly: number
}

// ============================================================
// QUEUE
// ============================================================

export interface QueueItem {
  jobId: string
  position: number
  estimatedWaitSeconds: number
}

// ============================================================
// STORE STATE
// ============================================================

export interface AppState {
  // Active generation
  currentRequest: Partial<GenerationRequest>
  setCurrentRequest: (req: Partial<GenerationRequest>) => void
  
  // Queue
  queue: GenerationJob[]
  addToQueue: (job: GenerationJob) => void
  updateJob: (id: string, updates: Partial<GenerationJob>) => void
  removeFromQueue: (id: string) => void
  
  // History
  history: GenerationJob[]
  setHistory: (history: GenerationJob[]) => void
  
  // Usage
  usageStats: ProviderUsageStats[]
  setUsageStats: (stats: ProviderUsageStats[]) => void
  
  // UI
  activeTab: 'generate' | 'queue' | 'history' | 'usage'
  setActiveTab: (tab: AppState['activeTab']) => void
  
  // Preview
  previewJob: GenerationJob | null
  setPreviewJob: (job: GenerationJob | null) => void
}
