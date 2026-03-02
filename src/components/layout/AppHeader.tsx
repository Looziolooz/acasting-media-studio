'use client'
import { useAppStore } from '@/store'
import { AlertTriangle, Zap, Clock, BarChart2, History, Layers } from 'lucide-react'

const TABS = [
  { id: 'generate' as const, label: 'Generate', icon: Zap },
  { id: 'queue'    as const, label: 'Queue',   icon: Clock },
  { id: 'history'  as const, label: 'History', icon: History },
  { id: 'usage'    as const, label: 'Usage',   icon: BarChart2 },
]

export function AppHeader() {
  const { activeTab, setActiveTab, queue, usageStats } = useAppStore()

  const processingCount = queue.filter((j) => j.status === 'queued' || j.status === 'processing').length
  const criticalProviders = usageStats.filter(
    (s) => s.level === 'critical' || s.level === 'exhausted'
  )

  return (
    <header className="sticky top-0 z-40 border-b border-white/7 glass">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
              <Layers size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white">Acasting</span>
              <span className="text-sm text-white/40 ml-1">Media Studio</span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === id
                    ? 'text-white bg-white/8'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/4'
                }`}
              >
                <Icon size={13} />
                {label}
                {id === 'queue' && processingCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/80 text-white leading-none">
                    {processingCount}
                  </span>
                )}
                {id === 'usage' && criticalProviders.length > 0 && (
                  <AlertTriangle size={10} className="text-amber-400 ml-0.5" />
                )}
              </button>
            ))}
          </nav>

          {/* Status dot */}
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
            online
          </div>
        </div>
      </div>

      {/* Critical usage banner */}
      {criticalProviders.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/6 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-amber-300/80">
            <AlertTriangle size={12} />
            <span>
              {criticalProviders.map((p) => p.providerId).join(', ')} —{' '}
              {criticalProviders.some((p) => p.level === 'exhausted')
                ? 'credits exhausted'
                : 'credits running low'}
              . Check the Usage dashboard.
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
