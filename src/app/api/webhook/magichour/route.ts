import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHmac } from 'crypto'

function verifySignature(request: NextRequest, body: string): boolean {
  const signature = request.headers.get('x-magichour-signature')
  const secret = process.env.MAGICHOUR_WEBHOOK_SECRET
  
  if (!secret || !signature) return false
  
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return signature === expected
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    
    // Verify webhook signature if secret is configured
    if (process.env.MAGICHOUR_WEBHOOK_SECRET) {
      if (!verifySignature(request, bodyText)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    const body = JSON.parse(bodyText)
    
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
