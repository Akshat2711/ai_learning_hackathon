'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Play, Pause, Download, Disc, Mic2, Sparkles, AlertCircle, Loader2, FastForward, Rewind, Volume2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function PodcastPage() {
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const router = useRouter()

  useEffect(() => {
    const contentString = localStorage.getItem('uploadedContent')
    if (contentString) {
      const content = JSON.parse(contentString)
      setFileName(content.fileName || 'Untitled Document')
    }
  }, [])

  const generatePodcast = async () => {
    setLoading(true)
    setError(null)
    setAudioUrl(null)

    try {
      const contentString = localStorage.getItem('uploadedContent')
      if (!contentString) {
        throw new Error('No document found. Please upload a PDF first.')
      }

      const content = JSON.parse(contentString)
      const fullText = content.pages.map((p: any) => p.text).join('\n\n')

      if (!fullText || fullText.length < 50) {
        throw new Error('Document content is too short to generate a podcast.')
      }

      const response = await fetch('https://dialogue-agent.onrender.com/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText.slice(0, 100000) }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Failed to generate podcast')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

    } catch (err: any) {
      console.error('Podcast generation failed:', err)
      setError(err.message || 'Something went wrong. Is the microservice running?')
    } finally {
      setLoading(false)
    }
  }

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
    const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono p-4 sm:p-8 flex flex-col relative overflow-hidden">

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-12">
        <Link href="/home" className="flex items-center gap-2 font-bold hover:underline decoration-2">
          <ArrowLeft className="w-5 h-5" />
          RETURN
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-red-500 w-4 h-4 rounded-full animate-pulse border-2 border-black"></div>
          <span className="font-black uppercase text-xl tracking-tighter">Pirate Radio</span>
        </div>
        <div className="w-24"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">

        <div className="w-full max-w-3xl">

          {/* Cassette Player Container */}
          <div className="bg-[#2a2a2a] border-[6px] border-black p-8 rounded-[2rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative">

            {/* Screw heads */}
            <div className="absolute top-4 left-4 w-4 h-4 bg-gray-400 rounded-full border-2 border-black flex items-center justify-center"><div className="w-2 h-0.5 bg-black rotate-45"></div></div>
            <div className="absolute top-4 right-4 w-4 h-4 bg-gray-400 rounded-full border-2 border-black flex items-center justify-center"><div className="w-2 h-0.5 bg-black rotate-12"></div></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 bg-gray-400 rounded-full border-2 border-black flex items-center justify-center"><div className="w-2 h-0.5 bg-black -rotate-45"></div></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 bg-gray-400 rounded-full border-2 border-black flex items-center justify-center"><div className="w-2 h-0.5 bg-black rotate-90"></div></div>

            {/* Cassette Window area */}
            <div className="bg-[#e0e0e0] p-6 rounded-xl border-4 border-black shadow-inner mb-8 relative overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/10 rounded-full blur-xl"></div>

              {/* Tape Label */}
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
                {/* Left Reel */}
                <div className={`w-24 h-24 rounded-full border-[6px] border-white bg-black flex items-center justify-center relative ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <div className="w-20 h-20 rounded-full border-4 border-white/20 border-dashed"></div>
                  <div className="absolute w-full h-2 bg-transparent border-l-4 border-r-4 border-white/50"></div>
                  <div className="absolute w-2 h-full bg-transparent border-t-4 border-b-4 border-white/50"></div>
                </div>

                {/* Tape Window */}
                <div className="h-16 flex-1 bg-black/80 border-2 border-zinc-700 relative overflow-hidden">
                  <div className="absolute top-1/2 left-0 right-0 h-8 bg-[#5c3a2e] -translate-y-1/2 opacity-80"></div>
                </div>

                {/* Right Reel */}
                <div className={`w-24 h-24 rounded-full border-[6px] border-white bg-black flex items-center justify-center relative ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <div className="w-20 h-20 rounded-full border-4 border-white/20 border-dashed"></div>
                  <div className="absolute w-full h-2 bg-transparent border-l-4 border-r-4 border-white/50"></div>
                  <div className="absolute w-2 h-full bg-transparent border-t-4 border-b-4 border-white/50"></div>
                </div>
              </div>
            </div>

            {/* Controls Area */}
            <div className="flex flex-col gap-6">

              {/* Generate / Error Msg */}
              {error && (
                <div className="bg-red-500 border-4 border-black p-2 text-center font-bold text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  ERR: {error}
                </div>
              )}

              {!audioUrl ? (
                <div className="text-center">
                  <button
                    onClick={generatePodcast}
                    disabled={loading || !fileName}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-red-500 border-4 border-black font-black text-white uppercase text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={24} />
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <Mic2 className="animate-pulse" size={24} />
                        <span>Start Session</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                  />

                  {/* Progress Bar */}
                  <div className="bg-[#111] p-1 border-4 border-black rounded-full relative h-8">
                    <div
                      className="h-full bg-green-500 rounded-l-full border-r-4 border-black"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    ></div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase font-mono px-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-center gap-8">

                    <button
                      onClick={handleSpeedChange}
                      className="w-16 h-12 bg-gray-200 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-sm hover:translate-y-1 active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center"
                    >
                      {playbackRate}x
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-24 h-24 bg-red-500 border-4 border-black rounded-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:translate-y-1 active:shadow-none active:translate-y-[6px] transition-all"
                    >
                      {isPlaying ? <Pause size={32} className="text-white fill-current" /> : <Play size={32} className="text-white fill-current ml-2" />}
                    </button>

                    <a
                      href={audioUrl}
                      download={`podcast-${fileName.replace(/\s+/g, '-').toLowerCase()}.mp3`}
                      className="w-16 h-12 bg-blue-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black flex items-center justify-center hover:translate-y-1 active:shadow-none active:translate-y-[4px] transition-all"
                      title="Download"
                    >
                      <Download size={20} />
                    </a>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
