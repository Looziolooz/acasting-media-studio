import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    return NextResponse.json({ items, total, limit, offset })
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
