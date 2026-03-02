'use client'
import { create } from 'zustand'
import type { AppState, GenerationJob, GenerationRequest, ProviderUsageStats } from '@/types'

export const useAppStore = create<AppState>((set) => ({
  currentRequest: {
    provider: 'pollinations',
    model: 'flux',
    mediaType: 'image',
    task: 'casting-post',
    style: 'photorealistic',
    lighting: 'studio-light',
    composition: 'rule-of-thirds',
    aspectRatio: '1:1',
  },
  setCurrentRequest: (req) =>
    set((state) => ({ currentRequest: { ...state.currentRequest, ...req } })),

  queue: [],
  addToQueue: (job) =>
    set((state) => ({ queue: [job, ...state.queue] })),
  updateJob: (id, updates) =>
    set((state) => ({
      queue: state.queue.map((j) => (j.id === id ? { ...j, ...updates } : j)),
      history: state.history.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),
  removeFromQueue: (id) =>
    set((state) => ({ queue: state.queue.filter((j) => j.id !== id) })),

  history: [],
  setHistory: (history) => set({ history }),

  usageStats: [],
  setUsageStats: (usageStats) => set({ usageStats }),

  activeTab: 'generate',
  setActiveTab: (activeTab) => set({ activeTab }),

  previewJob: null,
  setPreviewJob: (previewJob) => set({ previewJob }),
}))
