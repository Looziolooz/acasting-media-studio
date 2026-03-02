import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ASPECT_RATIO_DIMENSIONS } from '@/lib/ai-providers/config'
import type { GenerationRequest } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ============================================================
// POLLINATIONS - fully free, no API key
// ============================================================
async function generatePollinations(req: GenerationRequest): Promise<string> {
  const dims = ASPECT_RATIO_DIMENSIONS[req.aspectRatio]?.md ?? { width: 1024, height: 1024 }
  const width  = req.width  ?? dims.width
  const height = req.height ?? dims.height
  const seed   = req.seed   ?? Math.floor(Math.random() * 999999)
  const model  = req.model  ?? 'flux'

  const encoded = encodeURIComponent(req.enhancedPrompt ?? req.prompt)
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`

  // FIX: Pollinations genera immagini on-the-fly alla prima richiesta GET.
  // HEAD fallisce perché l'immagine non esiste ancora.
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) {
      throw new Error(`Pollinations error: ${res.status} ${res.statusText}`)
    }
    return url
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('Pollinations: timed out, returning URL for client-side loading')
      return url
    }
    throw err
  }
}

// ============================================================
// HUGGING FACE - free tier (API key required)
// ============================================================
async function generateHuggingFace(req: GenerationRequest): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured')

  const dims = ASPECT_RATIO_DIMENSIONS[req.aspectRatio]?.md ?? { width: 1024, height: 1024 }
  const model = req.model ?? 'black-forest-labs/FLUX.1-dev'

  const maxRetries = 2
  let lastError = ''

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: req.enhancedPrompt ?? req.prompt,
          parameters: {
            width:  req.width  ?? dims.width,
            height: req.height ?? dims.height,
          },
        }),
      }
    )

    // HuggingFace 503 = model loading → retry
    if (response.status === 503) {
      const data = await response.json().catch(() => ({}))
      const waitTime = data.estimated_time
        ? Math.min(data.estimated_time * 1000, 20000)
        : 10000
      lastError = `Model loading (attempt ${attempt + 1}/${maxRetries + 1})`
      console.log(`HuggingFace: model loading, waiting ${waitTime}ms...`)

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, waitTime))
        continue
      }
      throw new Error(
        `HuggingFace: model still loading after ${maxRetries + 1} attempts. Riprova tra un minuto.`
      )
    }

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`HuggingFace error ${response.status}: ${errText}`)
    }

    const blob   = await response.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mime   = blob.type || 'image/jpeg'
    return `data:${mime};base64,${base64}`
  }

  throw new Error(`HuggingFace: failed after retries. ${lastError}`)
}

// ============================================================
// MAGIC HOUR - crediti: 400 signup + 100/giorno reclamabili
// Un video 5s = ~150 crediti, un'immagine = ~5-10 crediti
//
// DOCUMENTAZIONE UFFICIALE (docs.magichour.ai):
// - Text-to-Video: POST /v1/text-to-video
//   { end_seconds, orientation, style: { prompt }, name, resolution }
// - Image-to-Video: POST /v1/image-to-video
//   { end_seconds, assets: { image_file_path }, style: { prompt }, name, resolution }
// - AI Images: POST /v1/ai-image-generator
//   { style: { prompt }, name, image_count, orientation, resolution }
// ============================================================

function getOrientation(aspectRatio: string): 'landscape' | 'portrait' | 'square' {
  if (aspectRatio === '16:9' || aspectRatio === '4:3') return 'landscape'
  if (aspectRatio === '9:16' || aspectRatio === '3:4') return 'portrait'
  return 'square'
}

function getResolution(mediaType: string): string {
  // Free plan: max 512px. Creator+: 1080p.
  // Usiamo 480p per sicurezza sul piano gratuito
  return mediaType === 'video' ? '480p' : '480p'
}

async function generateMagicHour(req: GenerationRequest): Promise<{ url: string; jobId: string }> {
  const apiKey = process.env.MAGICHOUR_API_KEY
  if (!apiKey) throw new Error('MAGICHOUR_API_KEY not configured')

  const isVideo = req.mediaType === 'video'
  const hasImages = req.imageUrls && req.imageUrls.length > 0
  const prompt = req.enhancedPrompt ?? req.prompt
  const orientation = getOrientation(req.aspectRatio)
  const resolution = getResolution(req.mediaType)

  if (isVideo) {
    let submitRes: Response

    if (hasImages) {
      // Image-to-Video
      // L'immagine deve essere un URL accessibile o un file caricato via /v1/files/upload-urls
      const imageUrl = req.imageUrls![0]

      submitRes = await fetch('https://api.magichour.ai/v1/image-to-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `acasting-img2vid-${Date.now()}`,
          end_seconds: 5,
          style: {
            prompt: prompt,
          },
          assets: {
            image_file_path: imageUrl,
          },
          orientation: orientation,
          resolution: resolution,
        }),
      })
    } else {
      // Text-to-Video — formato corretto secondo docs.magichour.ai
      submitRes = await fetch('https://api.magichour.ai/v1/text-to-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `acasting-t2v-${Date.now()}`,
          end_seconds: 5,
          orientation: orientation,
          style: {
            prompt: prompt,
          },
          resolution: resolution,
        }),
      })
    }

    if (!submitRes.ok) {
      const errText = await submitRes.text()
      console.error('Magic Hour video submit error:', errText)
      throw new Error(`Magic Hour video error ${submitRes.status}: ${errText}`)
    }

    const submitData = await submitRes.json()
    const jobId = submitData.id

    if (!jobId) {
      throw new Error('Magic Hour: no job ID returned')
    }

    // Poll per completamento — max 40s per stare nei limiti Vercel
    const maxAttempts = 8
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000))

      const statusRes = await fetch(`https://api.magichour.ai/v1/video-projects/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!statusRes.ok) {
        console.warn(`Magic Hour poll ${i + 1}: status ${statusRes.status}`)
        continue
      }

      const statusData = await statusRes.json()
      console.log(`Magic Hour poll ${i + 1}: status = ${statusData.status}`)

      if (statusData.status === 'complete') {
        const videoUrl = statusData.downloads?.[0]?.url ?? statusData.download_url
        if (videoUrl) return { url: videoUrl, jobId }
      }
      if (statusData.status === 'error' || statusData.status === 'canceled') {
        throw new Error(`Magic Hour video failed: ${statusData.error_message ?? statusData.status}`)
      }
    }

    // Non completato nel timeout — il webhook aggiornerà il DB
    console.warn(`Magic Hour video ${jobId}: still processing, deferring to webhook`)
    return { url: '', jobId }

  } else {
    // Image generation — formato corretto
    const imgRes = await fetch('https://api.magichour.ai/v1/ai-image-generator', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `acasting-img-${Date.now()}`,
        image_count: 1,
        orientation: orientation,
        style: {
          prompt: prompt,
        },
        resolution: resolution,
      }),
    })

    if (!imgRes.ok) {
      const errText = await imgRes.text()
      console.error('Magic Hour image error:', errText)
      throw new Error(`Magic Hour image error ${imgRes.status}: ${errText}`)
    }

    const imgData = await imgRes.json()
    const jobId: string = imgData.id

    if (!jobId) {
      throw new Error('Magic Hour image: no job ID returned')
    }

    // Poll per completamento
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000))

      const statusRes = await fetch(`https://api.magichour.ai/v1/image-projects/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!statusRes.ok) continue

      const statusData = await statusRes.json()
      console.log(`Magic Hour img poll ${i + 1}: status = ${statusData.status}`)

      if (statusData.status === 'complete') {
        const url = statusData.downloads?.[0]?.url ?? statusData.download_url
        if (url) return { url, jobId }
      }
      if (statusData.status === 'error' || statusData.status === 'canceled') {
        throw new Error(`Magic Hour image failed: ${statusData.error_message ?? statusData.status}`)
      }
    }

    console.warn(`Magic Hour image ${jobId}: still processing, deferring to webhook`)
    return { url: '', jobId }
  }
}

// ============================================================
// USAGE TRACKING
// ============================================================
async function trackUsage(provider: string) {
  const now = new Date()
  try {
    const existing = await prisma.providerUsage.findUnique({ where: { provider } })

    if (!existing) {
      await prisma.providerUsage.create({
        data: { provider, dailyCount: 1, monthlyCount: 1, totalCount: 1, lastUsed: now },
      })
      return
    }

    const lastReset = existing.dailyResetAt
    const shouldResetDaily =
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth()

    const shouldResetMonthly =
      now.getMonth() !== existing.monthlyResetAt.getMonth()

    await prisma.providerUsage.update({
      where: { provider },
      data: {
        dailyCount:    shouldResetDaily ? 1 : { increment: 1 },
        monthlyCount:  shouldResetMonthly ? 1 : { increment: 1 },
        totalCount:    { increment: 1 },
        lastUsed:      now,
        dailyResetAt:  shouldResetDaily ? now : undefined,
        monthlyResetAt: shouldResetMonthly ? now : undefined,
      },
    })
  } catch (err) {
    console.error('trackUsage error:', err)
  }
}

// ============================================================
// ROUTE HANDLER
// ============================================================
function validateRequest(body: unknown): body is GenerationRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return typeof b.prompt === 'string' && b.prompt.length > 0
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!validateRequest(body)) {
    return NextResponse.json({ error: 'Missing required field: prompt' }, { status: 400 })
  }

  const req = body as GenerationRequest
  const { provider, mediaType } = req

  if (!provider) {
    return NextResponse.json({ error: 'Missing required field: provider' }, { status: 400 })
  }

  if (!mediaType) {
    return NextResponse.json({ error: 'Missing required field: mediaType' }, { status: 400 })
  }

  // Create DB record con try-catch esplicito
  let generation
  try {
    generation = await prisma.generation.create({
      data: {
        prompt:        req.prompt,
        enhancedPrompt: req.enhancedPrompt,
        provider:      req.provider,
        model:         req.model ?? 'flux',
        mediaType:     req.mediaType,
        task:          req.task ?? 'general',
        style:         req.style ?? 'natural',
        lighting:      req.lighting ?? 'natural',
        composition:   req.composition ?? 'auto',
        aspectRatio:   req.aspectRatio ?? '16:9',
        width:         req.width,
        height:        req.height,
        seed:          req.seed,
        status:        'processing',
      },
    })
  } catch (dbErr) {
    console.error('Database error:', dbErr)
    return NextResponse.json(
      { error: 'Database connection error. Verifica DATABASE_URL e esegui prisma migrate deploy.' },
      { status: 500 }
    )
  }

  try {
    let resultUrl: string
    let providerJobId: string | undefined

    if (provider === 'pollinations') {
      resultUrl = await generatePollinations(req)
    } else if (provider === 'huggingface') {
      resultUrl = await generateHuggingFace(req)
    } else if (provider === 'magichour') {
      const result = await generateMagicHour(req)
      resultUrl = result.url
      providerJobId = result.jobId
    } else {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'failed', errorMessage: `Unknown provider: ${provider}` },
      }).catch(() => {})
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    // Gestisci il caso in cui Magic Hour non ha completato in tempo
    const isStillProcessing = !resultUrl && providerJobId

    const updated = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status:       isStillProcessing ? 'processing' : 'completed',
        resultUrl:    resultUrl || null,
        providerJobId,
        completedAt:  isStillProcessing ? undefined : new Date(),
      },
    })

    await trackUsage(provider)

    return NextResponse.json({
      success: true,
      generation: updated,
      needsPolling: isStillProcessing,
    })

  } catch (err) {
    console.error('Generation error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'

    try {
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'failed', errorMessage: message },
      })
    } catch (updateErr) {
      console.error('Failed to update generation status:', updateErr)
    }

    return NextResponse.json({ error: message, generationId: generation.id }, { status: 500 })
  }
}