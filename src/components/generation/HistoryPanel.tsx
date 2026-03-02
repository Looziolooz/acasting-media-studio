'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { TASK_LABELS } from '@/lib/prompt-engineer'
import { Image, Film, Download, Eye, Trash2, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { AcastingTask } from '@/types'

export function HistoryPanel() {
  const { setHistory, history, setPreviewJob } = useAppStore()
  const [loading, setLoading]     = useState(false)
  const [filterTask, setFilterTask]   = useState<string>('all')
  const [filterMedia, setFilterMedia] = useState<string>('all')
  const [filterProvider, setFilterProvider] = useState<string>('all')

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '60' })
      if (filterTask     !== 'all') params.set('task',      filterTask)
      if (filterMedia    !== 'all') params.set('mediaType', filterMedia)
      if (filterProvider !== 'all') params.set('provider',  filterProvider)
      params.set('status', 'completed')

      const res  = await fetch(`/api/history?${params}`)
      const data = await res.json()
      if (data.items) setHistory(data.items)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [filterTask, filterMedia, filterProvider])

  const handleDelete = async (id: string) => {
    await fetch(`/api/history?id=${id}`, { method: 'DELETE' })
    setHistory(history.filter((h) => h.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={12} className="text-white/30" />

        <select
          value={filterMedia}
          onChange={(e) => setFilterMedia(e.target.value)}
          className="glass rounded-lg px-2 py-1.5 text-xs text-white/60 bg-transparent focus:outline-none"
        >
          <option value="all" className="bg-[#111120]">All types</option>
          <option value="image" className="bg-[#111120]">Images</option>
          <option value="video" className="bg-[#111120]">Videos</option>
        </select>

        <select
          value={filterTask}
          onChange={(e) => setFilterTask(e.target.value)}
          className="glass rounded-lg px-2 py-1.5 text-xs text-white/60 bg-transparent focus:outline-none"
        >
          <option value="all" className="bg-[#111120]">All tasks</option>
          {Object.entries(TASK_LABELS).map(([k, v]) => (
            <option key={k} value={k} className="bg-[#111120]">{v}</option>
          ))}
        </select>

        <select
          value={filterProvider}
          onChange={(e) => setFilterProvider(e.target.value)}
          className="glass rounded-lg px-2 py-1.5 text-xs text-white/60 bg-transparent focus:outline-none"
        >
          <option value="all" className="bg-[#111120]">All providers</option>
          <option value="pollinations" className="bg-[#111120]">Pollinations</option>
          <option value="huggingface"  className="bg-[#111120]">HuggingFace</option>
          <option value="magichour"    className="bg-[#111120]">Magic Hour</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl aspect-square shimmer" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Image size={28} className="text-white/15 mb-3" />
          <p className="text-sm text-white/30">No results found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="glass rounded-xl overflow-hidden group relative"
            >
              {/* Thumbnail */}
              {item.resultUrl && item.mediaType !== 'video' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.resultUrl as string}
                  alt={item.prompt as string}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square bg-violet-900/20 flex items-center justify-center">
                  <Film size={24} className="text-violet-400/40" />
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100
                transition-opacity flex items-end p-2">
                <div className="w-full">
                  <p className="text-[10px] text-white/70 mb-2 line-clamp-2">
                    {item.prompt as string}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/30">
                      {formatDistanceToNow(new Date(item.createdAt as unknown as string), {
                        addSuffix: true
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.resultUrl && (
                        <>
                          <button
                            onClick={() => setPreviewJob(item as any)}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                          >
                            <Eye size={12} />
                          </button>
                          <a
                            href={item.resultUrl as string}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
                          >
                            <Download size={12} />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(item.id as string)}
                        className="p-1 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media type badge */}
              <div className="absolute top-2 left-2">
                <span className="flex items-center gap-1 text-[9px] text-white/60
                  bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
                  {item.mediaType === 'video' ? <Film size={9} /> : <Image size={9} />}
                  {item.provider as string}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
