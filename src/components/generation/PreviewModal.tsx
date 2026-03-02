'use client'
import { useAppStore } from '@/store'
import { X, Download, Film, Image, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { TASK_LABELS } from '@/lib/prompt-engineer'
import type { AcastingTask } from '@/types'

export function PreviewModal() {
  const { previewJob, setPreviewJob } = useAppStore()
  const [copied, setCopied] = useState(false)

  if (!previewJob || !previewJob.resultUrl) return null

  const isVideo = previewJob.request.mediaType === 'video'

  const copyPrompt = () => {
    navigator.clipboard.writeText(previewJob.request.enhancedPrompt ?? previewJob.request.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => setPreviewJob(null)}
    >
      <div
        className="glass rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
          <div className="flex items-center gap-2">
            {isVideo ? <Film size={14} className="text-violet-400" /> : <Image size={14} className="text-cyan-400" />}
            <span className="text-sm font-medium text-white/70">
              {TASK_LABELS[previewJob.request.task as AcastingTask] ?? previewJob.request.task}
            </span>
            <span className="text-xs text-white/30 border border-white/10 rounded px-1.5 py-0.5">
              {previewJob.request.provider}
            </span>
          </div>
          <button
            onClick={() => setPreviewJob(null)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-all"
          >
            <X size={15} />
          </button>
        </div>

        {/* Media */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative bg-black/40">
            {isVideo ? (
              <video
                src={previewJob.resultUrl}
                controls
                autoPlay
                loop
                className="w-full max-h-[50vh] object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewJob.resultUrl}
                alt={previewJob.request.prompt}
                className="w-full max-h-[60vh] object-contain"
              />
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider">Prompt originale</label>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                {previewJob.request.prompt}
              </p>
            </div>

            {previewJob.request.enhancedPrompt && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider">Prompt migliorato</label>
                  <button onClick={copyPrompt} className="text-white/30 hover:text-white/70 transition-colors">
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-4">
                  {previewJob.request.enhancedPrompt}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Stile',    value: previewJob.request.style },
                { label: 'Formato',  value: previewJob.request.aspectRatio },
                { label: 'Modello',  value: previewJob.request.model },
              ].map(({ label, value }) => (
                <div key={label} className="glass rounded-lg p-2">
                  <p className="text-[9px] text-white/25 uppercase tracking-wider">{label}</p>
                  <p className="text-xs text-white/60 mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/7 flex justify-end">
          <a
            href={previewJob.resultUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
              bg-violet-600 hover:bg-violet-500 text-white transition-all"
          >
            <Download size={14} />
            Download
          </a>
        </div>
      </div>
    </div>
  )
}
