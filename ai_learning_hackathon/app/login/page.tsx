'use client'

import { createClient } from '@/utils/supabase/client'
import { Sparkles, Terminal, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-mono text-black relative overflow-hidden">

      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Logo/Brand Area */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="relative group cursor-pointer mb-6">
            <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 rounded-none transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></div>
            <div className="relative flex h-20 w-20 items-center justify-center border-4 border-black bg-yellow-400 z-10 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1">
              <Terminal className="h-10 w-10 text-black" />
            </div>
          </div>

          <h1 className="mb-2 text-5xl font-black uppercase tracking-tighter">
            LOGIN
          </h1>
          <div className="bg-black text-white px-4 py-1 transform -rotate-2 inline-block">
            <p className="text-sm font-bold uppercase tracking-widest">
              Auth Protocol Required
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="border-4 border-black bg-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative group">
          {/* Decorative corner */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-500 border-2 border-black z-20"></div>

          <div className="flex flex-col gap-6">

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 border-4 border-black bg-white px-4 py-4 text-base font-black uppercase text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-black border-t-transparent" />
              ) : (
                <>
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Use Google ID</span>
                </>
              )}
            </button>
          </div>

          <div className="my-8 flex items-center gap-4">
            <div className="h-1 flex-1 bg-black" />
            <span className="text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 transform rotate-3">Capabilities</span>
            <div className="h-1 flex-1 bg-black" />
          </div>

          <div className="space-y-4">
            <FeatureItem icon={Sparkles} text="Neural Engine Access" color="bg-cyan-300" />
            <FeatureItem icon={ShieldCheck} text="Encrypted Storage" color="bg-green-300" />
            <FeatureItem icon={Zap} text="Instant Analysis" color="bg-pink-300" />
          </div>
        </div>

        <p className="mt-8 text-center text-xs font-bold uppercase text-gray-500">
          By proceeding, you agree to our <span className="underline decoration-2 decoration-black text-black cursor-pointer">Terms</span> and <span className="underline decoration-2 decoration-black text-black cursor-pointer">Privacy Protocol</span>.
        </p>
      </div>
    </div>
  )
}

function FeatureItem({ icon: Icon, text, color }: { icon: any, text: string, color: string }) {
  return (
    <div className="flex items-center gap-4 p-2 group cursor-default">
      <div className={`flex h-10 w-10 items-center justify-center border-2 border-black ${color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform group-hover:-translate-y-1`}>
        <Icon className="h-5 w-5 text-black" />
      </div>
      <span className="font-bold text-sm uppercase">{text}</span>
    </div>
  )
}
