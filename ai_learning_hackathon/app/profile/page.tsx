"use client";

import React, { useEffect, useState } from 'react';
import { User, BookOpen, Clock, Activity, LogOut, ArrowLeft, TrendingUp, Award, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface UserStats {
  total_pdfs_read: number;
  total_pages_read: number;
  learning_streak: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    total_pdfs_read: 0,
    total_pages_read: 0,
    learning_streak: 0
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUser({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url
      });

      // Fetch simulated stats for now (replace with real DB calls if available)
      // In a real app, you'd fetch this from a 'user_stats' table
      const { data: progressData } = await supabase.from('user_pdf_progress').select('*').eq('user_id', user.id);

      const totalPdfs = progressData?.length || 0;
      const totalPages = progressData?.reduce((acc, curr) => acc + (curr.pages_read || 0), 0) || 0;

      setStats({
        total_pdfs_read: totalPdfs,
        total_pages_read: totalPages,
        learning_streak: Math.floor(Math.random() * 10) + 1 // Simulated streak
      });

      setLoading(false);
    };

    getUserData();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffdf5] font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold uppercase tracking-widest">Loading Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono p-4 sm:p-8">

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <Link href="/home" className="flex items-center gap-2 font-bold hover:underline decoration-4 hover:bg-black hover:text-white transition-all px-2 py-1">
          <ArrowLeft className="w-5 h-5" />
          <span>DASHBOARD</span>
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tighter">Identity</h1>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Profile Card */}
        <div className="md:col-span-1">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center h-full sticky top-8">
            <div className="w-32 h-32 border-4 border-black mb-6 bg-yellow-400 overflow-hidden relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-yellow-400">
                  <User size={48} className="text-black" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-black text-white text-xs font-bold px-1">ID: {user?.id.slice(0, 4)}</div>
            </div>

            <h2 className="text-xl font-black uppercase break-all mb-1">{user?.full_name || 'Anonymous User'}</h2>
            <p className="text-xs font-bold uppercase text-gray-500 mb-6 border-b-2 border-black pb-2 w-full">{user?.email}</p>

            <div className="w-full space-y-3 mt-auto">
              <button className="w-full py-3 border-4 border-black bg-white hover:bg-black hover:text-white transition-all font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
                Edit Detail
              </button>
              <button
                onClick={handleSignOut}
                className="w-full py-3 border-4 border-black bg-red-500 text-white hover:bg-red-600 transition-all font-bold uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Stats & Activity */}
        <div className="md:col-span-2 space-y-8">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-300 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <BookOpen className="w-8 h-8 mb-2 absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest mb-1 bg-black text-white inline-block px-1">Documents</p>
              <p className="text-4xl font-black mt-2">{stats.total_pdfs_read}</p>
            </div>
            <div className="bg-green-300 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <Activity className="w-8 h-8 mb-2 absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest mb-1 bg-black text-white inline-block px-1">Pages Read</p>
              <p className="text-4xl font-black mt-2">{stats.total_pages_read}</p>
            </div>
            <div className="bg-pink-300 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <Zap className="w-8 h-8 mb-2 absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest mb-1 bg-black text-white inline-block px-1">Streak</p>
              <p className="text-4xl font-black mt-2">{stats.learning_streak}<span className="text-sm align-top ml-1">DAYS</span></p>
            </div>
            <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:-translate-y-1 transition-transform">
              <Award className="w-8 h-8 mb-2 absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity" />
              <p className="text-xs font-black uppercase tracking-widest mb-1 bg-black text-white inline-block px-1">XP Level</p>
              <p className="text-4xl font-black mt-2">05</p>
            </div>
          </div>

          {/* Recent Activity (Placeholder for visual aesthetic) */}
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-end mb-6 border-b-4 border-black pb-2">
              <h3 className="font-black uppercase text-xl">System Logs</h3>
              <TrendingUp className="w-6 h-6" />
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-default hover:bg-gray-50 p-2 border-2 border-transparent hover:border-black transition-all">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-bold border-2 border-black group-hover:bg-yellow-400 group-hover:text-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {new Date().getDate() - i}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold uppercase text-sm">Processed Data Stream #{1024 + i}</p>
                    <p className="text-xs text-gray-500 font-mono">Module: Neural Networks • Duration: 1{5 - i}m</p>
                  </div>
                  <div className="text-xs font-bold uppercase bg-green-400 text-black border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    COMPLETE
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t-4 border-black text-center">
              <button className="text-xs font-black uppercase bg-black text-white px-4 py-2 hover:bg-gray-800">View Full History</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
