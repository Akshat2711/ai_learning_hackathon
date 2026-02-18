'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Play, Pause, Download, Mic2, Loader2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const STORAGE_KEY = 'pirate_radio_podcast'

interface SavedPodcast {
  fileName: string
  audioBase64: string   // base64-encoded audio so it survives page reloads
  savedAt: string       // ISO timestamp
}

// Convert a Blob → base64 string
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

// Convert base64 → object URL the audio element can use
const base64ToObjectUrl = (base64: string, mimeType = 'audio/mpeg'): string => {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: mimeType })
  return URL.createObjectURL(blob)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PodcastPage() {
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Saved-podcast state
  const [savedPodcast, setSavedPodcast] = useState<SavedPodcast | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()

  // ── On mount: load document name + check for a saved podcast ────────────────

  useEffect(() => {
    const contentString = localStorage.getItem('uploadedContent')
    if (contentString) {
      const content = JSON.parse(contentString)
      setFileName(content.fileName || 'Untitled Document')
    }

    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed: SavedPodcast = JSON.parse(saved)
        setSavedPodcast(parsed)
        setShowResumePrompt(true)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // ── Load saved podcast (resume) ───────────────────────────────────────────

  const loadSavedPodcast = () => {
    if (!savedPodcast) return
    const url = base64ToObjectUrl(savedPodcast.audioBase64)
    setAudioUrl(url)
    setFileName(savedPodcast.fileName)
    setShowResumePrompt(false)
  }

  const discardSaved = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSavedPodcast(null)
    setShowResumePrompt(false)
  }

  // ── Generate new podcast ──────────────────────────────────────────────────

  const generatePodcast = async () => {
    setLoading(true)
    setError(null)
    setAudioUrl(null)
    setShowResumePrompt(false)

    try {
      const contentString = localStorage.getItem('uploadedContent')
      if (!contentString) throw new Error('No document found. Please upload a PDF first.')

      const content = JSON.parse(contentString)
      const fullText = content.pages.map((p: { text: string }) => p.text).join('\n\n')

      if (!fullText || fullText.length < 50)
        throw new Error('Document content is too short to generate a podcast.')

      const response = await fetch('https://dialogue-agent.onrender.com/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText.slice(0, 100000) }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error((errData as { detail?: string }).detail || 'Failed to generate podcast')
      }

      const blob = await response.blob()

      // Save to localStorage as base64 so it persists across reloads
      const base64 = await blobToBase64(blob)
      const record: SavedPodcast = {
        fileName,
        audioBase64: base64,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
      setSavedPodcast(record)

      // Also create an object URL for immediate playback
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      console.error('Podcast generation failed:', err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Playback controls ─────────────────────────────────────────────────────

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSpeedChange = () => {
    const speeds = [0.5, 1.0, 1.25, 1.5, 2.0]
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length]
    setPlaybackRate(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) audioRef.current.currentTime = time
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono p-4 sm:p-8 flex flex-col relative overflow-hidden">

      {/* Background dot grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
        <Link href="/home" className="flex items-center gap-2 font-bold hover:underline decoration-2">
          <ArrowLeft className="w-5 h-5" />
          RETURN
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-red-500 w-4 h-4 rounded-full animate-pulse border-2 border-black" />
          <span className="font-black uppercase text-xl tracking-tighter">Pirate Radio</span>
        </div>
        <div className="w-24" />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="w-full max-w-3xl flex flex-col gap-6">

          {/* ── Resume prompt ── */}
          {showResumePrompt && savedPodcast && !audioUrl && (
            <div className="bg-yellow-400 border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-black uppercase text-sm">Previous session found</p>
                <p className="font-bold text-xs text-black/70 truncate max-w-xs mt-0.5">
                  {savedPodcast.fileName} &mdash; saved {new Date(savedPodcast.savedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={loadSavedPodcast}
                  className="bg-black text-white border-2 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  Resume
                </button>
                <button
                  onClick={discardSaved}
                  className="bg-white border-2 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  Generate New
                </button>
              </div>
            </div>
          )}

          {/* ── Cassette Player ── */}
          <div className="bg-[#2a2a2a] border-[6px] border-black p-8 rounded-[2rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">

            {/* Screw heads */}
            {[['top-4 left-4', '45'], ['top-4 right-4', '12'], ['bottom-4 left-4', '-45'], ['bottom-4 right-4', '90']].map(([pos, rot]) => (
              <div key={pos} className={`absolute ${pos} w-4 h-4 bg-gray-400 rounded-full border-2 border-black flex items-center justify-center`}>
                <div className={`w-2 h-0.5 bg-black rotate-[${rot}deg]`} />
              </div>
            ))}

            {/* Cassette window */}
            <div className="bg-[#e0e0e0] p-6 rounded-xl border-4 border-black shadow-inner mb-8 relative overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/10 rounded-full blur-xl" />

              {/* Tape label */}
              <div className="bg-yellow-400 border-4 border-black p-2 mb-4 rotate-1 shadow-sm max-w-md mx-auto text-center">
                <h2 className="font-black uppercase text-lg truncate">
                  {fileName || 'NO TAPE INSERTED'}
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest border-t-2 border-black mt-1 pt-1">
                  Side A • {loading ? 'RECORDING...' : 'MASTER COPY'}
                </p>
              </div>

              {/* Reels */}
              <div className="flex justify-center gap-12 items-center bg-[#333] p-4 rounded-lg border-4 border-black relative">
                {[0, 1].map(i => (
                  <div
                    key={i}
                    className={`w-24 h-24 rounded-full border-[6px] border-white bg-black flex items-center justify-center relative ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}
                  >
                    <div className="w-20 h-20 rounded-full border-4 border-white/20 border-dashed" />
                    <div className="absolute w-full h-2 bg-transparent border-l-4 border-r-4 border-white/50" />
                    <div className="absolute w-2 h-full bg-transparent border-t-4 border-b-4 border-white/50" />
                  </div>
                ))}
                {/* Tape strip */}
                <div className="absolute left-[calc(50%-4rem)] right-[calc(50%-4rem)] h-8 bg-[#5c3a2e]/80 border-y-2 border-black/30 pointer-events-none" />
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-6">

              {/* Error */}
              {error && (
                <div className="bg-red-500 border-4 border-black p-2 text-center font-bold text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  ERR: {error}
                </div>
              )}

              {/* Generate button */}
              {!audioUrl && (
                <div className="text-center">
                  <button
                    onClick={generatePodcast}
                    disabled={loading || !fileName}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-red-500 border-4 border-black font-black text-white uppercase text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin" size={24} /><span>Synthesizing...</span></>
                    ) : (
                      <><Mic2 className="animate-pulse" size={24} /><span>Start Session</span></>
                    )}
                  </button>
                </div>
              )}

              {/* Player */}
              {audioUrl && (
                <div className="flex flex-col gap-6">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                    onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
                    className="hidden"
                  />

                  {/* Progress bar */}
                  <div className="bg-[#111] p-1 border-4 border-black rounded-full relative h-8">
                    <div
                      className="h-full bg-green-500 rounded-l-full border-r-4 border-black transition-all"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                    <input
                      type="range" min="0" max={duration || 100} value={currentTime}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase px-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Buttons row */}
                  <div className="flex items-center justify-center gap-6">

                    {/* Speed */}
                    <button
                      onClick={handleSpeedChange}
                      className="w-16 h-12 bg-gray-200 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-sm hover:translate-y-1 active:shadow-none active:translate-y-[4px] transition-all"
                    >
                      {playbackRate}x
                    </button>

                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="w-24 h-24 bg-red-500 border-4 border-black rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:translate-y-1 active:shadow-none active:translate-y-[6px] transition-all"
                    >
                      {isPlaying
                        ? <Pause size={32} className="text-white fill-current" />
                        : <Play size={32} className="text-white fill-current ml-2" />}
                    </button>

                    {/* Download */}
                    <a
                      href={audioUrl}
                      download={`podcast-${fileName.replace(/\s+/g, '-').toLowerCase()}.mp3`}
                      className="w-16 h-12 bg-blue-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black flex items-center justify-center hover:translate-y-1 active:shadow-none active:translate-y-[4px] transition-all"
                      title="Download"
                    >
                      <Download size={20} />
                    </a>
                  </div>

                  {/* Regenerate link */}
                  <button
                    onClick={() => { setAudioUrl(null); setCurrentTime(0); setDuration(0); setIsPlaying(false) }}
                    className="self-center flex items-center gap-2 text-xs font-black uppercase text-gray-400 hover:text-white transition-colors underline decoration-dotted"
                  >
                    <RotateCcw size={12} />
                    Generate New Version
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}