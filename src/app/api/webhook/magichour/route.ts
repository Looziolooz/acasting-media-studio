import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { type, project_id, status, download_url, error_message } = body

    if (!project_id) {
      return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })
    }

    const generation = await prisma.generation.findFirst({
      where: { providerJobId: project_id },
    })

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    if (status === 'complete' && download_url) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'completed',
          resultUrl: download_url,
          completedAt: new Date(),
        },
      })
    } else if (status === 'error') {
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'failed',
          errorMessage: error_message ?? 'Unknown error',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
