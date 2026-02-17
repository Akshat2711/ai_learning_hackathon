'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Play, Pause, Download, Disc, Mic2, Sparkles, AlertCircle, Loader2, FastForward, Rewind } from 'lucide-react'
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
    // Load content from localStorage
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
      // proper text extraction: concatenate all pages
      const fullText = content.pages.map((p: any) => p.text).join('\n\n')

      if (!fullText || fullText.length < 50) {
        throw new Error('Document content is too short to generate a podcast.')
      }

      // Call the microservice
      // Assuming it's running on localhost:8000
      const response = await fetch('https://dialogue-agent.onrender.com/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fullText.slice(0, 100000) // Limit to 100k chars to be safe
        }),
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
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/home" className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-600 to-rose-600 shadow-lg shadow-rose-500/20">
                <Mic2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">Podcast Studio</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 pt-32">
        <div className="w-full max-w-2xl">
          
          {/* Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl">
            {/* Background Gradient */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              
              {/* Vinyl Animation */}
              <div className={`relative mb-8 h-48 w-48 rounded-full border-4 border-zinc-800 bg-zinc-950 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''}`}>
                 <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(#333,transparent_2px)] opacity-20"></div>
                 <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 shadow-inner flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-black/50 backdrop-blur"></div>
                 </div>
                 {/* Needle/arm simplified */}
                 {isPlaying && (
                     <div className="absolute -top-10 right-0 w-2 h-24 bg-zinc-400 origin-top rotate-[25deg] shadow-lg transition-transform duration-700"></div>
                 )}
              </div>

              <h2 className="text-2xl font-bold text-white mb-2 line-clamp-1 max-w-full">
                {fileName || 'No Document Selected'}
              </h2>
              <p className="text-zinc-400 mb-8 max-w-md">
                Convert your document into an engaging audio conversation between two experts.
              </p>

              {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 border border-red-500/20">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {!audioUrl ? (
                <button
                  onClick={generatePodcast}
                  disabled={loading || !fileName}
                  className="group relative flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-black transition-all hover:scale-105 hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Magic...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-rose-500" />
                      Generate Podcast
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full space-y-6">
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

                    {/* Timeline */}
                    <div className="w-full flex flex-col gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        onChange={handleSeek}
                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400"
                      />
                      <div className="flex justify-between text-xs text-zinc-400 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between gap-4">
                        {/* Speed Control */}
                        <button 
                          onClick={handleSpeedChange}
                          className="w-12 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                          {playbackRate}x
                        </button>

                        {/* Main Play Button */}
                        <button 
                            onClick={togglePlay}
                            className="h-16 w-16 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
                        </button>

                        {/* Download Button (Icon only) */}
                        <a 
                            href={audioUrl} 
                            download={`podcast-${fileName.replace(/\s+/g, '-').toLowerCase()}.mp3`}
                            className="w-12 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                            title="Download"
                        >
                            <Download className="h-5 w-5" />
                        </a>
                    </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

       {/* Custom CSS for spin */}
       <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  )
}
