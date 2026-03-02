'use client'
import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store'
import { enhancePrompt, TASK_LABELS, STYLE_LABELS, LIGHTING_LABELS, COMPOSITION_LABELS } from '@/lib/prompt-engineer'
import { PROVIDERS, SOCIAL_RATIOS } from '@/lib/ai-providers/config'
import {
  Wand2, Send, ChevronDown, Image, Film, Sparkles,
  RotateCcw, Copy, Check, Upload, X
} from 'lucide-react'
import type {
  AcastingTask, ImageStyle, LightingPreset,
  CompositionPreset, AspectRatio, GenerationJob
} from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ---- small helpers ----
function Select<T extends string>({
  label, value, onChange, options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/40 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none glass rounded-lg px-3 py-2 text-sm text-white/80
            focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20
            bg-transparent cursor-pointer pr-8"
        >
          {options.map(([v, lbl]) => (
            <option key={v} value={v} className="bg-[#111120] text-white">
              {lbl}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
      </div>
    </div>
  )
}

// ---- aspect ratio pills ----
const RATIO_OPTIONS: [AspectRatio, string][] = [
  ['1:1',  '1:1'],
  ['16:9', '16:9'],
  ['9:16', '9:16'],
  ['4:3',  '4:3'],
  ['3:4',  '3:4'],
]

export function GeneratePanel() {
  const { currentRequest, setCurrentRequest, addToQueue, usageStats } = useAppStore()

  const [rawPrompt, setRawPrompt]   = useState('')
  const [enhanced, setEnhanced]     = useState('')
  const [showEnhanced, setShow]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [imageUrls, setImageUrls]   = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const task        = (currentRequest.task        ?? 'casting-post') as AcastingTask
  const style       = (currentRequest.style       ?? 'photorealistic') as ImageStyle
  const lighting    = (currentRequest.lighting    ?? 'studio-light') as LightingPreset
  const composition = (currentRequest.composition ?? 'rule-of-thirds') as CompositionPreset
  const aspectRatio = (currentRequest.aspectRatio ?? '1:1') as AspectRatio
  const provider    = currentRequest.provider ?? 'pollinations'
  const mediaType   = currentRequest.mediaType ?? 'image'

  const selectedProvider = PROVIDERS[provider]
  const usageForProvider = usageStats.find((s) => s.providerId === provider)
  const isExhausted = usageForProvider?.level === 'exhausted'
  
  const canUploadImages = mediaType === 'video' && provider === 'magichour'
  const needsImages = canUploadImages

  const handleEnhance = useCallback(() => {
    if (!rawPrompt.trim()) return
    const result = enhancePrompt({ prompt: rawPrompt, task, style, lighting, composition, mediaType: mediaType as 'image' | 'video' })
    setEnhanced(result.enhancedPrompt)
    setShow(true)
    // Auto-suggest provider
    setCurrentRequest({ provider: result.suggestedProvider, model: result.suggestedModel })
  }, [rawPrompt, task, style, lighting, composition, mediaType, setCurrentRequest])

  const handleGenerate = async () => {
    if (!rawPrompt.trim() && imageUrls.length === 0) return
    setGenerating(true)

    const finalPrompt = showEnhanced && enhanced ? enhanced : rawPrompt
    const jobId = uuidv4()

    const job: GenerationJob = {
      id: jobId,
      request: {
        ...currentRequest as any,
        prompt: rawPrompt,
        enhancedPrompt: finalPrompt,
        provider: provider as any,
        model: currentRequest.model ?? 'flux',
        mediaType: mediaType as any,
        task,
        style,
        lighting,
        composition,
        aspectRatio,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      },
      status: 'processing',
      createdAt: new Date(),
    }

    addToQueue(job)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(job.request),
      })

      const data = await res.json()

      if (res.ok && data.generation) {
        useAppStore.getState().updateJob(jobId, {
          status:    'completed',
          resultUrl: data.generation.resultUrl,
          completedAt: new Date(),
        })
      } else {
        useAppStore.getState().updateJob(jobId, {
          status: 'failed',
          errorMessage: data.error ?? 'Unknown error',
        })
      }
    } catch (err) {
      useAppStore.getState().updateJob(jobId, {
        status: 'failed',
        errorMessage: 'Network error',
      })
    } finally {
      setGenerating(false)
    }
  }

  const copyEnhanced = () => {
    if (enhanced) {
      navigator.clipboard.writeText(enhanced)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (imageUrls.length >= 5) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageUrls(prev => [...prev, ev.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Media type toggle */}
      <div className="flex gap-2">
        {(['image', 'video'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setCurrentRequest({ mediaType: t })}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mediaType === t
                ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300'
                : 'glass text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'image' ? <Image size={14} /> : <Film size={14} />}
            {t === 'image' ? 'Image' : 'Video'}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40 uppercase tracking-wider">Prompt</label>
        <textarea
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder="Describe the content to generate for Acasting..."
          rows={3}
          className="w-full glass rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20
            focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20
            resize-none"
        />
      </div>

      {/* Image upload for video generation */}
      {canUploadImages && (
        <div className="space-y-1.5">
          <label className="text-xs text-white/40 uppercase tracking-wider">
            Upload Images (optional - for image-to-video)
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
          />
          <div className="grid grid-cols-5 gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden glass">
                <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white/70 hover:text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {imageUrls.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-white/20 
                  flex flex-col items-center justify-center text-white/40 hover:text-white/70 
                  hover:border-white/40 transition-all"
              >
                <Upload size={16} />
                <span className="text-[10px] mt-1">{imageUrls.length}/5</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-white/30">
            Upload up to 5 images to animate. Leave empty for text-to-video.
          </p>
        </div>
      )}

      {/* Task & style row */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Task"
          value={task}
          onChange={(v) => setCurrentRequest({ task: v })}
          options={Object.entries(TASK_LABELS) as [AcastingTask, string][]}
        />
        <Select
          label="Style"
          value={style}
          onChange={(v) => setCurrentRequest({ style: v })}
          options={Object.entries(STYLE_LABELS) as [ImageStyle, string][]}
        />
      </div>

      {/* Lighting & composition row */}
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Lighting"
          value={lighting}
          onChange={(v) => setCurrentRequest({ lighting: v })}
          options={Object.entries(LIGHTING_LABELS) as [LightingPreset, string][]}
        />
        <Select
          label="Composition"
          value={composition}
          onChange={(v) => setCurrentRequest({ composition: v })}
          options={Object.entries(COMPOSITION_LABELS) as [CompositionPreset, string][]}
        />
      </div>

      {/* Aspect ratio pills */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40 uppercase tracking-wider">Format</label>
        <div className="flex flex-wrap gap-2">
          {RATIO_OPTIONS.map(([ratio, label]) => (
            <button
              key={ratio}
              onClick={() => setCurrentRequest({ aspectRatio: ratio })}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                aspectRatio === ratio
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'glass text-white/40 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Social presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(SOCIAL_RATIOS).map(([key, { ratio, label }]) => (
            <button
              key={key}
              onClick={() => setCurrentRequest({ aspectRatio: ratio as AspectRatio })}
              className="px-2 py-0.5 rounded text-[10px] text-white/30 hover:text-white/60
                border border-white/6 hover:border-white/15 transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider selector */}
      <div className="space-y-1.5">
        <label className="text-xs text-white/40 uppercase tracking-wider">Provider</label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(PROVIDERS)
            .filter((p) => p.mediaTypes.includes(mediaType as any))
            .map((p) => {
              const usage = usageStats.find((s) => s.providerId === p.id)
              const exhausted = usage?.level === 'exhausted'
              const isSelected = provider === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => !exhausted && setCurrentRequest({ provider: p.id })}
                  disabled={exhausted}
                  className={`glass rounded-xl p-3 text-left transition-all border ${
                    isSelected
                      ? 'border-violet-500/40 bg-violet-500/8'
                      : exhausted
                      ? 'opacity-40 cursor-not-allowed'
                      : 'border-white/7 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: p.color }}>
                      {p.name}
                    </span>
                    {exhausted && (
                      <span className="text-[9px] text-red-400 border border-red-500/30 rounded px-1">
                        exhausted
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 leading-snug line-clamp-2">
                    {p.dailyLimit
                      ? `${usage?.dailyUsed ?? 0}/${p.dailyLimit} today`
                      : p.monthlyLimit
                      ? `${usage?.monthlyUsed ?? 0}/${p.monthlyLimit} month`
                      : 'Unlimited ✓'}
                  </p>
                  {/* mini usage bar */}
                  {(p.dailyLimit || p.monthlyLimit) && (
                    <div className="mt-2 h-0.5 bg-white/6 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, usage?.percentageDaily ?? usage?.percentageMonthly ?? 0)}%`,
                          background: p.color,
                        }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
        </div>
      </div>

      {/* Enhance + Generate buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleEnhance}
          disabled={!rawPrompt.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
            glass border border-white/10 text-white/60 hover:text-white hover:border-white/20
            transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Wand2 size={15} />
          Enhance Prompt
        </button>

        <button
          onClick={handleGenerate}
          disabled={(!rawPrompt.trim() && imageUrls.length === 0) || generating || isExhausted}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
            text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white
            transition-all disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-violet-900/40"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send size={14} />
              Generate
            </>
          )}
        </button>
      </div>

      {/* Enhanced prompt preview */}
      {showEnhanced && enhanced && (
        <div className="glass rounded-xl p-3 space-y-2 fade-in-up border-violet-500/20 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-violet-400">
              <Sparkles size={11} />
              Enhanced Prompt
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyEnhanced}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
              <button
                onClick={() => setShow(false)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
          <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{enhanced}</p>
        </div>
      )}
    </div>
  )
}
