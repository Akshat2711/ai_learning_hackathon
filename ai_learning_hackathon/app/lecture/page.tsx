"use client";

import React, { useState, useEffect } from 'react';
import { Mic, Send, MessageSquare } from 'lucide-react';

const Lecture = ({ backendData }) => {
  // Demo data reflecting the Physics of Rainbows lesson
  const demoData = {
    resp: "The Physics of Rainbows 🌈\n\n1. Refraction: Light enters a water droplet and bends.\n2. Reflection: Light hits the back of the drop.\n3. Dispersion: White light splits into its component colors (VIBGYOR).\n\nKey Angle: 42° is the magic number for the primary bow!",
    images: [
      "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80", // Prism Dispersion
      "https://th.bing.com/th/id/OIP.kFL38gpaNoN9r9-qQt5RNAHaFb?w=272&h=198&c=7&r=0&o=7&dpr=2.5&pid=1.7&rm=3"  // Droplet Physics
    ]
  };

  const [question, setQuestion] = useState("");
  const [content, setContent] = useState({ resp: "", images: [] });
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hello! I'm your AI instructor. Do you have any questions about how rainbows form?" }
  ]);

  useEffect(() => {
    // Priority: backendData > demoData
    setContent(backendData || demoData);
  }, [backendData]);

  const handleSend = () => {
    if (!question.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setQuestion("");
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', text: "That's a great question! It all comes down to the refractive index of water." }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 font-sans text-slate-800 flex flex-col items-center overflow-hidden">
      
      {/* Global Styles for Chalkboard Font and Scrollbars */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Gochi+Hand&display=swap');
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-black text-slate-700 tracking-tight">
          AI Academy <span className="text-emerald-600">Interactive Terminal</span>
        </h1>
      </div>

      <div className="w-full max-w-[1800px] grid grid-cols-12 gap-4 items-end">
        
        {/* 1. RESTORED TEACHER SECTION (Left) */}
        <div className="col-span-2 flex flex-col items-center justify-end pb-8">
          <div className="relative group">
            <img 
              src="https://i.pinimg.com/originals/17/b4/d7/17b4d75844d047a1ae585bda3c27b6ec.gif" 
              alt="Instructor" 
              className="w-full h-auto max-h-[400px] object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // Fallback if local asset is missing
                e.target.src = "https://cdn-icons-png.flaticon.com/512/3429/3429400.png";
              }}
            />
            <div className="mt-2 bg-white/95 backdrop-blur-sm shadow-xl border border-slate-200 px-4 py-2 rounded-2xl text-center transform -rotate-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Live Instructor
              </span>
            </div>
          </div>
        </div>

        {/* 2. BLACKBOARD (Center) */}
        <div className="col-span-8">
          <div className="relative h-[700px] w-full bg-[#1e3932] rounded-[2.5rem] border-[14px] border-[#3e2723] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden ring-4 ring-black/10">
            
            {/* Texture Overlays */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/chalkboard.png')] pointer-events-none"></div>
            
            <div className="relative h-full p-12 flex flex-col">
              {/* Chalk Text */}
              <div 
                className="text-white/90 text-4xl leading-relaxed max-w-[65%] whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-4 duration-1000"
                style={{ fontFamily: '"Gochi Hand", cursive', filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.3))' }}
              >
                {content.resp}
              </div>

              {/* Diagrams Pinned to Board */}
              <div className="absolute top-10 right-10 flex flex-col gap-8">
                {content.images?.map((imgUrl, index) => (
                  <div 
                    key={index}
                    className="group relative bg-white p-2 pb-6 shadow-2xl transform transition-all hover:scale-110 hover:rotate-0"
                    style={{ 
                        rotate: index % 2 === 0 ? '3deg' : '-4deg',
                        maxWidth: '240px' 
                    }}
                  >
                    <img src={imgUrl} alt={`Fig ${index + 1}`} className="w-full h-auto border border-slate-100" />
                    <p className="mt-2 text-[10px] font-mono text-slate-400 text-center">REFERENCE_0{index + 1}.PNG</p>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-red-500/80 rounded-full blur-[1px] border-2 border-white/20 shadow-inner"></div>
                  </div>
                ))}
              </div>

              {/* Chalk Detail */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 opacity-50">
                <div className="w-10 h-3 bg-white rounded-sm rotate-12"></div>
                <div className="w-8 h-3 bg-blue-100 rounded-sm -rotate-6"></div>
              </div>
            </div>
          </div>
          <div className="h-4 w-[104%] -ml-[2%] bg-[#2d1b18] rounded-full mt-1 blur-[1px]"></div>
        </div>

        {/* 3. DOUBT BOX (Right) */}
        <div className="col-span-2 h-[700px] mb-4 flex flex-col">
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
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <textarea 
                rows="3"
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