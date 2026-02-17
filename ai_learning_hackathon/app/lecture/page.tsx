"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MessageSquare, ChevronLeft, ChevronRight, BookOpen, Loader2, MicOff, Volume2, Radio, User, Terminal, ArrowLeft } from 'lucide-react';
import { SummaryResponse, summarizeText } from '@/services/lecture_api';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Page {
  page: number;
  text: string;
}

interface CachedChunk {
  resp: string;
  images: string[];
}

interface Message {
  role: 'ai' | 'user';
  text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGES_PER_CHUNK = 3;
const STORAGE_KEY = "uploadedContent";
const CACHE_KEY = "lecture_cache";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPagesFromStorage(): Page[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.pages) ? parsed.pages : [];
  } catch {
    return [];
  }
}

function getCacheFromStorage(): Record<number, CachedChunk> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCacheToStorage(cache: Record<number, CachedChunk>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { }
}

const Lecture: React.FC = () => {
  const allPages = getPagesFromStorage();
  const totalChunks = Math.max(1, Math.ceil(allPages.length / PAGES_PER_CHUNK));

  const [chunkIndex, setChunkIndex] = useState(0);
  const [cache, setCache] = useState<Record<number, CachedChunk>>(getCacheFromStorage);
  const [content, setContent] = useState<CachedChunk>({ resp: "", images: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState<number>(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "SYSTEM READY. AWAITING QUERY." }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch or serve from cache ──────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setWordIndex(-1);
  }, [chunkIndex]);

  useEffect(() => {
    const loadChunk = async () => {
      if (cache[chunkIndex]) {
        setContent(cache[chunkIndex]);
        return;
      }

      if (allPages.length === 0) {
        setContent({
          resp: "NO DATA FOUND.\n\nUPLOAD PDF TO INITIALIZE LECTURE PROTOCOL.",
          images: []
        });
        return;
      }

      const slice = allPages.slice(
        chunkIndex * PAGES_PER_CHUNK,
        chunkIndex * PAGES_PER_CHUNK + PAGES_PER_CHUNK
      );
      const combinedText = slice.map(p => `[Page ${p.page}]\n${p.text}`).join("\n\n---\n\n");

      setLoading(true);
      setError(null);

      try {
        const result = await summarizeText(combinedText);
        const newCache = { ...cache, [chunkIndex]: result };
        setCache(newCache);
        saveCacheToStorage(newCache);
        setContent(result);
      } catch (err: any) {
        setError(err.message ?? "Unknown error");
        setContent({ resp: "", images: [] });
      } finally {
        setLoading(false);
      }
    };

    loadChunk();
  }, [chunkIndex]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => setChunkIndex(i => Math.min(i + 1, totalChunks - 1));
  const goPrev = () => setChunkIndex(i => Math.max(i - 1, 0));

  const currentPages = allPages.slice(
    chunkIndex * PAGES_PER_CHUNK,
    chunkIndex * PAGES_PER_CHUNK + PAGES_PER_CHUNK
  );
  const pageLabel = currentPages.length
    ? `Pages ${currentPages[0].page}–${currentPages[currentPages.length - 1].page}`
    : `Chunk ${chunkIndex + 1}`;

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setQuestion("");
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: "PROCESSING INPUT... RELATING TO SECTION -> " + pageLabel + ". STANDBY."
      }]);
    }, 900);
  };

  // ── TTS ────────────────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!content.resp) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.resp);
    utteranceRef.current = utterance;

    utterance.onboundary = (e) => {
      const spoken = content.resp.slice(0, e.charIndex + e.charLength);
      const wordCount = spoken.trim().split(/\s+/).length - 1;
      setWordIndex(wordCount);
    };
    utterance.onend = () => { setIsSpeaking(false); setWordIndex(-1); };
    utterance.onerror = () => { setIsSpeaking(false); setWordIndex(-1); };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setWordIndex(-1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono p-4 sm:p-8 flex flex-col items-center overflow-x-hidden">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div className="w-full max-w-[1600px] mb-8 flex justify-between items-center bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <Link href="/pdfviewer" className="flex items-center gap-2 font-bold hover:underline decoration-2">
          <ArrowLeft className="w-5 h-5" />
          RETURN
        </Link>
        <div className="text-center">
          <h1 className="text-3xl font-black uppercase tracking-tighter">
            Neural Classroom
          </h1>
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            System Online
          </div>
        </div>
        <div className="w-24"></div>
      </div>

      <div className="w-full max-w-[1800px] grid grid-cols-12 gap-8 items-start">

        {/* ── Left Column: Video Tutor ── */}
        <div className="col-span-3 flex flex-col gap-6">

          {/* Instructor Card */}
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center relative">
            <div className="w-full aspect-video border-4 border-black mb-4 bg-black overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <video
                src="/teacher_video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-green-500/10 pointer-events-none"></div>
              <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 animate-pulse">LIVE</div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black uppercase text-xl">UNIT-734</h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
                <div className="w-2 h-2 bg-black rounded-full"></div>
              </div>
            </div>
            <p className="text-xs font-bold uppercase text-gray-500 border-t-2 border-black pt-2 text-left">Active Instructor</p>

            <button
              onClick={isSpeaking ? handleStopSpeak : handleSpeak}
              disabled={loading || !content.resp}
              className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-4 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all ${isSpeaking ? 'bg-red-500 text-white' : 'bg-green-400 text-black'
                }`}
            >
              {isSpeaking ? <MicOff size={20} /> : <Volume2 size={20} />}
              {isSpeaking ? 'Term. Audio' : 'Init. Audio'}
            </button>
          </div>

          {/* Visual Data (Moved from Right) */}
          {content.images && content.images.length > 0 && (
            <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between border-b-4 border-black pb-2 mb-4">
                <h3 className="font-black uppercase">Visual Data</h3>
                <div className="bg-black text-white text-xs px-2 font-bold">{content.images.length}</div>
              </div>
              <div className="flex flex-col gap-6 p-2">
                {content.images.map((imgUrl, index) => (
                  <div key={index} className="relative group overflow-visible">
                    {/* The Pin */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-black shadow-sm"></div>
                      <div className="w-0.5 h-3 bg-black mx-auto"></div>
                    </div>

                    {/* The Image */}
                    <div className="bg-white p-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform rotate-1 group-hover:rotate-0 transition-transform">
                      <img src={imgUrl} alt={`Fig ${index}`} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all" />
                    </div>
                    <div className="absolute bottom-[-10px] right-[-5px] bg-yellow-400 border-2 border-black px-2 text-[10px] font-bold uppercase transform -rotate-3 z-10">
                      Fig. 0{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Center: Greenboard ── */}
        <div className="col-span-6 flex flex-col gap-6">
          <div className="relative min-h-[750px] w-full bg-[#1e3932] rounded-[2rem] border-[12px] border-[#3e2723] shadow-[12px_12px_0px_0px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">

            {/* Chalkboard Texture Overlay */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/chalkboard.png')] pointer-events-none"></div>

            {/* Board Header */}
            <div className="relative z-10 flex justify-between items-center px-8 py-6">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                <span className="text-white/80 font-mono text-xs font-bold uppercase tracking-widest">
                  {pageLabel}
                </span>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              </div>
            </div>

            <div className="relative flex-1 p-8 sm:px-12 flex flex-col font-mono z-10">
              {/* Loading state */}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={40} className="text-white animate-spin" />
                  <p className="text-white font-bold uppercase tracking-widest animate-pulse">Decorrelating Data...</p>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="bg-red-500 text-white p-4 border-4 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <p className="font-bold uppercase">System Error: {error}</p>
                  </div>
                  <button
                    onClick={() => { const tmp = chunkIndex; setChunkIndex(-1); setTimeout(() => setChunkIndex(tmp), 50); }}
                    className="mt-2 px-4 py-2 bg-white text-black font-bold uppercase hover:bg-gray-200"
                  >
                    Retry Protocol
                  </button>
                </div>
              )}

              {/* Content */}
              {!loading && !error && (
                <div
                  key={chunkIndex}
                  className="text-xl md:text-2xl leading-relaxed whitespace-pre-wrap overflow-y-auto pr-4 custom-scrollbar text-white/90"
                  style={{
                    fontFamily: '"Gochi Hand", cursive',
                    maxHeight: '550px',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                  }}
                >
                  {content.resp ? (
                    content.resp.split(/(\s+)/).map((token, i) => {
                      const isWord = token.trim().length > 0;
                      const wordPos = content.resp.split(/(\s+)/).slice(0, i).filter(t => t.trim()).length;
                      return (
                        <span
                          key={i}
                          style={isWord && wordPos === wordIndex ? {
                            backgroundColor: 'rgba(255,221,0,0.4)',
                            borderRadius: '4px',
                            padding: '0 2px',
                            boxShadow: '0 0 10px rgba(255,221,0,0.2)'
                          } : {}}
                        >
                          {token}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-white/40 italic">... NO DATA STREAM ...</span>
                  )}
                </div>
              )}
            </div>

            {/* Chalk Tray / Bottom Controls */}
            <div className="mt-auto bg-[#2d1b18] p-4 flex justify-between items-center relative shadow-inner border-t-[8px] border-[#3e2723]">
              {/* Chalks */}
              <div className="absolute -top-3 left-12 flex gap-2">
                <div className="w-12 h-2 bg-white rounded-sm shadow-sm transform -rotate-2"></div>
                <div className="w-8 h-2 bg-blue-200 rounded-sm shadow-sm transform rotate-6"></div>
              </div>

              <div className="w-full flex justify-between items-center z-10 px-4">
                <button
                  onClick={goPrev}
                  disabled={chunkIndex === 0 || loading}
                  className="bg-[#1e3932] text-white border-2 border-[#5d4037] px-6 py-2 rounded-lg font-black uppercase text-sm hover:bg-[#2e5248] disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-all active:translate-y-1"
                >
                  Prev Slide
                </button>

                <span className="text-[#8d6e63] text-xs font-bold uppercase tracking-widest inset-x-0 mx-auto absolute text-center pointer-events-none">
                  Interactive Board v2.0
                </span>

                <button
                  onClick={goNext}
                  disabled={chunkIndex === totalChunks - 1 || loading}
                  className="bg-[#1e3932] text-white border-2 border-[#5d4037] px-6 py-2 rounded-lg font-black uppercase text-sm hover:bg-[#2e5248] disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-all active:translate-y-1"
                >
                  Next Slide
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Doubt Box ── */}
        <div className="col-span-3 flex flex-col gap-6">

          <div className="h-[600px] flex flex-col bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-pink-500 border-b-4 border-black p-3 flex items-center justify-between">
              <span className="font-black uppercase text-white">Direct Line</span>
              <MessageSquare className="text-white" size={20} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 border-2 border-black text-xs font-bold ${msg.role === 'user'
                      ? 'bg-blue-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t-4 border-black bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full bg-white border-2 border-black p-2 text-xs font-bold placeholder-gray-400 focus:outline-none focus:bg-yellow-50"
                  placeholder="INPUT QUERY..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                />
                <button
                  onClick={handleSend}
                  className="bg-black text-white p-2 border-2 border-black hover:bg-gray-800"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Lecture;