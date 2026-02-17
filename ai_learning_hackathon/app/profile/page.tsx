'use client'

import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Book, Clock, LogOut, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  email: string
  full_name?: string
  avatar_url?: string
}

interface ReadingStat {
  pdf_name: string
  pages_read: number
  total_pages: number // Assuming we can store this or estimate it, otherwise we might just show pages read
  last_read_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ReadingStat[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        setProfile({
          email: user.email!,
          full_name: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url,
        })

        // Fetch stats
        const { data: reads, error } = await supabase
          .from('user_pdf_progress')
          .select('*')
          .eq('user_id', user.id)
          .order('last_read_at', { ascending: false })

        if (!error && reads) {
          setStats(reads)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
     return (
        <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 sm:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
            <Link href="/home" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Home</span>
            </Link>
            <button 
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
                <LogOut className="w-4 h-4" />
                Sign Out
            </button>
        </div>

        {/* Profile Card */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-8 mb-8 backdrop-blur-xl flex flex-col sm:flex-row items-center gap-8">
            <div className="relative">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="w-24 h-24 rounded-full border-4 border-zinc-800 shadow-xl" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border-4 border-zinc-700">
                        <UserIcon className="w-10 h-10 text-zinc-400" />
                    </div>
                )}
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-zinc-900 rounded-full"></div>
            </div>
            
            <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold mb-2">{profile?.full_name || 'Learner'}</h1>
                <p className="text-zinc-400">{profile?.email}</p>
                <div className="mt-4 flex items-center justify-center sm:justify-start gap-4">
                    <div className="px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold uppercase tracking-wider">
                        Pro Member
                    </div>
                </div>
            </div>
        </div>

        {/* Stats Grid */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-500" />
            Recent Activity
        </h2>

        {stats.length === 0 ? (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-12 text-center">
                <Book className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No reading history yet. Start learning!</p>
            </div>
        ) : (
            <div className="grid gap-4">
                {stats.map((stat, idx) => (
                    <div key={idx} className="group bg-zinc-900 border border-white/5 p-6 rounded-2xl hover:border-violet-500/30 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-violet-500/20 group-hover:text-violet-400 transition-colors">
                                <Book className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-1">{stat.pdf_name}</h3>
                                <p className="text-sm text-zinc-400">Last read: {new Date(stat.last_read_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-bold text-white">{stat.pages_read}</div>
                             <div className="text-xs text-zinc-500 uppercase tracking-wider">Pages Read</div>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  )
}
