import type {
  AcastingTask,
  ImageStyle,
  LightingPreset,
  CompositionPreset,
  PromptEnhancement,
  ProviderId,
} from '@/types'

// ---- task modifiers tailored for Acasting ----
const TASK_MODIFIERS: Record<AcastingTask, string> = {
  'casting-post':
    'professional casting announcement, talent showcase, Swedish entertainment industry, diverse cast, confident poses, production-ready visuals',
  'video-teaser':
    'cinematic teaser, dynamic motion, engaging opening sequence, film industry aesthetic, 5-10 second clip concept, Scandinavian production quality',
  'social-thumbnail':
    'eye-catching thumbnail, high contrast, bold visual hierarchy, optimized for social feed, scroll-stopping composition, platform-native feel',
  'actor-headshot':
    'professional headshot, actor portfolio, expressive face, clean background, industry-standard framing, Swedish talent agency quality',
  'scene-backdrop':
    'production backdrop, atmospheric scene, professional set design, versatile background, cinematic location',
  'product-showcase':
    'product hero shot, clean presentation, commercial quality, brand-ready visual',
  'advertising':
    'advertising visual, persuasive composition, brand message, commercial aesthetic',
  'abstract':
    'creative abstract, artistic composition, unique visual language',
}

const STYLE_MODIFIERS: Record<ImageStyle, string> = {
  'photorealistic':  'photorealistic, 8K resolution, hyperdetailed, DSLR quality, sharp focus',
  'cinematic':       'cinematic photography, film grain, anamorphic lens, color graded, movie still quality',
  'digital-art':     'digital art, clean lines, vibrant colors, professional illustration',
  'editorial':       'editorial photography, magazine quality, high fashion aesthetic, Scandinavian editorial style',
  'minimal-clean':   'minimalist, clean white space, refined composition, sophisticated simplicity',
  'dramatic':        'dramatic lighting, high contrast, powerful atmosphere, emotional depth',
  'anime':           'anime style, cel shading, clean linework, expressive characters',
  'watercolor':      'watercolor painting, soft edges, organic textures, artistic flow',
}

const LIGHTING_MODIFIERS: Record<LightingPreset, string> = {
  'golden-hour':      'golden hour lighting, warm tones, soft shadows, magic hour atmosphere',
  'studio-light':     'professional studio lighting, soft box, even exposure, clean shadows',
  'dramatic-shadows':  'dramatic chiaroscuro, deep shadows, high contrast lighting, noir atmosphere',
  'neon-glow':        'neon lighting, cyberpunk glow, colored light sources, urban night atmosphere',
  'natural-soft':     'natural daylight, soft diffused light, Nordic natural light, Scandinavian aesthetic',
  'backlit':          'backlit silhouette, rim lighting, luminous edges, contre-jour',
}

const COMPOSITION_MODIFIERS: Record<CompositionPreset, string> = {
  'rule-of-thirds':    'rule of thirds composition, dynamic balance, professional framing',
  'centered-portrait': 'centered composition, symmetrical balance, portrait framing, direct gaze',
  'wide-shot':         'wide establishing shot, environmental context, cinematic scope',
  'close-up':          'extreme close-up, intimate detail, emotional impact, selective focus',
  'birds-eye':         "bird's eye view, overhead perspective, flat lay aesthetic",
}

const QUALITY_SUFFIX = ', masterpiece, best quality, professional grade, award-winning photography'

// ---- provider suggestion logic ----
function suggestProvider(task: AcastingTask, mediaType: 'image' | 'video'): {
  provider: ProviderId
  model: string
  reasoning: string
} {
  if (mediaType === 'video') {
    return {
      provider: 'magichour',
      model: 'text-to-video',
      reasoning: 'Magic Hour è l\'unico provider con API video gratuita (100 crediti/giorno)',
    }
  }

  // For images: Pollinations for high-volume tasks, HF for quality-critical
  if (task === 'actor-headshot' || task === 'editorial') {
    return {
      provider: 'huggingface',
      model: 'black-forest-labs/FLUX.1-dev',
      reasoning: 'FLUX.1 Dev su HuggingFace produce headshot di qualità superiore',
    }
  }

  return {
    provider: 'pollinations',
    model: 'flux',
    reasoning: 'Pollinations con FLUX è illimitato e ottimo per post social e thumbnail',
  }
}

// ---- main enhance function ----
export function enhancePrompt(params: {
  prompt: string
  task: AcastingTask
  style: ImageStyle
  lighting: LightingPreset
  composition: CompositionPreset
  mediaType?: 'image' | 'video'
}): PromptEnhancement {
  const { prompt, task, style, lighting, composition, mediaType = 'image' } = params

  const taskMod    = TASK_MODIFIERS[task]
  const styleMod   = STYLE_MODIFIERS[style]
  const lightMod   = LIGHTING_MODIFIERS[lighting]
  const compMod    = COMPOSITION_MODIFIERS[composition]

  const enhanced = [
    prompt,
    taskMod,
    styleMod,
    lightMod,
    compMod,
    QUALITY_SUFFIX,
  ].join(', ')

  const suggestion = suggestProvider(task, mediaType)

  // Extract meaningful tags from the prompt
  const tags = [
    task.replace('-', ' '),
    style.replace('-', ' '),
    lighting.replace('-', ' '),
  ]

  return {
    originalPrompt: prompt,
    enhancedPrompt: enhanced,
    suggestedProvider: suggestion.provider,
    suggestedModel: suggestion.model,
    reasoning: suggestion.reasoning,
    tags,
  }
}

// ---- task labels in Italian ----
export const TASK_LABELS: Record<AcastingTask, string> = {
  'casting-post':     '📋 Post Casting',
  'video-teaser':     '🎬 Video Teaser',
  'social-thumbnail': '📱 Thumbnail Social',
  'actor-headshot':   '🎭 Headshot Attore',
  'scene-backdrop':   '🎨 Scenario / Sfondo',
  'product-showcase': '📦 Product Showcase',
  'advertising':      '📣 Pubblicità',
  'abstract':         '✨ Astratto',
}

export const STYLE_LABELS: Record<ImageStyle, string> = {
  'photorealistic': 'Fotorealistico',
  'cinematic':      'Cinematografico',
  'digital-art':    'Digital Art',
  'editorial':      'Editoriale',
  'minimal-clean':  'Minimal / Clean',
  'dramatic':       'Drammatico',
  'anime':          'Anime',
  'watercolor':     'Acquerello',
}

export const LIGHTING_LABELS: Record<LightingPreset, string> = {
  'golden-hour':       'Golden Hour',
  'studio-light':      'Studio Light',
  'dramatic-shadows':  'Luci Drammatiche',
  'neon-glow':         'Neon / Glow',
  'natural-soft':      'Naturale Soft',
  'backlit':           'Controluce',
}

export const COMPOSITION_LABELS: Record<CompositionPreset, string> = {
  'rule-of-thirds':    'Regola dei Terzi',
  'centered-portrait': 'Centrato / Portrait',
  'wide-shot':         'Wide Shot',
  'close-up':          'Close-up',
  'birds-eye':         "Vista dall'alto",
}
