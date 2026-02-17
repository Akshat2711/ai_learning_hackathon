"use client";

import React, { useState } from 'react';
import { Upload, FileText, BookOpen, CheckCircle, Loader2, File as FileIcon } from 'lucide-react';
import { parsePDF, parsePPTX } from '@/lib/parsers';

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'standard'>('upload');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage("Processing file...");

    try {
      let content = [];
      if (file.type === "application/pdf") {
        content = await parsePDF(file);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || 
        file.name.endsWith(".pptx")
      ) {
        content = await parsePPTX(file);
      } else {
        throw new Error("Unsupported file type. Please upload PDF or PPTX.");
      }

      // Read file as Base64 for viewing
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        try {
            localStorage.setItem('uploadedFileBase64', base64);
        } catch (e) {
            console.error("File too large for localStorage", e);
            setStatusMessage("Warning: File too large to save for viewing, but content extracted.");
        }
      };
      reader.readAsDataURL(file);

      // Store in localStorage
      localStorage.setItem('uploadedContent', JSON.stringify({
        fileName: file.name,
        extractedAt: new Date().toISOString(),
        pages: content
      }));

      setStatusMessage("Content extracted");
    } catch (error: any) {
      console.error("Extraction failed:", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePredefinedCardClick = (title: string, mockContent: any) => {
    localStorage.setItem('uploadedContent', JSON.stringify({
      fileName: title,
      extractedAt: new Date().toISOString(),
      pages: mockContent
    }));
    setStatusMessage(`Loaded "${title}" content`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8 font-sans">
      <header className="mb-8 flex flex-col items-center relative">
        <div className="absolute right-0 top-0">
             <a href="/profile" className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors inline-flex items-center justify-center text-gray-700" title="Profile">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
             </a>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
          AI Learning Hub
        </h1>
        <p className="text-gray-500">Manage your learning materials efficiently</p>
      </header>

      {/* Netflix-style Tab Bar */}
      <div className="flex justify-center mb-12">
        <div className="bg-gray-200 p-1 rounded-full inline-flex relative">
            {/* Animated Background Pill */}
             <div 
                className={`absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out`}
                style={{
                    left: '4px',
                    width: 'calc(50% - 4px)',
                    transform: activeTab === 'standard' ? 'translateX(100%)' : 'translateX(0)' 
                }}
             />
             
            <button 
                onClick={() => setActiveTab('upload')}
                className={`relative z-10 w-32 sm:w-48 py-2 rounded-full text-sm font-medium transition-colors duration-300 text-center ${activeTab === 'upload' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Upload
            </button>
            <button 
                onClick={() => setActiveTab('standard')}
                className={`relative z-10 w-32 sm:w-48 py-2 rounded-full text-sm font-medium transition-colors duration-300 text-center ${activeTab === 'standard' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Standard Material
            </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        
        {/* Section 1: Upload Area */}
        {activeTab === 'upload' && (
        <section className="bg-white rounded-3xl shadow-xl p-12 border border-gray-100 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-blue-50 p-6 rounded-full mb-6">
            <Upload className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Material</h2>
          <p className="text-gray-500 mb-8 max-w-sm">
            Upload your PDF or PPTX files. We'll extract the content page-wise and store it locally for quick access.
          </p>
          
          <label className="relative cursor-pointer group mb-4">
            <div className="bg-gray-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg group-hover:bg-gray-800 transition-all flex items-center gap-3">
              {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <FileText className="w-5 h-5" />}
              <span>{isProcessing ? 'Processing...' : 'Choose File'}</span>
            </div>
            <input 
              type="file" 
              accept=".pdf,.pptx" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isProcessing} 
            />
          </label>
          <a href="/pdfviewer" className="text-blue-600 hover:underline font-medium">
            View Uploaded PDF with Annotations &rarr;
          </a>
        </section>
        )}

        {/* Section 2: Predefined Cards */}
        {/* Section 2: Predefined Cards (Netflix Style) */}
        {activeTab === 'standard' && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-6 px-2">
            <h2 className="text-xl font-bold text-gray-800">Popular Subjects</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <MovieCard 
              title="Class 11th Physics" 
              subject="Physics"
              description="Kinematics & Laws of Motion. Master the fundamentals of mechanics."
              image="https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=1000&auto=format&fit=crop"
              onClick={() => handlePredefinedCardClick("Class 11th Physics", [
                { page: 1, text: "Chapter 1: Physical World" },
                { page: 2, text: "Chapter 2: Units and Measurements" }
              ])}
            />
            <MovieCard 
              title="Class 12th Chemistry" 
              subject="Chemistry"
              description="Solutions & Electrochemistry. Dive deep into molecular interactions."
              image="https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1000&auto=format&fit=crop"
              onClick={() => handlePredefinedCardClick("Class 12th Chemistry", [
                { page: 1, text: "Chapter 1: Solutions" },
                { page: 2, text: "Chapter 2: Electrochemistry" }
              ])}
            />
            <MovieCard 
              title="JEE Advanced" 
              subject="Competitive"
              description="Previous Year Questions. Rigorous practice for the toughest exams."
              image="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1000&auto=format&fit=crop"
              onClick={() => handlePredefinedCardClick("JEE Advanced Mock", [
                { page: 1, text: "Question 1: ..." },
                { page: 2, text: "Question 2: ..." }
              ])}
            />
             <MovieCard 
              title="Biology NEET" 
              subject="Biology"
              description="Human Physiology. Understanding the complexity of life systems."
              image="https://images.unsplash.com/photo-1530210124550-912dc1381cb8?q=80&w=1000&auto=format&fit=crop"
              onClick={() => handlePredefinedCardClick("Biology NEET", [
                { page: 1, text: "Digestion and Absorption" },
                { page: 2, text: "Breathing and Exchange of Gases" }
              ])}
            />
          </div>
        </section>
        )}

      </div>

      {statusMessage && (
        <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <CheckCircle className="text-green-400 w-6 h-6" />
          <p className="font-medium">{statusMessage}</p>
          <button onClick={() => setStatusMessage(null)} className="ml-4 text-gray-400 hover:text-white">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

function MovieCard({ title, subject, description, image, onClick }: { title: string, subject: string, description: string, image: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="relative group w-full aspect-video rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.03] focus:outline-none"
    >
      {/* Background Image */}
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      
      {/* Dark Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity duration-500" />

      {/* Content */}
      <div className="absolute inset-0 p-6 flex flex-col justify-end text-left">
         <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
            <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-2 py-1 text-[10px] font-bold tracking-widest text-white uppercase bg-red-600/90 rounded-sm shadow-sm">
                    {subject}
                </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white leading-tight drop-shadow-lg mb-1 font-sans">
                {title}
            </h3>
             
            {/* Description Reveal */}
            <div className="h-0 overflow-hidden group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out">
                <p className="text-gray-200 text-xs mt-3 line-clamp-2 leading-relaxed font-medium max-w-[90%]">
                    {description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-white text-sm font-bold">
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-200 transition-colors">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <span className="drop-shadow-md">Start Learning</span>
                </div>
            </div>
         </div>
      </div>
    </button>
  );
}
