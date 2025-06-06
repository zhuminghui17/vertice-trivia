'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { GameHistoryDataTable } from '@/components/game-history-data-table'
import { UserSessionParticipation } from '@/types/participation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function GameHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [gameHistory, setGameHistory] = useState<UserSessionParticipation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGameHistory() {
      try {
        setIsLoading(true)
        
        if (!user?.id) {
          setGameHistory([])
          return
        }

        const { data, error } = await supabase
          .from('user_session_participations')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })

        if (error) {
          setError(error.message)
          console.error('Error fetching game history:', error)
        } else {
          setGameHistory(data || [])
          console.log('✅ Game history data fetched:', data)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching game history:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      fetchGameHistory()
    }
  }, [user?.id, authLoading])

  if (authLoading || isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span className="text-gray-600">Loading game history...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-700">
              <strong>Error:</strong> {error}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="text-primary hover:underline mt-2"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardContent>
          {gameHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                No games found. Start playing to see your history!
              </p>
            </div>
          ) : (
            <GameHistoryDataTable data={gameHistory} />
          )}
        </CardContent>
      </Card>
    </div>
  )
} 