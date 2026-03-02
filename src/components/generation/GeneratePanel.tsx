'use client'
import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store'
import { enhancePrompt, TASK_LABELS, STYLE_LABELS, LIGHTING_LABELS, COMPOSITION_LABELS } from '@/lib/prompt-engineer'
import { PROVIDERS, SOCIAL_RATIOS, MAGICHOUR_CREDIT_COSTS } from '@/lib/ai-providers/config'
import {
  Wand2, Send, ChevronDown, Image, Film, Sparkles,
  RotateCcw, Copy, Check, Upload, X, Info, AlertCircle, Clock
} from 'lucide-react'
import type {
  AcastingTask, ImageStyle, LightingPreset,
  CompositionPreset, AspectRatio, GenerationJob, GenerationRequest
} from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ---- small helpers ----
function Select<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none glass rounded-lg px-3 py-2.5 text-sm text-white/80
          focus:outline-none focus:ring-2 focus:ring-violet-500/30
          bg-transparent cursor-pointer pr-8"
      >
        {options.map(([v, lbl]) => (
          <option key={v} value={v} className="bg-[#111120] text-white">
            {lbl}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
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

// ---- prompt tips per provider ----
const PROMPT_TIPS: Record<string, string> = {
  pollinations: 'Pollinations: sii descrittivo. Includi stile, colori, soggetto. Es: "professional headshot, woman smiling, studio lighting, clean background"',
  huggingface: 'HuggingFace: funziona bene con prompt dettagliati in inglese. Il primo avvio può richiedere 30-60 secondi.',
  magichour: 'Magic Hour: per i video includi azione, ambiente e stile di camera. Es: "A confident actor walking toward camera, cinematic slow motion, warm golden lighting"',
}

// ---- stima tempo ----
const TIME_ESTIMATES: Record<string, string> = {
  pollinations: '~10-30s',
  huggingface: '~15-60s (più lento al primo uso)',
  magichour_image: '~15-30s',
  magichour_video: '~60-120s',
}

export function GeneratePanel() {
  const { currentRequest, setCurrentRequest, addToQueue, usageStats } = useAppStore()

  const [rawPrompt, setRawPrompt]   = useState('')
  const [enhanced, setEnhanced]     = useState('')
  const [showEnhanced, setShow]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied]         = useState(false)
  const [imageUrls, setImageUrls]   = useState<string[]>([])
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [showTips, setShowTips]     = useState(false)
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

  // Stima crediti per Magic Hour
  const estimatedCredits = provider === 'magichour'
    ? mediaType === 'video'
      ? MAGICHOUR_CREDIT_COSTS['text-to-video-5s']
      : MAGICHOUR_CREDIT_COSTS['ai-image']
    : null

  // Stima tempo
  const estimatedTime = provider === 'magichour'
    ? mediaType === 'video'
      ? TIME_ESTIMATES.magichour_video
      : TIME_ESTIMATES.magichour_image
    : TIME_ESTIMATES[provider] ?? '~20s'

  const handleEnhance = useCallback(() => {
    if (!rawPrompt.trim()) return
    const result = enhancePrompt({ prompt: rawPrompt, task, style, lighting, composition, mediaType: mediaType as 'image' | 'video' })
    setEnhanced(result.enhancedPrompt)
    setShow(true)
    setCurrentRequest({ provider: result.suggestedProvider, model: result.suggestedModel })
  }, [rawPrompt, task, style, lighting, composition, mediaType, setCurrentRequest])

  const handleGenerate = async () => {
    if (!rawPrompt.trim() && imageUrls.length === 0) return
    setGenerating(true)
    setErrorMsg(null)

    const finalPrompt = showEnhanced && enhanced ? enhanced : rawPrompt
    const jobId = uuidv4()

    // FIX: Costruisci la request esplicitamente con TUTTI i campi required
    const requestBody: GenerationRequest = {
      prompt: rawPrompt,
      enhancedPrompt: finalPrompt !== rawPrompt ? finalPrompt : undefined,
      provider: provider as GenerationRequest['provider'],
      model: currentRequest.model ?? 'flux',
      mediaType: mediaType as GenerationRequest['mediaType'],
      task: task,
      style: style,
      lighting: lighting,
      composition: composition,
      aspectRatio: aspectRatio,
      width: currentRequest.width,
      height: currentRequest.height,
      seed: currentRequest.seed,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    }

    const job: GenerationJob = {
      id: jobId,
      request: requestBody,
      status: 'processing',
      createdAt: new Date(),
    }

    addToQueue(job)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (res.ok && data.generation) {
        useAppStore.getState().updateJob(jobId, {
          status:    data.needsPolling ? 'processing' : 'completed',
          resultUrl: data.generation.resultUrl,
          providerJobId: data.generation.providerJobId,
          completedAt: data.needsPolling ? undefined : new Date(),
        })

        // Se il job è ancora in processing (Magic Hour video), inizia polling
        if (data.needsPolling && data.generation.id) {
          pollForCompletion(jobId, data.generation.id)
        }
      } else {
        const errMessage = data.error ?? 'Errore sconosciuto'
        useAppStore.getState().updateJob(jobId, {
          status: 'failed',
          errorMessage: errMessage,
        })
        setErrorMsg(errMessage)
      }
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Errore di rete'
      useAppStore.getState().updateJob(jobId, {
        status: 'failed',
        errorMessage: errMessage,
      })
      setErrorMsg(errMessage)
    } finally {
      setGenerating(false)
    }
  }

  // Polling per Magic Hour video che non completano in tempo
  const pollForCompletion = async (jobId: string, generationId: string) => {
    const maxPolls = 24 // 24 × 5s = 2 minuti
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const res = await fetch(`/api/history?limit=1&status=completed`)
        const data = await res.json()
        const found = data.items?.find((item: any) => item.id === generationId)
        if (found && found.resultUrl) {
          useAppStore.getState().updateJob(jobId, {
            status: 'completed',
            resultUrl: found.resultUrl,
            completedAt: new Date(),
          })
          return
        }
      } catch {
        // Continua polling
      }
    }
    // Timeout — segnala all'utente
    useAppStore.getState().updateJob(jobId, {
      status: 'failed',
      errorMessage: 'Il video sta impiegando più del previsto. Controlla la Gallery tra qualche minuto.',
    })
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
      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-red-300/80 leading-relaxed break-words">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="shrink-0">
            <X size={12} className="text-red-400/60 hover:text-red-400" />
          </button>
        </div>
      )}

      {/* Media type toggle */}
      <div className="flex gap-2">
        {(['image', 'video'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setCurrentRequest({ mediaType: t })}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              mediaType === t
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                : 'glass text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {t === 'image' ? <Image size={16} /> : <Film size={16} />}
            {t === 'image' ? 'Image' : 'Video'}
            {t === 'video' && (
              <span className="text-[9px] opacity-60 ml-1">(Magic Hour)</span>
            )}
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="prompt" className="text-xs text-white/40 uppercase tracking-wider">
            Prompt
          </label>
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            <Info size={10} />
            Tips
          </button>
        </div>

        {showTips && (
          <div className="p-2.5 rounded-lg bg-cyan-500/8 border border-cyan-500/15">
            <p className="text-[10px] text-cyan-300/70 leading-relaxed">
              {PROMPT_TIPS[provider] ?? 'Sii il più descrittivo possibile. Includi soggetto, azione, ambiente, stile.'}
            </p>
          </div>
        )}

        <textarea
          id="prompt"
          name="prompt"
          value={rawPrompt}
          onChange={(e) => setRawPrompt(e.target.value)}
          placeholder={
            mediaType === 'video'
              ? 'Es: A confident young actor walking toward camera on a Stockholm street, cinematic slow motion, warm golden hour lighting...'
              : 'Es: Professional headshot of a smiling woman, clean studio background, soft lighting, casting agency quality...'
          }
          rows={3}
          className="w-full glass rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20
            focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30
            resize-none"
        />
      </div>

      {/* Image upload for video generation */}
      {canUploadImages && (
        <div className="space-y-1.5">
          <label htmlFor="imageUpload" className="text-xs text-white/40 uppercase tracking-wider">
            Upload Image (opzionale - per image-to-video)
          </label>
          <input
            type="file"
            id="imageUpload"
            name="imageUpload"
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
            Carica un&apos;immagine per animarla. Lascia vuoto per text-to-video.
          </p>
        </div>
      )}

      {/* Task & style row */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={task}
          onChange={(v) => setCurrentRequest({ task: v })}
          options={Object.entries(TASK_LABELS) as [AcastingTask, string][]}
        />
        <Select
          value={style}
          onChange={(v) => setCurrentRequest({ style: v })}
          options={Object.entries(STYLE_LABELS) as [ImageStyle, string][]}
        />
      </div>

      {/* Lighting & composition row */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={lighting}
          onChange={(v) => setCurrentRequest({ lighting: v })}
          options={Object.entries(LIGHTING_LABELS) as [LightingPreset, string][]}
        />
        <Select
          value={composition}
          onChange={(v) => setCurrentRequest({ composition: v })}
          options={Object.entries(COMPOSITION_LABELS) as [CompositionPreset, string][]}
        />
      </div>

      {/* Aspect ratio pills */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {RATIO_OPTIONS.map(([ratio, label]) => (
            <button
              key={ratio}
              onClick={() => setCurrentRequest({ aspectRatio: ratio })}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                aspectRatio === ratio
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                  : 'glass text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Provider selector */}
      <div className="space-y-2">
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
                  className={`relative p-3 rounded-xl text-left transition-all border ${
                    isSelected
                      ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                      : exhausted
                      ? 'opacity-40 cursor-not-allowed border-white/5'
                      : 'border-white/5 hover:border-white/15 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: p.color }}>
                      {p.name}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-tight">
                    {p.id === 'pollinations'
                      ? 'Illimitato'
                      : p.id === 'huggingface'
                      ? 'Crediti HF gratuiti'
                      : `~${estimatedCredits ?? '?'} crediti`}
                  </p>
                </button>
              )
            })}
        </div>
      </div>

      {/* Pre-generation info bar */}
      {rawPrompt.trim() && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/3 border border-white/5">
          <div className="flex items-center gap-3 text-[10px] text-white/40">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {estimatedTime}
            </span>
            {estimatedCredits !== null && (
              <span className="flex items-center gap-1">
                <Sparkles size={10} />
                ~{estimatedCredits} crediti
              </span>
            )}
          </div>
          <span className="text-[10px] text-white/25">
            {selectedProvider?.name}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleEnhance}
          disabled={!rawPrompt.trim()}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
            glass border border-white/10 text-white/60 hover:text-white hover:border-white/20
            transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Wand2 size={16} />
          <span className="hidden sm:inline">Enhance</span>
        </button>

        <button
          onClick={handleGenerate}
          disabled={(!rawPrompt.trim() && imageUrls.length === 0) || generating || isExhausted}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
            text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white
            transition-all disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-violet-900/30 active:scale-[0.98]"
        >
          {generating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Generate</span>
            </>
          )}
        </button>
      </div>

      {/* Enhanced prompt preview */}
      {showEnhanced && enhanced && (
        <div className="glass rounded-xl p-3 space-y-2 border border-violet-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-violet-400">
              <Sparkles size={12} />
              <span className="font-medium">Enhanced</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyEnhanced}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
              <button
                onClick={() => setShow(false)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed line-clamp-4">{enhanced}</p>
        </div>
      )}
    </div>
  )
}