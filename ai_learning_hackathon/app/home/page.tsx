"use client";

import React, { useState } from 'react';
import { Upload, FileText, BookOpen, CheckCircle, Loader2, File as FileIcon, Zap, Search, Grid, List } from 'lucide-react';
import { parsePDF, parsePPTX } from '@/lib/parsers';
import SelectionModal from '@/components/SelectionModal';

export default function HomePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'standard'>('upload');
  const [showModal, setShowModal] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

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
    
    // Show Modal if successful
    if (file) {
        setUploadedFileName(file.name);
        setShowModal(true);
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
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono p-4 sm:p-8">

      {/* Header */}
      <header className="mb-12 flex flex-col items-center relative z-10">
        <div className="absolute right-0 top-0">
          <a href="/profile" className="flex items-center justify-center w-12 h-12 border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none" title="Profile">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold">
              <span className="text-xs">ME</span>
            </div>
          </a>
        </div>
        <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter mb-4 text-center">
          Dashboard
        </h1>
        <div className="bg-black text-white px-4 py-1 skew-x-[-12deg]">
          <p className="text-sm font-bold uppercase tracking-widest text-[#fffdf5]">Manage your learning materials</p>
        </div>
      </header>

      {/* Brutalist Tab Switcher */}
      <div className="flex justify-center mb-16">
        <div className="inline-flex border-4 border-black bg-white p-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-8 py-3 font-bold uppercase border-2 transition-all ${activeTab === 'upload' ? 'bg-yellow-400 border-black text-black' : 'bg-transparent border-transparent text-gray-500 hover:text-black hover:border-gray-200'}`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-8 py-3 font-bold uppercase border-2 transition-all ${activeTab === 'standard' ? 'bg-pink-400 border-black text-black' : 'bg-transparent border-transparent text-gray-500 hover:text-black hover:border-gray-200'}`}
          >
            Library
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">

        {/* Section 1: Upload Area */}
        {activeTab === 'upload' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="border-4 border-black bg-white p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center text-center relative group">
              {/* Decorative corners */}
              <div className="absolute top-0 left-0 w-4 h-4 bg-black"></div>
              <div className="absolute top-0 right-0 w-4 h-4 bg-black"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 bg-black"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-black"></div>

              <div className="mb-8 border-4 border-black bg-blue-400 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rotate-3 group-hover:rotate-6 transition-transform">
                <Upload className="w-12 h-12 text-black" />
              </div>

              <h2 className="text-4xl font-black uppercase mb-4">Drop Data Here</h2>
              <p className="text-lg font-bold text-gray-600 mb-10 max-w-sm">
                PDF or PPTX. We extract the raw intel and index it for the neural engine.
              </p>


              <label className="relative cursor-pointer w-full max-w-md">
                <div className="w-full bg-black text-white px-8 py-6 text-xl font-bold uppercase border-4 border-transparent hover:bg-white hover:text-black hover:border-black transition-all flex items-center justify-center gap-4 shadow-[8px_8px_0px_0px_#9333ea]">
                  {isProcessing ? <Loader2 className="animate-spin w-8 h-8" /> : <FileText className="w-8 h-8" />}
                  <span>{isProcessing ? 'Processing...' : 'Select Document'}</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.pptx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                />
              </label>

              <a href="/pdfviewer" className="mt-8 text-black font-bold uppercase hover:bg-yellow-400 px-2 transition-colors border-b-4 border-black">
                View Cache &rarr;
              </a>
            </div>
          </section>
        )}

        {/* Section 2: Cards */}
        {activeTab === 'standard' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-black text-white p-2">
                <Grid className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black uppercase">Standard Issue</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              <BrutalistCard
                title="Physics 11"
                subject="SCI-PHY-11"
                description="Kinematics & Laws. Fundamental mechanics data."
                color="bg-red-400"
                onClick={() => handlePredefinedCardClick("Class 11th Physics", [
                  { page: 1, text: "Chapter 1: Physical World" },
                  { page: 2, text: "Chapter 2: Units and Measurements" }
                ])}
              />
              <BrutalistCard
                title="Chem 12"
                subject="SCI-CHE-12"
                description="Solutions & Electro. Molecular interaction protocols."
                color="bg-green-400"
                onClick={() => handlePredefinedCardClick("Class 12th Chemistry", [
                  { page: 1, text: "Chapter 1: Solutions" },
                  { page: 2, text: "Chapter 2: Electrochemistry" }
                ])}
              />
              <BrutalistCard
                title="JEE ADV"
                subject="COMP-JEE-ADV"
                description="Historical battle data. Rigorous exam simulations."
                color="bg-blue-400"
                onClick={() => handlePredefinedCardClick("JEE Advanced Mock", [
                  { page: 1, text: "Question 1: ..." },
                  { page: 2, text: "Question 2: ..." }
                ])}
              />
              <BrutalistCard
                title="NEET Bio"
                subject="BIO-NEET"
                description="Physiology systems. Life complexity analysis."
                color="bg-yellow-400"
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
        <div className="fixed bottom-8 right-8 border-4 border-black bg-white px-6 py-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50">
          <div className="bg-green-400 p-1 border-2 border-black">
            <CheckCircle className="text-black w-6 h-6" />
          </div>
          <p className="font-bold uppercase text-sm">{statusMessage}</p>
          <button onClick={() => setStatusMessage(null)} className="ml-4 font-black hover:text-red-500">
            X
          </button>
        </div>
      )}

      <SelectionModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        fileName={uploadedFileName} 
      />
    </div>
  );
}

function BrutalistCard({ title, subject, description, color, onClick }: { title: string, subject: string, description: string, color: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left focus:outline-none"
    >
      <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
      <div className={`relative h-full border-4 border-black bg-white p-6 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 flex flex-col justify-between`}>
        <div>
          <div className={`inline-block px-2 py-1 border-2 border-black ${color} text-xs font-black mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
            {subject}
          </div>
          <h3 className="text-3xl font-black uppercase leading-none mb-3">
            {title}
          </h3>
          <p className="text-sm font-bold text-gray-500 mb-6 border-l-4 border-gray-200 pl-3">
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 font-bold uppercase text-xs">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <span>Initialize</span>
        </div>
      </div>
    </button>
  );
}
