"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MessageSquare, ChevronLeft, ChevronRight, BookOpen, Loader2, MicOff, Volume2 } from 'lucide-react';
import { SummaryResponse, summarizeText } from '@/services/lecture_api';
import { Doubt_clear } from '@/services/lecture_doubt_api';

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
  } catch { return []; }
}
function getCacheFromStorage(): Record<number, CachedChunk> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveCacheToStorage(cache: Record<number, CachedChunk>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────
const Lecture: React.FC = () => {
  const allPages = getPagesFromStorage();
  const totalChunks = Math.max(1, Math.ceil(allPages.length / PAGES_PER_CHUNK));

  const [chunkIndex, setChunkIndex] = useState(0);
  const [cache, setCache] = useState<Record<number, CachedChunk>>(getCacheFromStorage);
  const [content, setContent] = useState<CachedChunk>({ resp: "", images: [] });
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wordIndex, setWordIndex] = useState<number>(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello! I'm your AI instructor. Ask me anything about the current lesson." }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

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
        setContent({ resp: "No pages found in local storage.", images: [] });
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

  const goNext = () => setChunkIndex(i => Math.min(i + 1, totalChunks - 1));
  const goPrev = () => setChunkIndex(i => Math.max(i - 1, 0));

  const currentPages = allPages.slice(
    chunkIndex * PAGES_PER_CHUNK,
    chunkIndex * PAGES_PER_CHUNK + PAGES_PER_CHUNK
  );
  const pageLabel = currentPages.length
    ? `Pages ${currentPages[0].page}–${currentPages[currentPages.length - 1].page}`
    : `Chunk ${chunkIndex + 1}`;

  const currentSlice = allPages.slice(
    chunkIndex * PAGES_PER_CHUNK,
    chunkIndex * PAGES_PER_CHUNK + PAGES_PER_CHUNK
  );

  const handleSend = async () => {
    if (!question.trim() || chatLoading) return;
    const contextText = currentSlice.map(p => p.text).join("\n\n");
    const userQuery = question;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setQuestion("");
    setChatLoading(true);
    try {
      const response = await Doubt_clear(userQuery, contextText);
      setMessages(prev => [...prev, { role: 'ai', text: response.resp }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "I'm sorry, I'm having trouble connecting to my knowledge base right now." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false); }
    else { videoRef.current.pause(); setPaused(true); }
  };

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
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setWordIndex(-1);
  };

  // ── Voice Doubt Feature ──
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'wake' | 'listening' | 'processing'>('idle');
  const recognitionRef = useRef<any>(null);
  const wakeRecognitionRef = useRef<any>(null);

  const speakResponse = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      // After responding, go back to wake word listening
      startWakeWordListening();
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceQuestion = async (transcript: string) => {
    if (!transcript.trim()) { startWakeWordListening(); return; }
    setVoiceStatus('processing');
    const contextText = currentSlice.map(p => p.text).join("\n\n");
    setMessages(prev => [...prev, { role: 'user', text: transcript }]);
    setChatLoading(true);
    try {
      const response = await Doubt_clear(transcript, contextText);
      setMessages(prev => [...prev, { role: 'ai', text: response.resp }]);
      speakResponse(response.resp);
    } catch {
      const errMsg = "I'm sorry, I'm having trouble connecting right now.";
      setMessages(prev => [...prev, { role: 'ai', text: errMsg }]);
      speakResponse(errMsg);
    } finally {
      setChatLoading(false);
      setVoiceStatus('idle');
    }
  };

  const startQuestionListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    setVoiceStatus('listening');

    // Prompt user
    const prompt = new SpeechSynthesisUtterance("Yes? What's your question?");
    prompt.onend = () => { rec.start(); };
    window.speechSynthesis.speak(prompt);

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuestion(transcript);
      handleVoiceQuestion(transcript);
    };
    rec.onerror = () => { setVoiceStatus('idle'); startWakeWordListening(); };
    rec.onend = () => { if (voiceStatus === 'listening') setVoiceStatus('idle'); };
  };

  const startWakeWordListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    wakeRecognitionRef.current = rec;
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase().trim();
        if (t.includes('uncle x') || t.includes('uncle ex')) {
          rec.stop();
          setVoiceStatus('wake');
          startQuestionListening();
          return;
        }
      }
    };
    rec.onerror = () => {};
    rec.onend = () => {
      // Restart if still in idle mode
      if (isListening) {
        try { rec.start(); } catch {}
      }
    };

    setVoiceStatus('idle');
    try { rec.start(); } catch {}
  };

  const toggleVoiceMode = () => {
    if (isListening) {
      // Stop everything
      wakeRecognitionRef.current?.stop();
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
      setIsListening(false);
      setVoiceStatus('idle');
    } else {
      setIsListening(true);
      startWakeWordListening();
    }
  };

  useEffect(() => {
    return () => {
      wakeRecognitionRef.current?.stop();
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="h-screen bg-white font-sans text-slate-800 flex flex-col overflow-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }

        .chalk-scroll::-webkit-scrollbar { width: 5px; }
        .chalk-scroll::-webkit-scrollbar-track { background: transparent; }
        .chalk-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .chalk-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }

        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 10px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

        @keyframes chalkIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chalk-in { animation: chalkIn 0.6s ease both; }

        @keyframes blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        .thinking-dot { animation: blink 1.2s ease infinite; }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .msg-in { animation: slideIn 0.25s ease both; }

      `}</style>

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
            <BookOpen size={15} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Uncle <span className="text-emerald-600">X Classes</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-slate-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {pageLabel} · {chunkIndex + 1}/{totalChunks}
          </span>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Teacher Video ── */}
        <div className="flex-shrink-0 w-[260px] xl:w-[280px] flex flex-col items-center justify-end  pb-0 overflow-hidden relative">
          <div className="absolute inset-x-0 bottom-0 h-32  pointer-events-none z-10"></div>
          <div className="relative z-20 w-full flex justify-center">
            <video
              ref={videoRef}
              src="/assets/teacher_video.mp4"
              loop
              muted
              playsInline
              className="w-[200px] xl:w-[240px] object-contain video-glow"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>
        </div>

        {/* ── Center: Blackboard ── */}
        <div className="flex-1 flex flex-col min-w-0 p-3 gap-3">

          {/* Blackboard */}
          <div className="flex-1 relative bg-[#1a3d2e] rounded-2xl border-[10px] border-[#3e2010] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.5)] overflow-hidden ring-2 ring-black/20 min-h-0">
            {/* Chalk texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/chalkboard.png')] pointer-events-none z-0"></div>

            {/* Content area */}
            <div className="relative z-10 h-full flex overflow-hidden">

              {/* Text pane */}
              <div className="flex-1 h-full overflow-y-auto chalk-scroll p-8 xl:p-12 min-w-0">
                {loading && (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <Loader2 size={36} className="text-white/50 animate-spin" />
                    <p className="text-white/40 text-sm tracking-widest uppercase font-mono">Generating summary…</p>
                  </div>
                )}
                {!loading && error && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-red-300 font-mono text-sm">⚠ {error}</p>
                  </div>
                )}
                {!loading && !error && (
                  <div
                    key={chunkIndex}
                    className="chalk-in text-white/90 text-2xl xl:text-3xl leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: '"Gochi Hand", cursive', filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.4))' }}
                  >
                    {content.resp ? (
                      content.resp.split(/(\s+)/).map((token, i) => {
                        const wordPos = content.resp.split(/(\s+)/).slice(0, i).filter(t => t.trim()).length;
                        return (
                          <span
                            key={i}
                            style={token.trim() && wordPos === wordIndex ? {
                              background: 'rgba(255,220,0,0.3)',
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
                      <span className="text-white/25 text-xl italic">No content yet.</span>
                    )}
                  </div>
                )}
              </div>

              {/* Images sidebar */}
              {content.images?.length > 0 && (
                <div className="flex-shrink-0 w-[200px] xl:w-[240px] h-full overflow-y-auto chalk-scroll p-4 flex flex-col gap-6 border-l border-white/10">
                  {content.images.map((imgUrl, index) => (
                    <div
                      key={index}
                      className="relative bg-white p-1.5 pb-5 shadow-xl flex-shrink-0 transition-transform hover:scale-105"
                      style={{ transform: `rotate(${index % 2 === 0 ? '2deg' : '-2deg'})` }}
                    >
                      <img src={imgUrl} alt={`Fig ${index + 1}`} className="w-full h-auto object-cover" />
                      <p className="mt-1 text-[9px] font-mono text-slate-400 text-center uppercase tracking-tight">Ref_0{index + 1}.png</p>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow border border-red-700"></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chalk tray decorations */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 opacity-30 pointer-events-none">
              <div className="w-9 h-2.5 bg-white rounded rotate-12"></div>
              <div className="w-7 h-2.5 bg-blue-100 rounded -rotate-6"></div>
            </div>
          </div>

          {/* Chalk ledge */}
          <div className="h-3 w-[102%] -mx-[1%] bg-[#2d1b18] rounded-full blur-sm flex-shrink-0"></div>

          {/* Controls bar */}
          <div className="flex-shrink-0 flex items-center justify-between bg-white rounded-xl shadow-md border border-slate-100 px-4 py-2.5 gap-3">
            <button
              onClick={goPrev}
              disabled={chunkIndex === 0 || loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold disabled:opacity-30 hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <ChevronLeft size={15} /> Back
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalChunks }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setChunkIndex(i)}
                  disabled={loading}
                  className={`rounded-full transition-all ${i === chunkIndex ? 'w-5 h-2.5 bg-emerald-500' : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-400'}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { isSpeaking ? handleStopSpeak() : handleSpeak(); toggleVideo(); }}
                disabled={loading || !content.resp}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow active:scale-95 disabled:opacity-30 ${isSpeaking ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-900'}`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {isSpeaking ? <MicOff size={14} /> : <Volume2 size={14} />}
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>

              <button
                onClick={goNext}
                disabled={chunkIndex === totalChunks - 1 || loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-30 hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-100"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Chatbot ── */}
        <div className="flex-shrink-0 w-[280px] xl:w-[320px] flex flex-col p-3 gap-0">
          <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden min-h-0">

            {/* Chat header */}
            <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare size={14} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-800 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>Doubt Box</h3>
                <p className="text-[10px] text-slate-400">Ask Uncle X anything</p>
              </div>
              <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto chat-scroll px-3 py-3 space-y-3 min-h-0"
            >
              {messages.map((msg, i) => (
                <div key={i} className={`msg-in flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 px-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {msg.role === 'user' ? 'You' : 'Uncle X'}
                  </span>
                  <div
                    className={`max-w-[88%] px-3 py-2.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-tr-sm'
                        : 'bg-slate-50 text-slate-700 rounded-tl-sm border border-slate-200'
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="msg-in flex flex-col gap-1 items-start">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 px-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>Uncle X</span>
                  <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                    <span className="thinking-dot w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                    <span className="thinking-dot w-2 h-2 bg-emerald-400 rounded-full inline-block"></span>
                    <span className="thinking-dot w-2 h-2 bg-emerald-300 rounded-full inline-block"></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Voice status banner */}
            {isListening && (
              <div className={`mx-3 mt-2 rounded-xl px-3 py-2 flex items-center gap-2 text-[11px] font-medium transition-all ${
                voiceStatus === 'wake' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                voiceStatus === 'listening' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                voiceStatus === 'processing' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                'bg-slate-50 border border-slate-200 text-slate-500'
              }`} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  voiceStatus === 'wake' ? 'bg-amber-400 animate-ping' :
                  voiceStatus === 'listening' ? 'bg-emerald-500 animate-pulse' :
                  voiceStatus === 'processing' ? 'bg-blue-500 animate-spin' :
                  'bg-slate-300 animate-pulse'
                }`}></span>
                {voiceStatus === 'idle' && '👂 Listening for "Uncle X"…'}
                {voiceStatus === 'wake' && '⚡ Wake word detected!'}
                {voiceStatus === 'listening' && '🎙️ Speak your question…'}
                {voiceStatus === 'processing' && '🤔 Processing your doubt…'}
              </div>
            )}

            {/* Input area */}
            <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-white mt-2">
              <div className="flex flex-col gap-2">
                <textarea
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none shadow-inner"
                  placeholder={isListening ? `Say "Uncle X" to ask…` : "Type your question… (Enter to send)"}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  disabled={chatLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    disabled={chatLoading || !question.trim()}
                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {chatLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {chatLoading ? 'Thinking…' : 'Send'}
                  </button>
                  <button
                    onClick={toggleVoiceMode}
                    title={isListening ? 'Stop voice mode' : 'Start voice mode — say "Uncle X"'}
                    className={`w-11 py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-sm relative ${
                      isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-slate-900 text-white hover:bg-black'
                    }`}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    {isListening && voiceStatus === 'listening' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></span>
                    )}
                  </button>
                </div>
                {!isListening && (
                  <p className="text-[10px] text-slate-400 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    🎙️ Tap mic → say <strong>"Uncle X"</strong> → speak doubt
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Lecture;