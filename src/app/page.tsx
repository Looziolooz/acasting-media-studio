'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store'
import { AppHeader } from '@/components/layout/AppHeader'
import { MobileNav } from '@/components/layout/MobileNav'
import { GeneratePanel } from '@/components/generation/GeneratePanel'
import { QueuePanel } from '@/components/queue/QueuePanel'
import { HistoryPanel } from '@/components/generation/HistoryPanel'
import { UsagePanel } from '@/components/usage/UsagePanel'
import { PreviewModal } from '@/components/generation/PreviewModal'
import { Sparkles, Zap, Clock, BarChart2, Layers } from 'lucide-react'

const TABS = [
  { id: 'generate' as const, label: 'Create', icon: Zap },
  { id: 'queue' as const, label: 'Queue', icon: Clock },
  { id: 'history' as const, label: 'Gallery', icon: Sparkles },
  { id: 'usage' as const, label: 'Usage', icon: BarChart2 },
]

export default function Home() {
  const { activeTab, setActiveTab, queue, previewJob } = useAppStore()
  const [showMobileGallery, setShowMobileGallery] = useState(false)

  const completedRecent = queue
    .filter((j) => j.status === 'completed' && j.resultUrl)
    .slice(0, 6)

  const hasCompleted = completedRecent.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-[#030308]">
      <AppHeader />

      <main className="flex-1 pb-20 lg:pb-6">
        {/* Mobile: Tab content */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-4"
            >
              {activeTab === 'generate' && (
                <div className="space-y-4">
                  <div className="glass-card rounded-2xl p-4">
                    <GeneratePanel />
                  </div>
                  
                  {/* Mobile: Quick gallery preview */}
                  {hasCompleted && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowMobileGallery(!showMobileGallery)}
                        className="flex items-center justify-between w-full mb-3"
                      >
                        <h2 className="text-sm font-medium text-white/80">Recent Results</h2>
                        <span className="text-xs text-white/40">{completedRecent.length} items</span>
                      </button>
                      
                      <AnimatePresence>
                        {showMobileGallery && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-3 gap-2">
                              {completedRecent.map((job) => (
                                <button
                                  key={job.id}
                                  onClick={() => useAppStore.getState().setPreviewJob(job)}
                                  className="aspect-square rounded-xl overflow-hidden 
                                    ring-2 ring-transparent hover:ring-violet-500/50 transition-all"
                                >
                                  {job.request.mediaType === 'video' ? (
                                    <div className="w-full h-full bg-violet-500/20 flex items-center justify-center">
                                      <video
                                        src={job.resultUrl!}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                                          <Zap size={14} className="text-white" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={job.resultUrl!}
                                      alt={job.request.prompt}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'queue' && (
                <div className="glass-card rounded-2xl p-4">
                  <QueuePanel />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="glass-card rounded-2xl p-4">
                  <HistoryPanel />
                </div>
              )}

              {activeTab === 'usage' && (
                <div className="glass-card rounded-2xl p-4">
                  <UsagePanel />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop: Two-column layout */}
        <div className="hidden lg:flex max-w-7xl mx-auto px-6 py-6 gap-8">
          {/* Left Panel */}
          <div className="w-[420px] flex-shrink-0 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-3xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 
                  flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Layers size={18} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Media Studio</h1>
                  <p className="text-xs text-white/40">AI-powered creation</p>
                </div>
              </div>

              <GeneratePanel />
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-4"
            >
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                Quick Stats
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {queue.filter(j => j.status === 'completed').length}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wide">Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-400">
                    {queue.filter(j => j.status === 'processing' || j.status === 'queued').length}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wide">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {queue.filter(j => j.status === 'failed').length}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wide">Failed</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Panel - Gallery */}
          <div className="flex-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Your Creations</h2>
                  <p className="text-xs text-white/40 mt-0.5">Latest generations</p>
                </div>
                {hasCompleted && (
                  <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">
                    {completedRecent.length} items
                  </span>
                )}
              </div>

              {hasCompleted ? (
                <div className="columns-2 xl:columns-3 gap-4 space-y-4">
                  {completedRecent.map((job, idx) => (
                    <motion.button
                      key={job.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => useAppStore.getState().setPreviewJob(job)}
                      className="w-full block rounded-2xl overflow-hidden group relative
                        hover:ring-2 hover:ring-violet-500/50 transition-all"
                    >
                      <div className="relative">
                        {job.request.mediaType === 'video' ? (
                          <div className="relative">
                            <video
                              src={job.resultUrl!}
                              className="w-full rounded-2xl object-cover aspect-video"
                              muted
                              onMouseOver={(e) => e.currentTarget.play()}
                              onMouseOut={(e) => {
                                e.currentTarget.pause()
                                e.currentTarget.currentTime = 0
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center
                                group-hover:scale-110 transition-transform">
                                <Zap size={20} className="text-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={job.resultUrl!}
                            alt={job.request.prompt}
                            className="w-full rounded-2xl object-cover aspect-square
                              group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-[10px] text-white/80 line-clamp-2 text-left">
                              {job.request.prompt}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] text-white/50 bg-white/10 px-1.5 py-0.5 rounded">
                                {job.request.mediaType}
                              </span>
                              <span className="text-[9px] text-white/50">
                                {job.request.provider}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="glass-card rounded-3xl flex flex-col items-center justify-center
                  min-h-[400px] text-center p-8">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 
                      border border-white/10 flex items-center justify-center mb-6"
                  >
                    <Sparkles size={32} className="text-violet-400" />
                  </motion.div>
                  <h3 className="text-lg font-medium text-white/70 mb-2">
                    Start Creating
                  </h3>
                  <p className="text-sm text-white/30 max-w-xs">
                    Enter a prompt in the left panel to generate stunning images and videos for your Acasting content.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Preview modal */}
      <AnimatePresence>
        {previewJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PreviewModal />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
