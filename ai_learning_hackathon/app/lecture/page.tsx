"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MessageSquare, ChevronLeft, ChevronRight, BookOpen, Loader2, MicOff, Volume2 } from 'lucide-react';
import { SummaryResponse,summarizeText } from '@/services/lecture_api';

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
    // Access the 'pages' array inside the object
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
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────
const Lecture: React.FC = () => {
  const allPages = getPagesFromStorage();
  const totalChunks = Math.max(1, Math.ceil(allPages.length / PAGES_PER_CHUNK));

  const [chunkIndex, setChunkIndex] = useState(0);          // 0-based chunk index
  const [cache, setCache] = useState<Record<number, CachedChunk>>(getCacheFromStorage);
  const [content, setContent] = useState<CachedChunk>({ resp: "", images: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState<number>(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello! I'm your AI instructor. Ask me anything about the current lesson." }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch or serve from cache when chunk changes ──────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  //sppech stop when changing chunks
  useEffect(() => {
  window.speechSynthesis.cancel();
  setIsSpeaking(false);
  setWordIndex(-1);
}, [chunkIndex]);

  useEffect(() => {
    const loadChunk = async () => {
      // If cached, use it immediately
      if (cache[chunkIndex]) {
        setContent(cache[chunkIndex]);
        return;
      }

      // No pages stored → show placeholder
      if (allPages.length === 0) {
        setContent({
          resp: "No pages found in local storage.\n\nStore your pages under the key \"lecture_pages\" as:\n[\n  { \"page\": 1, \"text\": \"...\" },\n  { \"page\": 2, \"text\": \"...\" }\n]",
          images: []
        });
        return;
      }

      // Slice 3 pages and call API
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        text: "Great question! This relates to the material in " + pageLabel + ". Let me think through that for you..."
      }]);
    }, 900);
  };


  // ── TTS────────────────────────────────────────────────────────────────
  const handleSpeak = () => {
  if (!content.resp) return;
  window.speechSynthesis.cancel();
  const words = content.resp.split(/\s+/);
  const utterance = new SpeechSynthesisUtterance(content.resp);
  utteranceRef.current = utterance;

  utterance.onboundary = (e) => {
    // count words spoken so far by character index
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
    <div className="min-h-screen bg-[#f1f5f9] p-4 font-sans text-slate-800 flex flex-col items-center overflow-hidden">

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes chalkIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chalk-in { animation: chalkIn 0.7s ease both; }
      `}</style>

      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-black text-slate-700 tracking-tight">
          AI Academy <span className="text-emerald-600">Interactive Terminal</span>
        </h1>
      </div>

      <div className="w-full max-w-[1800px] grid grid-cols-12 gap-4 items-end ">

        {/* ── Teacher (Left) ── */}
        <div className="col-span-2 flex flex-col items-center justify-end pb-8 ">
          <div className="relative group ">
            <img
              src="https://i.pinimg.com/originals/17/b4/d7/17b4d75844d047a1ae585bda3c27b6ec.gif"
              alt="Instructor"
              className="w-full h-auto max-h-[400px] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              onError={(e: any) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/3429/3429400.png"; }}
            />
            <div className="mt-2 bg-white/95 backdrop-blur-sm shadow-xl border border-slate-200 px-4 py-2 rounded-2xl text-center transform -rotate-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Live Instructor
              </span>
            </div>
          </div>
        </div>

        {/* ── Blackboard (Center) ── */}
        <div className="col-span-8 flex flex-col gap-3">
          <div className="relative h-[700px] w-full bg-[#1e3932] rounded-[2.5rem] border-[14px] border-[#3e2723] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden ring-4 ring-black/10">

            {/* Chalkboard texture */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/chalkboard.png')] pointer-events-none"></div>

            {/* Page label chip */}
            <div className="absolute top-5 left-5 flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
              <BookOpen size={12} className="text-white/70" />
              <span className="text-white/70 text-[11px] font-mono tracking-widest uppercase">{pageLabel}</span>
            </div>

            <div className="relative h-full p-12 flex flex-col">
              {/* Loading state */}
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={40} className="text-white/60 animate-spin" />
                  <p className="text-white/50 font-mono text-sm tracking-widest uppercase">Generating summary…</p>
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <p className="text-red-300 font-mono text-sm">⚠ {error}</p>
                  <button
                    onClick={() => { const tmp = chunkIndex; setChunkIndex(-1); setTimeout(() => setChunkIndex(tmp), 50); }}
                    className="mt-2 px-4 py-2 bg-white/10 text-white/70 rounded-xl text-xs hover:bg-white/20 transition"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Content */}
              {!loading && !error && (
                <>
                  <div
                    key={chunkIndex}
                    className="chalk-in text-white/90 text-3xl leading-relaxed max-w-[65%] whitespace-pre-wrap overflow-y-auto custom-scrollbar"
                    style={{ fontFamily: '"Gochi Hand", cursive', filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))', maxHeight: '560px' }}
                  >
                    {content.resp ? (
                      content.resp.split(/(\s+)/).map((token, i) => {
                        const isWord = token.trim().length > 0;
                        // word position = number of non-space tokens before this one
                        const wPos = content.resp.split(/\s+/).slice(0, content.resp.split(/(\s+)/).slice(0, i).filter(t => t.trim()).length).length;
                        const wordPos = content.resp.split(/(\s+)/).slice(0, i).filter(t => t.trim()).length;
                        return (
                          <span
                            key={i}
                            style={isWord && wordPos === wordIndex ? {
                              background: 'rgba(255,220,0,0.35)',
                              borderRadius: '4px',
                              padding: '0 2px',
                              transition: 'background 0.15s'
                            } : {}}
                          >
                            {token}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-white/30 text-xl italic">No content yet.</span>
                    )}
                  </div>

                  {/* Pinned diagrams */}
              
                  <div className="absolute top-0 right-4 bottom-0 w-[260px] py-10 flex flex-col gap-8 overflow-y-auto custom-scrollbar pointer-events-auto">
                    {content.images?.map((imgUrl, index) => (
                      <div
                        key={index}
                        className="group relative bg-white p-2 pb-6 shadow-2xl transform transition-all hover:scale-110 hover:rotate-0 flex-shrink-0 mx-4"
                        style={{ 
                          rotate: index % 2 === 0 ? '3deg' : '-4deg',
                          marginTop: index === 0 ? '20px' : '0px'
                        }}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Fig ${index + 1}`} 
                          className="w-full h-auto border border-slate-100 object-cover" 
                        />
                        <p className="mt-2 text-[10px] font-mono text-slate-400 text-center uppercase tracking-tighter">
                          Ref_0{index + 1}.png
                        </p>
                        {/* Red pin head */}
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md border border-red-700"></div>
                      </div>
                    ))}
                    {/* Spacer at the bottom to ensure the last image isn't cut off by the tray */}
                    <div className="h-10 w-full flex-shrink-0"></div>
                  </div>
                </>
              )}

              {/* Chalk stubs */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 opacity-50">
                <div className="w-10 h-3 bg-white rounded-sm rotate-12"></div>
                <div className="w-8 h-3 bg-blue-100 rounded-sm -rotate-6"></div>
              </div>
            </div>
          </div>

          {/* Chalk tray */}
          <div className="h-4 w-[104%] -ml-[2%] bg-[#2d1b18] rounded-full mt-1 blur-[1px]"></div>

          {/* ── Navigation Bar ── */}
          <div className="flex items-center justify-between bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white px-5 py-3 mt-1">
            <button
              onClick={goPrev}
              disabled={chunkIndex === 0 || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 active:scale-95 transition-all shadow"
            >
              <ChevronLeft size={18} />
              Back
            </button>

            {/* Chunk dots */}
            <div className="flex items-center gap-2">
              {Array.from({ length: totalChunks }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setChunkIndex(i)}
                  disabled={loading}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === chunkIndex ? 'bg-emerald-500 scale-125' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
              <span className="ml-3 text-xs text-slate-400 font-mono">
                {chunkIndex + 1} / {totalChunks}
              </span>
            </div>

            <button
              onClick={goNext}
              disabled={chunkIndex === totalChunks - 1 || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all shadow shadow-emerald-100"
            >
              Next
              <ChevronRight size={18} />
            </button>

            <button
              onClick={isSpeaking ? handleStopSpeak : handleSpeak}
              disabled={loading || !content.resp}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                isSpeaking
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-100'
                  : 'bg-amber-400 text-slate-900 hover:bg-amber-500 shadow-amber-100'
              }`}
            >
              {isSpeaking ? <MicOff size={18} /> : <Volume2 size={18} />}
              {isSpeaking ? 'Stop' : 'Listen'}
            </button>
          </div>
        </div>

        {/* ── Doubt Box (Right) ── */}
        <div className="col-span-2 h-[700px] mb-[72px] flex flex-col">
          <div className="flex-1 bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-slate-900 rounded-xl text-white">
                <MessageSquare size={16} />
              </div>
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-widest">Doubt Box</h3>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar pr-2">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-2xl text-[11px] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-100 text-slate-600 rounded-bl-none border border-slate-200'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <textarea
                rows={3}
                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none shadow-inner"
                placeholder="Type your question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSend}
                  className="flex-1 py-3.5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-100"
                >
                  <Send size={16} />
                </button>
                <button className="w-14 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-slate-100">
                  <Mic size={16} />
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