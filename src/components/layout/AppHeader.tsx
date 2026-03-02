'use client'
import { useAppStore } from '@/store'
import { AlertTriangle, Zap, Clock, BarChart2, History, Layers } from 'lucide-react'

const TABS = [
  { id: 'generate' as const, label: 'Create', icon: Zap },
  { id: 'queue' as const, label: 'Queue', icon: Clock },
  { id: 'history' as const, label: 'Gallery', icon: History },
  { id: 'usage' as const, label: 'Usage', icon: BarChart2 },
]

export function AppHeader() {
  const { activeTab, setActiveTab, queue, usageStats } = useAppStore()

  const processingCount = queue.filter((j) => j.status === 'queued' || j.status === 'processing').length
  const criticalProviders = usageStats.filter(
    (s) => s.level === 'critical' || s.level === 'exhausted'
  )

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 
              flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Layers size={16} className="text-white" />
            </div>
            <div className="lg:block hidden">
              <span className="text-sm font-semibold text-white">Acasting</span>
              <span className="text-sm text-white/40 ml-1.5">Media Studio</span>
            </div>
            <div className="lg:hidden">
              <span className="text-sm font-semibold text-white">Media Studio</span>
            </div>
          </div>

          {/* Desktop Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === id
                    ? 'text-white bg-white/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon size={15} />
                {label}
                {id === 'queue' && processingCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold 
                    bg-violet-500/80 text-white">
                    {processingCount}
                  </span>
                )}
                {id === 'usage' && criticalProviders.length > 0 && (
                  <AlertTriangle size={12} className="text-amber-400" />
                )}
              </button>
            ))}
          </nav>

          {/* Status */}
          <div className="flex items-center gap-3">
            {processingCount > 0 && (
              <div className="lg:hidden flex items-center gap-1.5 px-2 py-1 rounded-full 
                bg-violet-500/20 border border-violet-500/30">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] text-violet-300 font-medium">{processingCount}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/30" />
              <span className="hidden sm:inline">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Critical usage banner */}
      {criticalProviders.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/6">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2 flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300/80 truncate">
              {criticalProviders.map((p) => p.providerId).join(', ')} —{' '}
              {criticalProviders.some((p) => p.level === 'exhausted')
                ? 'credits exhausted'
                : 'credits running low'}
            </span>
          </div>
        </div>
      )}
    </header>
  )
}
