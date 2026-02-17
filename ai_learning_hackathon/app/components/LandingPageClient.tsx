'use client'

import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Shield, Zap, Terminal, Cpu, Star, MousePointer, Globe } from 'lucide-react'
import Link from 'next/link'

export default function LandingPageClient() {
  return (
    <div className="min-h-screen bg-[#fffdf5] text-black font-mono overflow-x-hidden selection:bg-pink-500 selection:text-white">

      {/* Background Grid Pattern */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b-4 border-black bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 rounded-none group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform"></div>
              <div className="relative flex h-10 w-10 items-center justify-center border-2 border-black bg-yellow-400 z-10 transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
                <Terminal className="h-6 w-6 text-black" />
              </div>
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter italic">HooliAI_</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-bold uppercase hover:underline decoration-4 underline-offset-4 decoration-pink-500"
            >
              Log In
            </Link>
            <Link
              href="/login"
              className="relative px-6 py-2 font-bold uppercase text-black border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none bg-gradient-to-r from-pink-400 to-pink-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 relative z-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">

            {/* Left Content */}
            <div className="flex-1 flex flex-col items-start text-left">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, rotate: -5, scale: 0.9 }}
                animate={{ opacity: 1, rotate: -2, scale: 1 }}
                whileHover={{ rotate: 0, scale: 1.05 }}
                className="mb-8 inline-flex items-center gap-2 border-2 border-black bg-cyan-300 px-4 py-2 text-sm font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 transform"
              >
                <Star className="h-4 w-4 fill-black animate-pulse" />
                <span>Now with Gemini 3.0</span>
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 text-6xl sm:text-7xl lg:text-9xl font-black uppercase leading-[0.85] tracking-tighter"
              >
                Brain <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 stroke-black" style={{ WebkitTextStroke: '2px black' }}>Upgrade</span> <br />
                Installed.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-10 max-w-xl text-xl font-bold text-gray-800 leading-relaxed border-l-8 border-yellow-400 pl-6"
              >
                Don't just read. <span className="underline decoration-wavy decoration-2 decoration-pink-500">Absorb.</span> Transforming your chaotic PDFs into a structured knowledge engine using advanced AI.
              </motion.p>

              <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
                <Link
                  href="/login"
                  className="relative group w-full sm:w-auto"
                >
                  <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 rounded-none"></div>
                  <div className="relative h-16 w-full sm:w-auto flex items-center justify-center gap-3 border-2 border-black bg-yellow-400 px-8 text-xl font-black uppercase text-black transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1">
                    Start Learning
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </Link>

                <Link
                  href="#features"
                  className="w-full sm:w-auto text-lg font-bold uppercase border-b-2 border-black hover:bg-black hover:text-white transition-colors px-4 py-3 text-center"
                >
                  How it works ↓
                </Link>
              </div>
            </div>

            {/* Right Visual (Abstract "Brutalist" Composition) */}
            <div className="flex-1 w-full relative h-[500px] hidden lg:block">
              <div className="absolute top-10 right-10 w-64 h-80 bg-pink-500 border-4 border-black rotate-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] z-10 flex items-center justify-center">
                <span className="text-8xl font-black text-white">AI</span>
              </div>
              <div className="absolute top-20 right-32 w-64 h-80 bg-white border-4 border-black -rotate-3 z-20 flex flex-col p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="w-full h-4 bg-gray-200 mb-4 animate-pulse"></div>
                <div className="w-3/4 h-4 bg-gray-200 mb-4 animate-pulse"></div>
                <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                  <Cpu className="w-12 h-12 text-gray-300" />
                </div>
                <div className="mt-auto flex justify-between">
                  <div className="w-8 h-8 rounded-full bg-black"></div>
                  <div className="w-20 h-8 bg-black"></div>
                </div>
              </div>
              {/* Decorative Elements */}
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500 border-4 border-black rounded-full z-30 flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                <MousePointer className="w-12 h-12 text-white -rotate-12" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Marquee Section */}
      <div className="border-y-4 border-black bg-yellow-400 py-4 overflow-hidden mb-24 whitespace-nowrap">
        <div className="inline-block animate-marquee">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="text-4xl font-black uppercase mx-8">
              ★ UPLOAD PDF ★ ANALYZE ★ LEARN ★ REPEAT
            </span>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div id="features" className="mx-auto max-w-7xl px-6 mb-32">
        <div className="mb-16 flex items-end justify-between border-b-4 border-black pb-4">
          <h2 className="text-5xl sm:text-7xl font-black uppercase leading-none">
            System<br />Specs
          </h2>
          <div className="hidden sm:block text-right">
            <p className="font-bold">v3.0.0</p>
            <p className="font-mono text-sm">RELEASE_CANDIDATE</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <FeatureCard
            icon={Globe}
            title="Neural Net"
            description="Powered by the latest Gemini 1.5 models. It doesn't just read; it understands context, nuance, and intent."
            color="bg-orange-400"
            degree="rotate-1"
          />
          <FeatureCard
            icon={BookOpen}
            title="Memory Core"
            description="Persistent state tracking across sessions. Your learning journey is saved byte-for-byte."
            color="bg-purple-400"
            degree="-rotate-1"
          />
          <FeatureCard
            icon={Shield}
            title="Iron Vault"
            description="Encrypted at rest. Encrypted in transit. Your intellectual property stays yours."
            color="bg-green-400"
            degree="rotate-2"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6">


          <div className="border-t-2 border-black pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="font-bold">© 2026 AI Learning Hub.</p>
            <div className="flex gap-6">
              <a href="#" className="font-bold uppercase hover:bg-black hover:text-white px-2">Privacy</a>
              <a href="#" className="font-bold uppercase hover:bg-black hover:text-white px-2">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee {
            animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description, color, degree }: { icon: any, title: string, description: string, color: string, degree: string }) {
  return (
    <div className={`relative group ${degree} hover:rotate-0 transition-transform duration-300`}>
      <div className="absolute inset-0 bg-black translate-x-3 translate-y-3 rounded-none"></div>
      <div className="relative h-full border-4 border-black bg-white p-8 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1 flex flex-col">
        <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center border-2 border-black ${color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
          <Icon className="h-8 w-8 text-black" />
        </div>
        <h3 className="mb-4 text-3xl font-black uppercase">{title}</h3>
        <p className="text-lg font-bold text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
