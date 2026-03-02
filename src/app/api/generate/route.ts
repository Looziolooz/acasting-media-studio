import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ASPECT_RATIO_DIMENSIONS } from '@/lib/ai-providers/config'
import type { GenerationRequest } from '@/types'

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

  // Pollinations is a GET request that returns the image directly
  // We just return the URL — client can use it as <img src>
  // Validate it responds
  const res = await fetch(url, { method: 'HEAD' })
  if (!res.ok) throw new Error(`Pollinations error: ${res.status}`)
  return url
}

// ============================================================
// HUGGING FACE - free tier (API key required)
// ============================================================
async function generateHuggingFace(req: GenerationRequest): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not configured')

  const dims = ASPECT_RATIO_DIMENSIONS[req.aspectRatio]?.md ?? { width: 1024, height: 1024 }
  const model = req.model ?? 'black-forest-labs/FLUX.1-dev'

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

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`HuggingFace error ${response.status}: ${errText}`)
  }

  // Returns binary blob → convert to base64 data URL
  const blob   = await response.blob()
  const buffer = Buffer.from(await blob.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mime   = blob.type || 'image/jpeg'
  return `data:${mime};base64,${base64}`
}

// ============================================================
// MAGIC HOUR - 400 signup + 100 daily credits, video + image
// ============================================================
async function generateMagicHour(req: GenerationRequest): Promise<{ url: string; jobId: string }> {
  const apiKey = process.env.MAGICHOUR_API_KEY
  if (!apiKey) throw new Error('MAGICHOUR_API_KEY not configured')

  const isVideo = req.mediaType === 'video'
  const hasImages = req.imageUrls && req.imageUrls.length > 0

  if (isVideo) {
    let submitRes: Response
    let jobId: string

    if (hasImages) {
      // Image-to-video: use first image as the source
      const imageUrl = req.imageUrls![0]
      submitRes = await fetch('https://api.magichour.ai/v1/image-to-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `acasting-img2vid-${Date.now()}`,
          image_url: imageUrl,
          prompt: req.enhancedPrompt ?? req.prompt,
          output: {
            width: 1280,
            height: 720,
            frame_rate: 24,
            duration: 5,
          },
        }),
      })
    } else {
      // Text-to-video
      submitRes = await fetch('https://api.magichour.ai/v1/text-to-video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `acasting-${Date.now()}`,
          style: {
            prompt: req.enhancedPrompt ?? req.prompt,
          },
          output: {
            width: 1280,
            height: 720,
            frame_rate: 24,
            duration: 5,
          },
        }),
      })
    }

    if (!submitRes.ok) {
      const errText = await submitRes.text()
      throw new Error(`Magic Hour submit error ${submitRes.status}: ${errText}`)
    }

    const submitData = await submitRes.json()
    jobId = submitData.id

    // Step 2: poll for completion (max 120s)
    const maxAttempts = 24
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000))

      const statusRes = await fetch(`https://api.magichour.ai/v1/video-projects/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })

      if (!statusRes.ok) continue
      const statusData = await statusRes.json()

      if (statusData.status === 'complete') {
        const videoUrl = statusData.downloads?.[0]?.url ?? statusData.download_url
        if (videoUrl) return { url: videoUrl, jobId }
      }
      if (statusData.status === 'error') {
        throw new Error(`Magic Hour video failed: ${statusData.error_message ?? 'unknown'}`)
      }
    }
    throw new Error('Magic Hour: timeout after 120 seconds')

  } else {
    // Image generation
    const imgRes = await fetch('https://api.magichour.ai/v1/ai-image-generator', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `acasting-img-${Date.now()}`,
        style: {
          prompt: req.enhancedPrompt ?? req.prompt,
        },
        output: {
          width:  1024,
          height: 1024,
        },
      }),
    })

    if (!imgRes.ok) {
      const errText = await imgRes.text()
      throw new Error(`Magic Hour image error ${imgRes.status}: ${errText}`)
    }

    const imgData = await imgRes.json()
    const jobId: string = imgData.id

    // Poll for completion
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const statusRes = await fetch(`https://api.magichour.ai/v1/image-projects/${jobId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!statusRes.ok) continue
      const statusData = await statusRes.json()
      if (statusData.status === 'complete') {
        const url = statusData.downloads?.[0]?.url ?? statusData.download_url
        if (url) return { url, jobId }
      }
      if (statusData.status === 'error') {
        throw new Error(`Magic Hour image failed: ${statusData.error_message}`)
      }
    }
    throw new Error('Magic Hour image: timeout')
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

    // Reset daily if needed
    const lastReset = existing.dailyResetAt
    const shouldResetDaily =
      now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth()

    // Reset monthly if needed
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
export async function POST(request: NextRequest) {
  let body: GenerationRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { provider, mediaType } = body

  // Create DB record
  const generation = await prisma.generation.create({
    data: {
      prompt:        body.prompt,
      enhancedPrompt: body.enhancedPrompt,
      provider,
      model:         body.model,
      mediaType,
      task:          body.task,
      style:         body.style,
      lighting:      body.lighting,
      composition:   body.composition,
      aspectRatio:   body.aspectRatio,
      width:         body.width,
      height:        body.height,
      seed:          body.seed,
      status:        'processing',
    },
  })

  try {
    let resultUrl: string
    let providerJobId: string | undefined

    if (provider === 'pollinations') {
      resultUrl = await generatePollinations(body)
    } else if (provider === 'huggingface') {
      resultUrl = await generateHuggingFace(body)
    } else if (provider === 'magichour') {
      const result = await generateMagicHour(body)
      resultUrl = result.url
      providerJobId = result.jobId
    } else {
      return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    // Update DB
    const updated = await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status:       'completed',
        resultUrl,
        providerJobId,
        completedAt:  new Date(),
      },
    })

    await trackUsage(provider)

    return NextResponse.json({ success: true, generation: updated })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await prisma.generation.update({
      where: { id: generation.id },
      data: { status: 'failed', errorMessage: message },
    })

    return NextResponse.json({ error: message, generationId: generation.id }, { status: 500 })
  }
}
