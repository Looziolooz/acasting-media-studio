'use client'
import { useAppStore } from '@/store'
import { CheckCircle2, XCircle, Clock, Loader2, Image, Film, Eye, Trash2 } from 'lucide-react'
import type { GenerationJob } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const STATUS_CONFIG = {
  queued:     { icon: Clock,     color: 'text-white/40',  label: 'Queued' },
  processing: { icon: Loader2,   color: 'text-violet-400', label: 'Processing' },
  completed:  { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  failed:     { icon: XCircle,   color: 'text-red-400',   label: 'Failed' },
}

function JobCard({ job }: { job: GenerationJob }) {
  const { updateJob, removeFromQueue, setPreviewJob, setActiveTab } = useAppStore()
  const cfg = STATUS_CONFIG[job.status]
  const Icon = cfg.icon
  const isVideo = job.request.mediaType === 'video'

  return (
    <div className={`glass rounded-xl p-3 space-y-2 transition-all fade-in-up ${
      job.status === 'completed' ? 'border-green-500/15 border' : ''
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`shrink-0 ${cfg.color}`}>
            <Icon size={14} className={job.status === 'processing' ? 'animate-spin' : ''} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/70 truncate">
              {job.request.prompt.slice(0, 60)}
              {job.request.prompt.length > 60 ? '…' : ''}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-white/30 flex items-center gap-1">
                {isVideo ? <Film size={9} /> : <Image size={9} />}
                {isVideo ? 'Video' : 'Image'}
              </span>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px] text-white/30">{job.request.provider}</span>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px] text-white/30">
                {formatDistanceToNow(job.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {job.status === 'completed' && job.resultUrl && (
            <button
              onClick={() => { setPreviewJob(job); setActiveTab('generate') }}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/6 transition-all"
              title="Preview"
            >
              <Eye size={13} />
            </button>
          )}
          <button
            onClick={() => removeFromQueue(job.id)}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/8 transition-all"
            title="Remove"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {job.status === 'failed' && job.errorMessage && (
        <p className="text-[10px] text-red-400/70 bg-red-500/6 rounded-lg px-2 py-1.5">
          {job.errorMessage}
        </p>
      )}

      {job.status === 'completed' && job.resultUrl && !job.request.mediaType?.includes('video') && (
        <div className="relative rounded-lg overflow-hidden aspect-video bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={job.resultUrl}
            alt="Generated"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

export function QueuePanel() {
  const { queue } = useAppStore()

  const active    = queue.filter((j) => j.status === 'queued' || j.status === 'processing')
  const completed = queue.filter((j) => j.status === 'completed')
  const failed    = queue.filter((j) => j.status === 'failed')

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock size={28} className="text-white/15 mb-3" />
        <p className="text-sm text-white/30">No jobs in queue</p>
        <p className="text-xs text-white/20 mt-1">Generate something in the "Generate" tab</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <section>
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">
            In Progress ({active.length})
          </h3>
          <div className="space-y-2">
            {active.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Completed ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}

      {failed.length > 0 && (
        <section>
          <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">
            Failed ({failed.length})
          </h3>
          <div className="space-y-2">
            {failed.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  )
}
