'use client'
import { useAppStore } from '@/store'
import { AppHeader } from '@/components/layout/AppHeader'
import { GeneratePanel } from '@/components/generation/GeneratePanel'
import { QueuePanel } from '@/components/queue/QueuePanel'
import { HistoryPanel } from '@/components/generation/HistoryPanel'
import { UsagePanel } from '@/components/usage/UsagePanel'
import { PreviewModal } from '@/components/generation/PreviewModal'

export default function Home() {
  const { activeTab, queue, previewJob } = useAppStore()

  const completedRecent = queue
    .filter((j) => j.status === 'completed' && j.resultUrl && j.request.mediaType !== 'video')
    .slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">

          {/* Left: always visible generate panel */}
          <div className="space-y-4">
            {/* Panel title */}
            <div>
              <h1 className="text-base font-semibold text-white/80">
                {activeTab === 'generate' ? 'Generate Content'  :
                 activeTab === 'queue'    ? 'Generation Queue' :
                 activeTab === 'history'  ? 'Generation History' :
                                           'Usage Dashboard'}
              </h1>
              <p className="text-xs text-white/30 mt-0.5">
                {activeTab === 'generate'
                  ? 'AI images and videos for Acasting social'
                  : activeTab === 'queue'
                  ? 'Jobs in progress and completed'
                  : activeTab === 'history'
                  ? 'All generations saved in DB'
                  : 'Free provider credits monitoring'}
              </p>
            </div>

            <div className="glass rounded-2xl p-4">
              {activeTab === 'generate' && <GeneratePanel />}
              {activeTab === 'queue'    && <QueuePanel />}
              {activeTab === 'history'  && <HistoryPanel />}
              {activeTab === 'usage'    && <UsagePanel />}
            </div>
          </div>

          {/* Right: recent results gallery */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white/80">Recent Results</h2>
              <p className="text-xs text-white/30 mt-0.5">Latest completed generations</p>
            </div>

            {completedRecent.length === 0 ? (
              <div className="glass rounded-2xl flex flex-col items-center justify-center
                min-h-[300px] text-center p-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20
                  flex items-center justify-center mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-sm font-medium text-white/50 mb-1">
                  No results yet
                </h3>
                <p className="text-xs text-white/25 max-w-xs">
                  Generate images or videos from the left panel. Results will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {completedRecent.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => useAppStore.getState().setPreviewJob(job)}
                    className="glass rounded-2xl overflow-hidden group relative aspect-square
                      hover:border-violet-500/30 border border-transparent transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={job.resultUrl!}
                      alt={job.request.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0
                      group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-[10px] text-white/80 line-clamp-2 text-left">
                        {job.request.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Provider status quick view */}
            <div className="glass rounded-2xl p-4">
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">
                Active Providers
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'pollinations', name: 'Pollinations.ai', color: '#22d3ee', limit: null },
                  { id: 'huggingface',  name: 'HuggingFace',     color: '#fbbf24', limit: null },
                  { id: 'magichour',    name: 'Magic Hour',       color: '#a78bfa', limit: 100  },
                ].map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-xs text-white/50 flex-1">{p.name}</span>
                    <span className="text-[10px] text-white/25 font-mono">
                      {p.limit ? `${p.limit}/day` : '∞ free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Preview modal */}
      {previewJob && <PreviewModal />}
    </div>
  )
}
