import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PROVIDERS } from '@/lib/ai-providers/config'
import type { ProviderUsageStats, UsageLevel } from '@/types'

export const dynamic = 'force-dynamic'

function getLevel(pct: number): UsageLevel {
  if (pct >= 100) return 'exhausted'
  if (pct >= 95)  return 'critical'
  if (pct >= 80)  return 'warning'
  return 'safe'
}

export async function GET() {
  try {
    const usageRecords = await prisma.providerUsage.findMany()
    const usageMap = Object.fromEntries(usageRecords.map((r) => [r.provider, r]))

    const stats: ProviderUsageStats[] = Object.values(PROVIDERS).map((provider) => {
      const record = usageMap[provider.id]
      const dailyUsed   = record?.dailyCount   ?? 0
      const monthlyUsed = record?.monthlyCount ?? 0
      const dailyLimit   = provider.dailyLimit
      const monthlyLimit = provider.monthlyLimit

      const pctDaily   = dailyLimit   ? (dailyUsed   / dailyLimit)   * 100 : 0
      const pctMonthly = monthlyLimit ? (monthlyUsed / monthlyLimit) * 100 : 0

      const pct = dailyLimit ? pctDaily : pctMonthly

      return {
        providerId:        provider.id,
        usageCount:        record?.totalCount ?? 0,
        dailyLimit,
        monthlyLimit,
        dailyUsed,
        monthlyUsed,
        resetDate:         record?.dailyResetAt ?? new Date(),
        level:             getLevel(pct),
        percentageDaily:   Math.min(100, pctDaily),
        percentageMonthly: Math.min(100, pctMonthly),
      }
    })

    return NextResponse.json({ stats })
  } catch (err) {
    console.error('Usage API error:', err)
    return NextResponse.json({ error: 'Failed to fetch usage data', stats: [] }, { status: 500 })
  }
}
