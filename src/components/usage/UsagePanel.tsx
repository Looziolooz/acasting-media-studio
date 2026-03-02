'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { PROVIDERS } from '@/lib/ai-providers/config'
import { RefreshCw, Infinity, AlertTriangle } from 'lucide-react'
import type { ProviderUsageStats } from '@/types'

const LEVEL_CONFIG = {
  safe:      { color: '#34d399', label: 'OK',         bg: 'bg-green-500/10'  },
  warning:   { color: '#fbbf24', label: 'Warning', bg: 'bg-amber-500/10'  },
  critical:  { color: '#f97316', label: 'Critical',    bg: 'bg-orange-500/10' },
  exhausted: { color: '#ef4444', label: 'Exhausted',   bg: 'bg-red-500/10'    },
}

function ProviderCard({ stats }: { stats: ProviderUsageStats }) {
  const provider = PROVIDERS[stats.providerId]
  if (!provider) return null

  const cfg = LEVEL_CONFIG[stats.level]
  const isUnlimited = !stats.dailyLimit && !stats.monthlyLimit
  const pct = stats.dailyLimit
    ? stats.percentageDaily
    : stats.monthlyLimit
    ? stats.percentageMonthly
    : 0

  return (
    <div className={`glass rounded-2xl p-4 space-y-3 border ${
      stats.level === 'exhausted' ? 'border-red-500/25' :
      stats.level === 'critical'  ? 'border-orange-500/20' :
      stats.level === 'warning'   ? 'border-amber-500/15' :
      'border-white/7'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: provider.color, boxShadow: `0 0 6px ${provider.color}80` }}
          />
          <span className="text-sm font-semibold text-white/85">{provider.name}</span>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg}`}
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-white/35 leading-relaxed">{provider.description}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-white/80">{stats.dailyUsed}</div>
          <div className="text-[10px] text-white/30 mt-0.5">today</div>
        </div>
        <div className="glass rounded-xl p-2.5 text-center">
          <div className="text-lg font-bold text-white/80">{stats.usageCount}</div>
          <div className="text-[10px] text-white/30 mt-0.5">total</div>
        </div>
      </div>

      {/* Usage bar */}
      {isUnlimited ? (
        <div className="flex items-center gap-1.5 text-xs text-cyan-400/70">
          <Infinity size={12} />
          <span>Unlimited — no cost</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-white/30">
              {stats.dailyLimit
                ? `${stats.dailyUsed} / ${stats.dailyLimit} oggi`
                : `${stats.monthlyUsed} / ${stats.monthlyLimit} mese`}
            </span>
            <span style={{ color: cfg.color }}>{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, pct)}%`,
                background: pct >= 95
                  ? '#ef4444'
                  : pct >= 80
                  ? '#f97316'
                  : pct >= 60
                  ? '#fbbf24'
                  : provider.color,
              }}
            />
          </div>
          {stats.level !== 'safe' && (
            <p className="text-[10px] flex items-center gap-1" style={{ color: cfg.color }}>
              <AlertTriangle size={9} />
              {stats.level === 'exhausted'
                ? 'Crediti esauriti. Attendi il reset domani.'
                : stats.level === 'critical'
                ? 'Quasi esauriti. Usa un altro provider.'
                : 'Utilizzo elevato. Tieni d\'occhio i crediti.'}
            </p>
          )}
        </div>
      )}

      {/* API key status */}
      <div className="flex items-center gap-1.5 text-[10px] text-white/25">
        <div className={`w-1 h-1 rounded-full ${provider.requiresApiKey ? 'bg-amber-400/60' : 'bg-green-400/60'}`} />
        {provider.requiresApiKey ? 'API key richiesta (.env)' : 'Nessuna API key necessaria'}
      </div>
    </div>
  )
}

export function UsagePanel() {
  const { usageStats, setUsageStats } = useAppStore()

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/usage')
      const data = await res.json()
      if (data.stats) setUsageStats(data.stats)
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    }
  }

  useEffect(() => {
    fetchUsage()
    const interval = setInterval(fetchUsage, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">Stato Provider</h2>
        <button
          onClick={fetchUsage}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60
            px-2 py-1 rounded-lg hover:bg-white/5 transition-all"
        >
          <RefreshCw size={11} />
          Aggiorna
        </button>
      </div>

      <div className="grid gap-3">
        {usageStats.length === 0
          ? Object.values(PROVIDERS).map((p) => (
              <div key={p.id} className="glass rounded-2xl p-4 shimmer h-40" />
            ))
          : usageStats.map((s) => <ProviderCard key={s.providerId} stats={s} />)
        }
      </div>

      {/* Legend */}
      <div className="glass rounded-xl p-3">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Soglie warning</h3>
        <div className="space-y-1.5">
          {[
            { pct: '0–60%',   label: 'Normale',    color: '#34d399' },
            { pct: '60–80%',  label: 'Attenzione', color: '#fbbf24' },
            { pct: '80–95%',  label: 'Critico',    color: '#f97316' },
            { pct: '95–100%', label: 'Esaurito',   color: '#ef4444' },
          ].map(({ pct, label, color }) => (
            <div key={pct} className="flex items-center gap-2 text-[10px]">
              <div className="w-6 h-1 rounded-full" style={{ background: color }} />
              <span className="text-white/40 font-mono">{pct}</span>
              <span className="text-white/25">—</span>
              <span style={{ color }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
