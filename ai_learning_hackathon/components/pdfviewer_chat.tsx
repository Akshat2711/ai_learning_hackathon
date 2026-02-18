"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Terminal } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    captureScreen: () => string | null;
}

// ─── Predefined Quick-Query Chips ─────────────────────────────────────────────

const QUICK_QUERIES = [
    { label: "📄 Explain this page", prompt: "Explain what is on this page in simple terms." },
    { label: "📝 Summarise", prompt: "Give me a concise summary of this page." },
    { label: "🔑 Key concepts", prompt: "What are the key concepts or terms on this page?" },
    { label: "📝Explain circled text", prompt: "explain the section marked with red circles" },
    { label: "🔗 Real-world use", prompt: "Give me a real-world example of the topic on this page." },
    { label: "🤔 Simplify", prompt: "Explain this page as if I'm a complete beginner." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatSidebar({ isOpen, onClose, captureScreen }: ChatSidebarProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load stored API key on mount
    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        if (storedKey) setApiKey(storedKey);
    }, []);

    const saveApiKey = (key: string) => {
        setApiKey(key);
        localStorage.setItem("gemini_api_key", key);
    };

    // Auto-scroll to latest message
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen]);

    // ── Send a message (shared by text input and quick-query chips) ──────────

    const sendMessage = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        if (!apiKey) {
            setMessages(prev => [
                ...prev,
                { role: 'model', content: "Please enter your Gemini API Key below to start chatting." },
            ]);
            return;
        }

        const currentImage = captureScreen();
        if (!currentImage) {
            setMessages(prev => [
                ...prev,
                { role: 'model', content: "Failed to capture page context. Please try again." },
            ]);
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
        setInputMessage("");
        setIsSending(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: trimmed,
                    image: currentImage,
                    history: messages.slice(-10),
                    apiKey,
                }),
            });
            const data = await response.json();
            setMessages(prev => [
                ...prev,
                {
                    role: 'model',
                    content: response.ok ? data.text : `Error: ${data.error}`,
                },
            ]);
        } catch {
            setMessages(prev => [
                ...prev,
                { role: 'model', content: "Connection failed. Please try again." },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const handleSend = () => sendMessage(inputMessage);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Sidebar panel */}
            <div
                className={clsx(
                    "fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white border-l-4 border-black z-30 flex flex-col transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* ── Header ── */}
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
                    <button
                        onClick={onClose}
                        className="p-2 border-2 border-black bg-white hover:bg-red-500 hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* ── Messages ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fffdf5] flex flex-col">
                    {messages.length === 0 ? (
                        /* Empty state + quick-query chips */
                        <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                            <div className="opacity-40">
                                <MessageSquare className="w-16 h-16 mb-3 mx-auto text-black" />
                                <p className="text-lg font-black uppercase">No Data Transmitted</p>
                                <p className="text-sm font-bold uppercase mt-1 text-gray-500">
                                    Try a quick query below or type your own.
                                </p>
                            </div>

                            {/* Quick-query chips grid */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                {QUICK_QUERIES.map(({ label, prompt }) => (
                                    <button
                                        key={label}
                                        onClick={() => sendMessage(prompt)}
                                        disabled={isSending}
                                        className="text-left p-3 border-4 border-black bg-white text-xs font-black uppercase leading-tight shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "flex flex-col max-w-[85%]",
                                        msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                                    )}
                                >
                                    {msg.role === 'model' && (
                                        <span className="text-[10px] font-black uppercase tracking-widest mb-1 ml-1 bg-black text-white px-1">
                                            SYSTEM
                                        </span>
                                    )}
                                    <div
                                        className={clsx(
                                            "p-4 text-sm font-bold leading-relaxed border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] whitespace-pre-wrap",
                                            msg.role === 'user' ? "bg-blue-400 text-black" : "bg-white text-black"
                                        )}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {/* Quick-query chips below messages (compact row) */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {QUICK_QUERIES.map(({ label, prompt }) => (
                                    <button
                                        key={label}
                                        onClick={() => sendMessage(prompt)}
                                        disabled={isSending}
                                        className="text-[11px] font-black uppercase border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-40"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Typing indicator */}
                    {isSending && (
                        <div className="self-start items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 ml-1 bg-black text-white px-1">
                                PROCESSING
                            </span>
                            <div className="bg-white border-4 border-black p-4 flex gap-2 items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                                <div className="w-2 h-2 bg-black animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-2 h-2 bg-black animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-2 h-2 bg-black animate-bounce" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* ── Input Area ── */}
                <div className="p-6 border-t-4 border-black bg-white shrink-0">
                    {/* API key prompt if missing */}
                    {!apiKey && (
                        <div className="mb-4 bg-red-100 border-4 border-red-500 p-4">
                            <label className="block text-xs font-black uppercase text-red-600 mb-2">
                                API Key Missing
                            </label>
                            <input
                                type="password"
                                placeholder="Paste Gemini Key"
                                className="w-full bg-white border-2 border-black p-2 text-sm font-mono placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black"
                                onChange={e => saveApiKey(e.target.value)}
                                value={apiKey}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={e => setInputMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Enter Query..."
                            className="w-full bg-white border-4 border-black p-4 pr-16 text-sm font-bold placeholder-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
                            disabled={isSending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isSending || !inputMessage.trim()}
                            className="absolute right-2 top-2 p-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors border-2 border-black"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/20 z-20 sm:hidden"
                />
            )}
        </>
    );
}