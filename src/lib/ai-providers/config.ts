import type { Provider } from '@/types'

export const PROVIDERS: Record<string, Provider> = {
  pollinations: {
    id: 'pollinations',
    name: 'Pollinations.ai',
    color: '#22d3ee',  // cyan
    description: 'Open source, illimitato, nessuna API key. Solo immagini. Veloce ma qualità variabile.',
    mediaTypes: ['image'],
    monthlyLimit: null,
    dailyLimit: null,
    resetCycle: 'none',
    isFree: true,
    requiresApiKey: false,
    baseUrl: 'https://image.pollinations.ai',
    models: [
      {
        id: 'flux',
        name: 'FLUX (default)',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
        maxWidth: 1280,
        maxHeight: 1280,
      },
      {
        id: 'flux-realism',
        name: 'FLUX Realism',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
      },
      {
        id: 'turbo',
        name: 'SDXL Turbo (fast)',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
      },
    ],
  },

  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    color: '#fbbf24',  // amber
    description: 'Crediti gratuiti iniziali. Alta qualità con FLUX.1 Dev. Primo avvio lento (~30s).',
    mediaTypes: ['image'],
    monthlyLimit: null,
    dailyLimit: null,
    resetCycle: 'monthly',
    isFree: true,
    requiresApiKey: true,
    baseUrl: 'https://api-inference.huggingface.co',
    models: [
      {
        id: 'black-forest-labs/FLUX.1-dev',
        name: 'FLUX.1 Dev',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
      },
      {
        id: 'stabilityai/stable-diffusion-xl-base-1.0',
        name: 'SDXL Base 1.0',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
      },
      {
        id: 'runwayml/stable-diffusion-v1-5',
        name: 'SD v1.5 (economico)',
        mediaType: 'image',
        defaultWidth: 512,
        defaultHeight: 512,
      },
    ],
  },

  magichour: {
    id: 'magichour',
    name: 'Magic Hour',
    color: '#a78bfa',  // violet
    // FIX: Descrizione corretta del sistema crediti
    description: '400 crediti signup + 100/giorno. Video 5s = ~150 crediti. Immagine = ~5 crediti.',
    mediaTypes: ['image', 'video'],
    // FIX: Magic Hour usa crediti, non un semplice conteggio giornaliero
    // 400 iniziali + 100/giorno reclamabili. Un video 5s costa ~150 crediti.
    // Mettiamo null perché il tracking reale è su magichour.ai
    monthlyLimit: null,
    dailyLimit: null,
    resetCycle: 'daily',
    isFree: true,
    requiresApiKey: true,
    baseUrl: 'https://api.magichour.ai',
    models: [
      {
        id: 'text-to-video',
        name: 'Text to Video',
        mediaType: 'video',
        maxDuration: 10,
      },
      {
        id: 'image-to-video',
        name: 'Image to Video',
        mediaType: 'video',
        maxDuration: 10,
      },
      {
        id: 'image-generation',
        name: 'AI Image',
        mediaType: 'image',
        defaultWidth: 1024,
        defaultHeight: 1024,
      },
    ],
  },
}

// ---- dimension helpers ----

export const ASPECT_RATIO_DIMENSIONS: Record<
  string,
  Record<string, { width: number; height: number }>
> = {
  '1:1':  { sm: { width: 512,  height: 512  }, md: { width: 1024, height: 1024 }, lg: { width: 1280, height: 1280 } },
  '16:9': { sm: { width: 768,  height: 432  }, md: { width: 1280, height: 720  }, lg: { width: 1920, height: 1080 } },
  '9:16': { sm: { width: 432,  height: 768  }, md: { width: 720,  height: 1280 }, lg: { width: 1080, height: 1920 } },
  '4:3':  { sm: { width: 640,  height: 480  }, md: { width: 1024, height: 768  }, lg: { width: 1280, height: 960  } },
  '3:4':  { sm: { width: 480,  height: 640  }, md: { width: 768,  height: 1024 }, lg: { width: 960,  height: 1280 } },
}

// Social platform recommended ratios for Acasting
export const SOCIAL_RATIOS: Record<string, { ratio: string; label: string }> = {
  instagram_post:    { ratio: '1:1',  label: 'Instagram Post' },
  instagram_story:   { ratio: '9:16', label: 'Instagram Story / Reels' },
  tiktok:            { ratio: '9:16', label: 'TikTok' },
  facebook_post:     { ratio: '16:9', label: 'Facebook Post' },
  facebook_cover:    { ratio: '16:9', label: 'Facebook Cover' },
  linkedin:          { ratio: '4:3',  label: 'LinkedIn' },
  headshot:          { ratio: '3:4',  label: 'Headshot / Portrait' },
}

// Credit cost estimates per Magic Hour (piano gratuito 480p)
export const MAGICHOUR_CREDIT_COSTS = {
  'text-to-video-5s':  150,  // 30fps × 5s
  'text-to-video-10s': 300,  // 30fps × 10s
  'image-to-video-5s': 150,
  'ai-image':          5,
}