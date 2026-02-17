"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PenTool, Eraser, ZoomIn, ZoomOut, MessageSquare, X, Send, Sparkles, ArrowLeft, BookOpenText, Save, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useRouter } from "next/navigation";

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

    const router = useRouter();

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<{ x: number, y: number }[]>([]);
    const [annotations, setAnnotations] = useState<Record<number, { x: number, y: number }[][]>>({});

    // Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
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
        ctx.strokeStyle = "#ff0000"; // Red for brutalist contrast
        ctx.lineWidth = 4;
        ctx.lineCap = "square"; // Brutalist square caps
        ctx.lineJoin = "miter";

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
        setCurrentPath([{ x, y }]);

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = "#ff0000";
            ctx.lineWidth = 4;
            ctx.lineCap = "square";
            ctx.lineJoin = "miter";
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !isDrawingMode) return;
        const canvas = annotationLayerRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setCurrentPath(prev => [...prev, { x, y }]);

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
        <div className="flex flex-col h-screen items-center justify-center bg-[#fffdf5] text-black gap-4 font-mono">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold uppercase tracking-widest">Loading Document...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#fffdf5] text-black gap-6 font-mono">
            <div className="bg-red-500 text-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black uppercase mb-2">System Error</h3>
                {error}
            </div>
            <button onClick={() => window.history.back()} className="font-bold underline decoration-4 hover:decoration-red-500">RETURN</button>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#fffdf5] text-black overflow-hidden font-mono">

            {/* Main Viewer Area */}
            <div className="flex-1 flex flex-col relative h-full">

                {/* Brutalist Toolbar */}
                <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-6 flex justify-between items-start">
                    <button
                        onClick={() => window.history.back()}
                        className="pointer-events-auto bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    {/* Tools Island */}
                    <div className="pointer-events-auto bg-white border-4 border-black p-2 flex items-center gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-1 px-2 border-r-4 border-black">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-gray-200 transition-colors">
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-2 hover:bg-gray-200 transition-colors">
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsDrawingMode(!isDrawingMode)}
                            className={clsx(
                                "p-2 transition-all flex items-center gap-2 text-sm font-bold border-2 border-transparent hover:border-black uppercase",
                                isDrawingMode ? "bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black" : "hover:bg-gray-100"
                            )}
                        >
                            <PenTool className="w-5 h-5" />
                            <span className="hidden sm:inline">Annotate</span>
                        </button>

                        <button
                            onClick={() => setAnnotations({})}
                            className="p-2 hover:bg-gray-100 hover:text-red-500 transition-colors border-2 border-transparent hover:border-black"
                            title="Clear Page Annotations"
                        >
                            <Eraser className="w-5 h-5" />
                        </button>

                        {!isChatOpen && (
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="ml-2 bg-yellow-400 border-2 border-black p-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 text-sm font-black uppercase text-black"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">Ask AI</span>
                            </button>
                        )}
                        <button
                            onClick={() => { router.push('/lecture') }}
                            className="ml-2 bg-black text-white p-2 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#888] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#888] transition-all flex items-center gap-2 text-sm font-black uppercase"
                        >
                            <BookOpenText className="w-4 h-4" />
                            <span className="hidden sm:inline">Lecture</span>
                        </button>
                    </div>

                    {/* Spacer for symmetry */}
                    <div className="w-12"></div>
                </div>

                {/* Scrollable PDF Area */}
                <div className="flex-1 overflow-auto flex justify-center p-8 xs:p-4 pt-28 pb-24 relative select-none bg-gray-100">
                    <div className="relative shadow-[16px_16px_0px_0px_rgba(0,0,0,0.2)] border-4 border-black" ref={containerRef}>
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
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border-4 border-black px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6 z-20">
                    <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="hover:text-red-500 disabled:opacity-30 disabled:hover:text-black transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-base font-black tabular-nums">
                        PAGE {currentPage} <span className="text-gray-400">/</span> {numPages}
                    </span>
                    <button disabled={currentPage >= numPages} onClick={() => setCurrentPage(p => p + 1)} className="hover:text-red-500 disabled:opacity-30 disabled:hover:text-black transition-colors">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Brutalist Chat Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white border-l-4 border-black z-30 flex flex-col transition-transform duration-300 ease-in-out",
                isChatOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="p-6 border-b-4 border-black bg-yellow-400 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-4 border-black bg-white flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <Terminal className="w-6 h-6 text-black" />
                        </div>
                        <div>
                            <h3 className="font-black text-xl uppercase">Neural Tutor</h3>
                            <p className="text-xs font-bold uppercase tracking-widest">Gemini 1.5 Protocol</p>
                        </div>
                    </div>
                    <button onClick={() => setIsChatOpen(false)} className="p-2 border-2 border-black bg-white hover:bg-red-500 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fffdf5]">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                            <MessageSquare className="w-16 h-16 mb-4 text-black" />
                            <p className="text-lg font-black uppercase">No Data Transmitted</p>
                            <p className="text-sm font-bold uppercase mt-2 max-w-[200px] text-gray-500">Highlight area & query the system.</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={clsx("flex flex-col max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                            {msg.role === 'model' && <span className="text-[10px] font-black uppercase tracking-widest mb-1 ml-1 bg-black text-white px-1">SYSTEM</span>}
                            <div className={clsx(
                                "p-4 text-sm font-bold leading-relaxed border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
                                msg.role === 'user'
                                    ? "bg-blue-400 text-black"
                                    : "bg-white text-black"
                            )}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isSending && (
                        <div className="self-start items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 ml-1 bg-black text-white px-1">PROCESSING</span>
                            <div className="bg-white border-4 border-black p-4 flex gap-2 items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-2 h-2 bg-black animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-black animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-black animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t-4 border-black bg-white shrink-0">
                    {!apiKey && (
                        <div className="mb-4 bg-red-100 border-4 border-red-500 p-4">
                            <label className="block text-xs font-black uppercase text-red-600 mb-2">API Key Missing</label>
                            <input
                                type="password"
                                placeholder="Paste Gemini Key"
                                className="w-full bg-white border-2 border-black p-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
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
                            placeholder="Enter Query..."
                            className="w-full bg-white border-4 border-black p-4 pr-16 text-sm font-bold placeholder-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                            disabled={isSending}
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isSending || !inputMessage.trim()}
                            className="absolute right-2 top-2 p-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors border-2 border-black"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay Backdrop for Mobile */}
            {isChatOpen && (
                <div onClick={() => setIsChatOpen(false)} className="fixed inset-0 bg-black/20 z-20 sm:hidden" />
            )}

        </div>
    );
}