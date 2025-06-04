'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LeaderboardDataTable, LeaderboardEntry } from '@/components/leaderboard-data-table'

export default function Leaderboard() {
  const { user, loading: authLoading } = useAuth()
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchScores() {
      try {
        const { data, error } = await supabase
          .from('scores')
          .select('*')
          .order('score', { ascending: false })
          .order('updated_at', { ascending: true }) // Secondary sort for tie-breaking

        if (error) {
          setError(error.message)
          console.error('Error fetching scores:', error)
        } else {
          setScores(data || [])
          console.log('✅ Leaderboard data fetched:', data)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching scores:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 pb-20 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            🏆 Leaderboard
          </h1>
          <Link href="/">
            <Button variant="outline">
              Back to Trivia
            </Button>
          </Link>
        </div>

        {/* Auth Status Card */}
        {user && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-blue-800">
                <strong>Logged in as:</strong> {user.email}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
              <span className="text-gray-600">Loading leaderboard...</span>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-red-700">
                <strong>Error:</strong> {error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Content */}
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-gray-900">
                Top Players
              </CardTitle>
              <CardDescription>
                {scores.length} {scores.length === 1 ? 'player' : 'players'} ranked by score
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg mb-4">
                    No scores yet! Be the first to play.
                  </p>
                  <Link href="/">
                    <Button>
                      Start Playing
                    </Button>
                  </Link>
                </div>
              ) : (
                <LeaderboardDataTable 
                  data={scores} 
                  currentUserId={user?.id}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Back to Game */}
        {!loading && !error && scores.length > 0 && (
          <div className="text-center mt-8">
            <Link href="/">
              <Button size="lg">
                🧠 Play More Trivia
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 