'use client'

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"

interface SessionParticipant {
  rank: number
  user: {
    id: string
    email: string
    name: string
  }
  participation: {
    id: string
    status: string
    score: number
    totalQuestions: number
    correctAnswers: number
    timeTaken?: number
    startedAt: string
    completedAt?: string
  }
  responseCount: number
}

interface SessionData {
  session: {
    id: string
    date: string
    category?: string
    status: string
    sessionType: string
    timerDuration: number
    questionCount: number
  }
  participants: SessionParticipant[]
  winners: SessionParticipant[]
  statistics: {
    totalParticipants: number
    completedParticipants: number
    averageScore: number
    averageTime: number
    highestScore: number
    perfectScores: number
  }
}

interface SessionParticipantsProps {
  sessionId?: string
  date?: string
}

export function SessionParticipants({ sessionId, date }: SessionParticipantsProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId || date) {
      fetchSessionData()
    }
  }, [sessionId, date])

  const fetchSessionData = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (sessionId) params.append('sessionId', sessionId)
      if (date) params.append('date', date)

      const response = await fetch(`/api/session-participants?${params.toString()}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch session data')
      }

      setSessionData(data)
    } catch (err) {
      console.error('Error fetching session data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch session data')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getAccuracyPercentage = (correct: number, total: number) => {
    if (total === 0) return '0%'
    return `${Math.round((correct / total) * 100)}%`
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading session data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-700">Error: {error}</p>
              <Button onClick={fetchSessionData} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-600">No session data found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { session, participants, winners, statistics } = sessionData

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Session Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Trivia Session - {new Date(session.date).toLocaleDateString()}
              </CardTitle>
              <CardDescription>
                {session.sessionType} session • {session.questionCount} questions • {Math.floor(session.timerDuration / 60)} minutes
                {session.category && ` • ${session.category}`}
              </CardDescription>
            </div>
            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Session Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Session Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{statistics.totalParticipants}</div>
              <div className="text-sm text-gray-600">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{statistics.completedParticipants}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{statistics.averageScore.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{statistics.perfectScores}</div>
              <div className="text-sm text-gray-600">Perfect Scores</div>
            </div>
          </div>
          {statistics.averageTime > 0 && (
            <div className="mt-4 text-center">
              <div className="text-lg text-gray-600">
                Average completion time: <strong>{formatTime(Math.round(statistics.averageTime))}</strong>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Winners */}
      {winners.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 {winners.length > 1 ? 'Winners' : 'Winner'} 
              <Badge className="bg-yellow-200 text-yellow-800">
                {statistics.highestScore} points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {winners.map((winner, index) => (
                <div key={winner.user.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {winners.length === 1 ? '🥇' : '🏆'}
                    </div>
                    <div>
                      <div className="font-semibold">{winner.user.name}</div>
                      <div className="text-sm text-gray-600">{winner.user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{winner.participation.score}/{winner.participation.totalQuestions}</div>
                    <div className="text-sm text-gray-600">
                      {getAccuracyPercentage(winner.participation.correctAnswers, winner.participation.totalQuestions)}
                      {winner.participation.timeTaken && ` • ${formatTime(winner.participation.timeTaken)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Participants */}
      <Card>
        <CardHeader>
          <CardTitle>👥 All Participants</CardTitle>
          <CardDescription>
            Complete leaderboard for this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        {participant.rank === 1 ? '🥇' : 
                         participant.rank === 2 ? '🥈' : 
                         participant.rank === 3 ? '🥉' : 
                         `#${participant.rank}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{participant.user.name}</div>
                      <div className="text-sm text-gray-600">{participant.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="font-bold">
                      {participant.participation.score}/{participant.participation.totalQuestions}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {getAccuracyPercentage(participant.participation.correctAnswers, participant.participation.totalQuestions)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatTime(participant.participation.timeTaken)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={participant.participation.status === 'completed' ? 'default' : 'secondary'}>
                      {participant.participation.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 