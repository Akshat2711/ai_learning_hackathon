'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, BookOpen, Shield, Sparkles, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRef } from 'react'

export default function LandingPageClient() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])

  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-violet-500/30 overflow-hidden">
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AI Learn</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center pt-32 pb-16 relative">
        <motion.div 
            style={{ y }}
            className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        >
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
        </motion.div>

        <div className="mx-auto max-w-7xl px-6 relative z-10">
            <div className="flex flex-col items-center text-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300"
                >
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500"></span>
                    </span>
                    AI-Powered Learning Assistant
                </motion.div>
                
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="mb-8 max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl"
                >
                    Master your documents with <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">Intelligent AI</span>
                </motion.h1>
                
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="mb-12 max-w-2xl text-lg text-zinc-400 sm:text-xl leading-relaxed"
                >
                    Upload PDFs, track your reading progress, and have interactive conversations with your study materials. experience the future of learning today.
                </motion.p>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                >
                    <Link
                        href="/login"
                        className="group flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-bold text-black transition-all hover:bg-zinc-200"
                    >
                        Start Learning Free
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                        href="#features"
                        className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-8 text-base font-bold text-white transition-all hover:bg-zinc-800"
                    >
                        View Demo
                    </Link>
                </motion.div>
            </div>

            {/* Feature Grid with Staggered Drop Effect */}
            <motion.div 
                id="features" 
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.2
                        }
                    }
                }}
                className="mt-32 grid grid-cols-1 gap-8 sm:grid-cols-3"
            >
                <FeatureCard 
                    icon={Zap} 
                    title="Instant Analysis" 
                    description="Get summaries and key insights from your documents in seconds using Gemini AI."
                />
                <FeatureCard 
                    icon={BookOpen} 
                    title="Progress Tracking" 
                    description="Automatically track which pages you've read and pick up exactly where you left off."
                />
                <FeatureCard 
                    icon={Shield} 
                    title="Secure Storage" 
                    description="Your documents are encrypted and stored safely. You own your data."
                />
            </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-8 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-sm text-zinc-500">© 2024 AI Learning Hub. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="text-sm text-zinc-500 hover:text-white">Privacy</a>
                <a href="#" className="text-sm text-zinc-500 hover:text-white">Terms</a>
            </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <motion.div 
            variants={{
                hidden: { opacity: 0, y: 50 },
                show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50 } }
            }}
            className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-6 transition-colors hover:border-violet-500/50 hover:bg-zinc-900"
        >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-violet-400 group-hover:bg-violet-500/10 group-hover:text-violet-300">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </motion.div>
    )
}
