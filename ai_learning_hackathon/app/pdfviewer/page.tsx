"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PenTool, Eraser, ZoomIn, ZoomOut, MessageSquare, X, Send, Sparkles, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { createClient } from '@/utils/supabase/client';

export default function PDFViewerPage() {
  const supabase = createClient();
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationLayerRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [annotations, setAnnotations] = useState<Record<number, {x: number, y: number}[][]>>({}); 

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API Key
  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey) setApiKey(storedKey);
  }, []);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

  // Scroll Chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [messages, isChatOpen]);

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const storedPdf = localStorage.getItem('uploadedFileBase64');
        if (!storedPdf) {
          setError("No PDF file found. Please upload one first.");
          setLoading(false);
          return;
        }

        if (!storedPdf.startsWith('data:application/pdf')) {
             setError("Invalid file format. Only PDF is supported.");
             setLoading(false);
             return;
        }

        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined' && 'Worker' in window) {
             pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }

        const pdfData = storedPdf.split(',')[1];
        const binaryString = window.atob(pdfData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. " + err.message);
        setLoading(false);
      }
    };
    loadPdf();
  }, []);

  // Track Progress
  useEffect(() => {
    const trackProgress = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const contentString = localStorage.getItem('uploadedContent');
            if (!contentString) return;
            
            const content = JSON.parse(contentString);
            const fileName = content.fileName || 'Untitled PDF';

            // Upsert progress
            await supabase.from('user_pdf_progress').upsert({
                user_id: user.id,
                pdf_name: fileName,
                last_read_page: currentPage,
                pages_read: currentPage, 
                total_pages: numPages > 0 ? numPages : undefined,
                last_read_at: new Date().toISOString()
            }, { onConflict: 'user_id, pdf_name' });

        } catch (err) {
            console.error("Error tracking progress:", err);
        }
    };
    
    // Debounce tracking to avoid too many requests
    const timeout = setTimeout(trackProgress, 2000);
    return () => clearTimeout(timeout);
  }, [currentPage, numPages]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext as any).promise;

        if (annotationLayerRef.current) {
            annotationLayerRef.current.height = viewport.height;
            annotationLayerRef.current.width = viewport.width;
            redrawAnnotations();
        }
      } catch (err) {
        console.error("Render error:", err);
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, annotations]);

  // Redraw Annotations
  const redrawAnnotations = () => {
      const canvas = annotationLayerRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#ef4444"; // red-500
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pageAnnotations = annotations[currentPage] || [];
      pageAnnotations.forEach(path => {
          if (path.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let i = 1; i < path.length; i++) {
              ctx.lineTo(path[i].x, path[i].y);
          }
          ctx.stroke();
      });
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent) => {
      if (!isDrawingMode) return;
      const canvas = annotationLayerRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setIsDrawing(true);
      setCurrentPath([{x, y}]);

      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
      }
  };

  const draw = (e: React.MouseEvent) => {
      if (!isDrawing || !isDrawingMode) return;
      const canvas = annotationLayerRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setCurrentPath(prev => [...prev, {x, y}]);

      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.lineTo(x, y);
          ctx.stroke();
      }
  };

  const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      setAnnotations(prev => ({
          ...prev,
          [currentPage]: [...(prev[currentPage] || []), currentPath]
      }));
  };

  const captureScreen = () => {
    if (!canvasRef.current || !annotationLayerRef.current) return null;
    const combinedCanvas = document.createElement('canvas');
    combinedCanvas.width = canvasRef.current.width;
    combinedCanvas.height = canvasRef.current.height;
    const ctx = combinedCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvasRef.current, 0, 0);
    ctx.drawImage(annotationLayerRef.current, 0, 0);
    return combinedCanvas.toDataURL('image/png').split(',')[1];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', content: "Please enter your Gemini API Key below to start chatting." }]);
        return;
    }
    const currentImage = captureScreen();
    if (!currentImage) {
        setError("Failed to capture context.");
        return;
    }
    const userMsg = inputMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInputMessage("");
    setIsSending(true);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: userMsg,
                image: currentImage,
                history: messages.slice(-10),
                apiKey: apiKey
            })
        });
        const data = await response.json();
        if (response.ok) {
            setMessages(prev => [...prev, { role: 'model', content: data.text }]);
        } else {
            setMessages(prev => [...prev, { role: 'model', content: `Error: ${data.error}` }]);
        }
    } catch (err: any) {
        setMessages(prev => [...prev, { role: 'model', content: "Connection failed. Please try again." }]);
    } finally {
        setIsSending(false);
    }
  };

  if (loading) return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-white gap-4">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="opacity-70 font-medium">Loading your document...</p>
      </div>
  );
  
  if (error) return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-white gap-4">
          <div className="bg-red-500/10 p-4 rounded-xl text-red-500 border border-red-500/20">
              {error}
          </div>
          <button onClick={() => window.history.back()} className="text-sm underline opacity-70 hover:opacity-100">Go Back</button>
      </div>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Main Viewer Area */}
      <div className="flex-1 flex flex-col relative h-full">
         
         {/* Floating Header */}
         <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-4 flex justify-between items-start">
             <button 
                onClick={() => window.history.back()} 
                className="pointer-events-auto bg-black/50 backdrop-blur-md border border-white/10 text-white p-2.5 rounded-full hover:bg-white/10 transition-all shadow-lg group"
                title="Back to Home"
             >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
             </button>

             {/* Tools Island */}
             <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 shadow-2xl">
                 <div className="flex items-center gap-0.5 px-2 mr-2 border-r border-white/10">
                     <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors">
                        <ZoomOut className="w-4 h-4" />
                     </button>
                     <span className="text-xs font-medium w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                     <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors">
                        <ZoomIn className="w-4 h-4" />
                     </button>
                 </div>

                 <button 
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className={clsx(
                      "p-2 rounded-xl transition-all flex items-center gap-2 text-sm font-medium px-3",
                      isDrawingMode ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "hover:bg-white/10 text-zinc-300 hover:text-white"
                  )}
                 >
                    <PenTool className="w-4 h-4" />
                    <span className="hidden sm:inline">Annotate</span>
                 </button>

                 <button 
                    onClick={() => setAnnotations({})}
                    className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Clear Page Annotations"
                 >
                    <Eraser className="w-4 h-4" />
                 </button>

                 {!isChatOpen && (
                     <button 
                        onClick={() => setIsChatOpen(true)}
                        className="ml-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-2 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 text-sm font-bold"
                     >
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Ask AI</span>
                     </button>
                 )}
             </div>
             
             {/* Spacer for symmetry */}
             <div className="w-10"></div> 
         </div>

         {/* Scrollable PDF Area */}
         <div className="flex-1 overflow-auto flex justify-center p-8 xs:p-4 pt-24 pb-24 relative select-none">
             <div className="relative shadow-2xl shadow-black/50 rounded-sm overflow-hidden border border-white/5" ref={containerRef}>
                 <canvas ref={canvasRef} className="block bg-white" />
                 <canvas 
                    ref={annotationLayerRef}
                    className={clsx("absolute top-0 left-0", isDrawingMode ? "cursor-crosshair pointer-events-auto" : "pointer-events-none")}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                 />
             </div>
         </div>

         {/* Floating Pagination */}
         <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-4 z-20">
             <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="hover:text-violet-400 disabled:opacity-30 transition-colors">
                 <ChevronLeft className="w-5 h-5" />
             </button>
             <span className="text-sm font-medium tabular-nums shadow-black drop-shadow-sm">
                 Page {currentPage} <span className="text-white/40">/</span> {numPages}
             </span>
             <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="hover:text-violet-400 disabled:opacity-30 transition-colors">
                 <ChevronRight className="w-5 h-5" />
             </button>
         </div>
      </div>

      {/* Modern Chat Sidebar */}
      <div className={clsx(
          "fixed inset-y-0 right-0 w-full sm:w-[400px] bg-zinc-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 flex flex-col",
          isChatOpen ? "translate-x-0" : "translate-x-full"
      )}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex items-center justify-between shrink-0">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                     <Sparkles className="w-4 h-4 text-white" />
                 </div>
                 <div>
                     <h3 className="font-bold text-white text-sm">Context Tutor</h3>
                     <p className="text-[10px] text-zinc-400 font-medium">Powered by Gemini 1.5</p>
                 </div>
             </div>
             <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors">
                 <X className="w-5 h-5" />
             </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
             {messages.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                     <MessageSquare className="w-12 h-12 mb-4 text-zinc-600" />
                     <p className="text-sm font-medium text-zinc-300">No messages yet</p>
                     <p className="text-xs text-zinc-500 mt-2 max-w-[200px]">Draw on the PDF and ask specific questions to get started.</p>
                 </div>
             )}
             
             {messages.map((msg, idx) => (
                 <div key={idx} className={clsx("flex flex-col max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                     {msg.role === 'model' && <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 ml-1">AI Tutor</span>}
                     <div className={clsx(
                         "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                         msg.role === 'user' 
                             ? "bg-violet-600 text-white rounded-br-sm" 
                             : "bg-zinc-800 text-zinc-200 border border-white/5 rounded-bl-sm"
                     )}>
                         {msg.content}
                     </div>
                 </div>
             ))}

             {isSending && (
                 <div className="self-start items-start">
                     <span className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 ml-1">Thinking</span>
                      <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center border border-white/5">
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                      </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-zinc-900/90 backdrop-blur shrink-0">
             {!apiKey && (
                 <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                      <label className="block text-[10px] uppercase font-bold text-yellow-500 mb-1.5">API Key Required</label>
                      <input 
                         type="password" 
                         placeholder="Paste Gemini API Key here" 
                         className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50"
                         onChange={(e) => saveApiKey(e.target.value)}
                         value={apiKey}
                      />
                 </div>
             )}
             
             <div className="relative">
                 <input 
                    type="text" 
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about the highlights..."
                    className="w-full bg-zinc-800 border-transparent focus:border-violet-500/50 focus:bg-zinc-800/80 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all shadow-inner"
                    disabled={isSending}
                 />
                 <button 
                    onClick={handleSendMessage}
                    disabled={isSending || !inputMessage.trim()}
                    className="absolute right-1.5 top-1.5 p-1.5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
                 >
                     <Send className="w-4 h-4" />
                 </button>
             </div>
             <p className="text-[10px] text-zinc-600 text-center mt-3">Context includes current page drawing & text.</p>
          </div>
      </div>
      
      {/* Overlay Backdrop for Mobile */}
      {isChatOpen && (
          <div onClick={() => setIsChatOpen(false)} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 sm:hidden" />
      )}

    </div>
  );
}