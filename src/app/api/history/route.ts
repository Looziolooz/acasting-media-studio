import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const provider   = searchParams.get('provider')
    const mediaType  = searchParams.get('mediaType')
    const task       = searchParams.get('task')
    const status     = searchParams.get('status')
    const limit      = parseInt(searchParams.get('limit') ?? '50')
    const offset     = parseInt(searchParams.get('offset') ?? '0')

    const where: Record<string, string> = {}
    if (provider)  where.provider  = provider
    if (mediaType) where.mediaType = mediaType
    if (task)      where.task      = task
    if (status)    where.status    = status

    const [items, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.generation.count({ where }),
    ])

    const formatted = items.map(item => ({
      id: item.id,
      request: {
        prompt: item.prompt,
        enhancedPrompt: item.enhancedPrompt,
        provider: item.provider,
        model: item.model,
        mediaType: item.mediaType,
        task: item.task,
        style: item.style,
        lighting: item.lighting,
        composition: item.composition,
        aspectRatio: item.aspectRatio,
        width: item.width,
        height: item.height,
        seed: item.seed,
        imageUrls: [],
      },
      status: item.status,
      resultUrl: item.resultUrl,
      thumbnailUrl: item.thumbnailUrl,
      errorMessage: item.errorMessage,
      creditsUsed: item.creditsUsed,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      providerJobId: item.providerJobId,
    }))

    return NextResponse.json({ items: formatted, total, limit, offset })
  } catch (err) {
    console.error('History API error:', err)
    return NextResponse.json({ error: 'Failed to fetch history', items: [], total: 0 }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await prisma.generation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('History DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
