'use client'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store'
import { Zap, Clock, Sparkles, BarChart2 } from 'lucide-react'

const TABS = [
  { id: 'generate' as const, label: 'Create', icon: Zap },
  { id: 'queue' as const, label: 'Queue', icon: Clock },
  { id: 'history' as const, label: 'Gallery', icon: Sparkles },
  { id: 'usage' as const, label: 'Usage', icon: BarChart2 },
]

export function MobileNav() {
  const { activeTab, setActiveTab, queue } = useAppStore()

  const processingCount = queue.filter(
    (j) => j.status === 'queued' || j.status === 'processing'
  ).length

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-[#030308]/90 backdrop-blur-xl border-t border-white/5" />
      
      {/* Nav content */}
      <div className="relative flex items-center justify-around h-16 px-2 pb-safe">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          const showBadge = id === 'queue' && processingCount > 0

          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="relative flex flex-col items-center justify-center gap-1 px-4 py-2"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 bg-gradient-to-b from-violet-500/30 to-cyan-500/30 rounded-2xl blur-md"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon
                  size={20}
                  className={`relative transition-colors ${
                    isActive ? 'text-white' : 'text-white/40'
                  }`}
                />
                
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 text-[9px] 
                      font-bold text-white flex items-center justify-center"
                  >
                    {processingCount}
                  </motion.span>
                )}
              </motion.div>
              
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
