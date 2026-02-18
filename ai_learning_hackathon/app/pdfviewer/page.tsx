"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChevronLeft, ChevronRight,
    PenTool, Eraser,
    ZoomIn, ZoomOut,
    Sparkles, ArrowLeft,
    BookOpenText,
    Music,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useRouter } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';
import ChatSidebar from '@/components/pdf_chat_panel';

// ─── Types ────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };
type AnnotationMap = Record<number, Point[][]>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PDFViewerPage() {
    const supabase = createClient();
    const router = useRouter();

    // ── PDF state ──────────────────────────────────────────────────────────────
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Canvas refs ────────────────────────────────────────────────────────────
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const annotationLayerRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // ── Annotation / drawing state ─────────────────────────────────────────────
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [annotations, setAnnotations] = useState<AnnotationMap>({});

    // ── Chat state ─────────────────────────────────────────────────────────────
    const [isChatOpen, setIsChatOpen] = useState(false);

    // ── Annotation draw helper ─────────────────────────────────────────────────
    // Defined with useCallback so it is stable and safe to call from useEffect

    const redrawAnnotations = useCallback((pageAnnotations: Point[][]) => {
        const canvas = annotationLayerRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';

        pageAnnotations.forEach(path => {
            if (path.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
            ctx.stroke();
        });
    }, []);

    // ── Load PDF ───────────────────────────────────────────────────────────────

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const storedPdf = localStorage.getItem('uploadedFileBase64');
                if (!storedPdf) {
                    setError('No PDF file found. Please upload one first.');
                    setLoading(false);
                    return;
                }
                if (!storedPdf.startsWith('data:application/pdf')) {
                    setError('Invalid file format. Only PDF is supported.');
                    setLoading(false);
                    return;
                }

                const pdfjsLib = await import('pdfjs-dist');
                if (typeof window !== 'undefined' && 'Worker' in window) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc =
                        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                }

                const pdfData = storedPdf.split(',')[1];
                const binary = window.atob(pdfData);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

                const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
                setPdfDoc(doc);
                setNumPages(doc.numPages);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error('Error loading PDF:', err);
                setError('Failed to load PDF. ' + msg);
            } finally {
                setLoading(false);
            }
        };

        loadPdf();
    }, []);

    // ── Track reading progress (debounced) ────────────────────────────────────

    useEffect(() => {
        const trackProgress = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const contentString = localStorage.getItem('uploadedContent');
                if (!contentString) return;

                const content = JSON.parse(contentString) as { fileName?: string };
                const fileName = content.fileName ?? 'Untitled PDF';

                await supabase.from('user_pdf_progress').upsert({
                    user_id: user.id,
                    pdf_name: fileName,
                    last_read_page: currentPage,
                    pages_read: currentPage,
                    total_pages: numPages > 0 ? numPages : undefined,
                    last_read_at: new Date().toISOString(),
                }, { onConflict: 'user_id, pdf_name' });
            } catch (err) {
                console.error('Error tracking progress:', err);
            }
        };

        const timeout = setTimeout(trackProgress, 2000);
        return () => clearTimeout(timeout);
    }, [currentPage, numPages, supabase]);

    // ── Render PDF page ────────────────────────────────────────────────────────

    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        let cancelled = false;
        // Typed loosely to avoid fighting pdfjs-dist's internal RenderTask types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let renderTask: any = null;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                if (cancelled) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current!;
                const context = canvas.getContext('2d');
                if (!context || cancelled) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // pdfjs-dist versions that mark `canvas` as required in RenderParameters
                // are satisfied by passing the canvas element. We cast via `as any` to
                // avoid fighting the type definition across different installed versions.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                renderTask = page.render({ canvasContext: context, viewport, canvas: canvasRef.current } as any);
                await renderTask.promise;
                if (cancelled) return;
                renderTask = null;

                if (annotationLayerRef.current) {
                    annotationLayerRef.current.height = viewport.height;
                    annotationLayerRef.current.width = viewport.width;
                    redrawAnnotations(annotations[currentPage] ?? []);
                }
            } catch (err: unknown) {
                if ((err as { name?: string })?.name === 'RenderingCancelledException') return;
                console.error('Render error:', err);
            }
        };

        renderPage();

        return () => {
            cancelled = true;
            if (renderTask) {
                try { renderTask.cancel(); } catch { /* already completed */ }
            }
        };
    }, [pdfDoc, currentPage, scale, annotations, redrawAnnotations]);

    // ── Redraw annotations when they change ────────────────────────────────────

    useEffect(() => {
        redrawAnnotations(annotations[currentPage] ?? []);
    }, [annotations, currentPage, redrawAnnotations]);

    // ── Drawing event handlers ─────────────────────────────────────────────────

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingMode || !annotationLayerRef.current) return;
        const rect = annotationLayerRef.current.getBoundingClientRect();
        const point: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        setIsDrawing(true);
        setCurrentPath([point]);

        const ctx = annotationLayerRef.current.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.lineCap = 'square';
            ctx.lineJoin = 'miter';
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isDrawingMode || !annotationLayerRef.current) return;
        const rect = annotationLayerRef.current.getBoundingClientRect();
        const point: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

        setCurrentPath(prev => [...prev, point]);

        const ctx = annotationLayerRef.current.getContext('2d');
        if (ctx) { ctx.lineTo(point.x, point.y); ctx.stroke(); }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath.length > 1) {
            setAnnotations(prev => ({
                ...prev,
                [currentPage]: [...(prev[currentPage] ?? []), currentPath],
            }));
        }
        setCurrentPath([]);
    };

    // ── Screen capture for the AI chat ────────────────────────────────────────

    const captureScreen = useCallback((): string | null => {
        if (!canvasRef.current || !annotationLayerRef.current) return null;
        const combined = document.createElement('canvas');
        combined.width = canvasRef.current.width;
        combined.height = canvasRef.current.height;
        const ctx = combined.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(canvasRef.current, 0, 0);
        ctx.drawImage(annotationLayerRef.current, 0, 0);
        return combined.toDataURL('image/png').split(',')[1];
    }, []);

    // ── Loading / error screens ────────────────────────────────────────────────

    if (loading) return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#fffdf5] text-black gap-4 font-mono">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
            <p className="font-bold uppercase tracking-widest">Loading Document...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#fffdf5] text-black gap-6 font-mono">
            <div className="bg-red-500 text-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-xl font-black uppercase mb-2">System Error</h3>
                <p>{error}</p>
            </div>
            <button
                onClick={() => window.history.back()}
                className="font-bold underline decoration-4 hover:decoration-red-500"
            >
                RETURN
            </button>
        </div>
    );

    // ── Main render ────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen bg-[#fffdf5] text-black overflow-hidden font-mono">

            {/* ── PDF Viewer ── */}
            <div className="flex-1 flex flex-col relative h-full">

                {/* Floating toolbar */}
                <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-6 flex justify-between items-start">

                    {/* Back */}
                    <button
                        onClick={() => router.push('/home')}
                        className="pointer-events-auto bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    {/* Tools island */}
                    <div className="pointer-events-auto bg-white border-4 border-black p-2 flex items-center gap-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">

                        {/* Zoom */}
                        <div className="flex items-center gap-1 px-2 border-r-4 border-black">
                            <button
                                onClick={() => setScale(s => Math.max(0.5, +(s - 0.1).toFixed(1)))}
                                className="p-2 hover:bg-gray-200 transition-colors"
                            >
                                <ZoomOut className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold w-12 text-center tabular-nums">
                                {Math.round(scale * 100)}%
                            </span>
                            <button
                                onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(1)))}
                                className="p-2 hover:bg-gray-200 transition-colors"
                            >
                                <ZoomIn className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Annotate */}
                        <button
                            onClick={() => setIsDrawingMode(m => !m)}
                            className={clsx(
                                'p-2 transition-all flex items-center gap-2 text-sm font-bold border-2 border-transparent hover:border-black uppercase',
                                isDrawingMode
                                    ? 'bg-red-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'
                                    : 'hover:bg-gray-100'
                            )}
                        >
                            <PenTool className="w-5 h-5" />
                            <span className="hidden sm:inline">Annotate</span>
                        </button>

                        {/* Clear annotations */}
                        <button
                            onClick={() => setAnnotations({})}
                            className="p-2 hover:bg-gray-100 hover:text-red-500 transition-colors border-2 border-transparent hover:border-black"
                            title="Clear All Annotations"
                        >
                            <Eraser className="w-5 h-5" />
                        </button>

                        {/* Ask AI */}
                        {!isChatOpen && (
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="ml-2 bg-yellow-400 border-2 border-black p-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 text-sm font-black uppercase text-black"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span className="hidden sm:inline">Ask AI</span>
                            </button>
                        )}

                        {/* Lecture mode */}
                        <button
                            onClick={() => router.push('/lecture')}
                            className="ml-2 bg-black text-white p-2 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#888] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#888] transition-all flex items-center gap-2 text-sm font-black uppercase"
                        >
                            <BookOpenText className="w-4 h-4" />
                            <span className="hidden sm:inline">Lecture</span>
                        </button>



                        {/* podcast mode */}
                        <button
                            onClick={() => router.push('/podcast')}
                            className="ml-2 bg-purple-300 text-white p-2 px-4 border-2 border-black shadow-[4px_4px_0px_0px_#888] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#888] transition-all flex items-center gap-2 text-sm font-black uppercase"
                        >
                            <Music className="w-4 h-4" />
                            <span className="hidden sm:inline">podcast</span>
                        </button>
                        
                    </div>

                    <div className="w-12" />
                </div>

                {/* Canvas area */}
                <div className="flex-1 overflow-auto flex justify-center p-8 xs:p-4 pt-28 pb-24 relative select-none bg-gray-100">
                    <div
                        ref={containerRef}
                        className="relative shadow-[16px_16px_0px_0px_rgba(0,0,0,0.2)] border-4 border-black"
                    >
                        <canvas ref={canvasRef} className="block bg-white" />
                        <canvas
                            ref={annotationLayerRef}
                            className={clsx(
                                'absolute top-0 left-0',
                                isDrawingMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'
                            )}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                        />
                    </div>
                </div>

                {/* Pagination */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border-4 border-black px-6 py-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-6 z-20">
                    <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                        className="hover:text-red-500 disabled:opacity-30 disabled:hover:text-black transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-base font-black tabular-nums">
                        PAGE {currentPage} <span className="text-gray-400">/</span> {numPages}
                    </span>
                    <button
                        disabled={currentPage >= numPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="hover:text-red-500 disabled:opacity-30 disabled:hover:text-black transition-colors"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* ── Chat Sidebar ── */}
            <ChatSidebar
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                captureScreen={captureScreen}
            />
        </div>
    );
}