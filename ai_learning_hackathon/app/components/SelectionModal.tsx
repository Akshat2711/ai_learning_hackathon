'use client';

import React from 'react';
import { PenTool, Mic2, BookOpenText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
}

export default function SelectionModal({ isOpen, onClose, fileName }: SelectionModalProps) {
  const router = useRouter();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleSelection = async (action: () => void, activityType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          activity_type: activityType,
          file_name: fileName || 'Unknown File'
        });
      }
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
    action();
  };

  const options = [
    {
      title: 'Annotate PDF',
      description: 'Read, highlight, and draw.',
      icon: PenTool,
      bgColor: 'bg-blue-400',
      action: () => router.push('/pdfviewer'),
      tracking: 'annotation'
    },
    {
      title: 'AI Lecture',
      description: 'Watch an AI video lecture.',
      icon: BookOpenText,
      bgColor: 'bg-green-400',
      action: () => router.push('/lecture'),
      tracking: 'lecture'
    },
    {
      title: 'Podcast',
      description: 'Listen to an audio convo.',
      icon: Mic2,
      bgColor: 'bg-pink-400',
      action: () => router.push('/podcast'),
      tracking: 'podcast'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
            className="relative w-full max-w-4xl bg-[#fffdf5] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 overflow-hidden font-mono"
          >
            {/* Decorative Corner */}
            <div className="absolute top-0 left-0 w-8 h-8 border-r-4 border-b-4 border-black bg-yellow-400 z-10"></div>

            <div className="text-center mb-8 relative z-10">
              <div className="inline-block bg-black text-white px-4 py-1 mb-2 transform -rotate-1">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Select Mode</h2>
              </div>
              <p className="font-bold text-black uppercase tracking-wide text-sm mt-2">
                Target: <span className="bg-yellow-300 px-1 border-2 border-black border-dashed">{fileName}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-red-500 border-2 border-black text-white hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] z-20"
            >
              <X size={20} strokeWidth={3} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelection(option.action, option.tracking)}
                  className="group relative flex flex-col items-center text-center p-6 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all"
                >
                  <div className={`mb-4 h-16 w-16 border-2 border-black ${option.bgColor} flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:rotate-6 transition-transform`}>
                    <option.icon className="h-8 w-8 text-black" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-black uppercase text-black mb-2">{option.title}</h3>
                  <p className="text-xs font-bold text-gray-600 mb-6 uppercase tracking-tight">
                    {option.description}
                  </p>

                  <div className="mt-auto px-6 py-2 border-2 border-black bg-black text-white text-xs font-black uppercase tracking-widest group-hover:bg-white group-hover:text-black transition-colors">
                    Initialize
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
