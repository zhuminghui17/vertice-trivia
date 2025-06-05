'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

// Types for our trivia system
interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  category: string
}

interface TriviaSession {
  id: string
  date: string
  status: string
  sessionType: string
  category?: string
  timerDuration: number
}

interface UserParticipation {
  id: string
  status: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeTaken?: number
  startedAt: string
  completedAt?: string
}

interface SessionResults {
  participation: UserParticipation
  responses: {
    questionId: string
    question: string
    category: string
    options: string[]
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    answeredAt: string
  }[]
}

interface TriviaInterfaceProps {
  user: any
  isAdmin?: boolean
}

export function TriviaInterface({ user, isAdmin = false }: TriviaInterfaceProps) {
  const [gameState, setGameState] = useState<'waiting' | 'loading' | 'playing' | 'complete' | 'already_completed'>('waiting')
  const [session, setSession] = useState<TriviaSession | null>(null)
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [answers, setAnswers] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [timerExpired, setTimerExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionResults, setSessionResults] = useState<SessionResults | null>(null)
  const [hasCompletedToday, setHasCompletedToday] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)

  // Check session status on component mount
  useEffect(() => {
    checkTodaysSessionStatus()
  }, [])

  // Timer effect - only runs when playing
  useEffect(() => {
    if (gameState !== 'playing' || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev: number) => {
        if (prev <= 1) {
          setTimerExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, gameState])

  // Auto-submit when timer expires
  useEffect(() => {
    if (timerExpired && gameState === 'playing' && !isSubmitting) {
      handleFinalSubmit(true) // Pass true to indicate timer expiry
    }
  }, [timerExpired, gameState, isSubmitting])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining > 60) return 'text-green-600' // Green when >1 min
    if (timeRemaining > 30) return 'text-yellow-600' // Yellow when >30 sec
    return 'text-red-600' // Red when ≤30 sec
  }

  const checkTodaysSessionStatus = async () => {
    setGameState('loading')
    setError(null)
    
    try {
      // Get auth token for API calls
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        setError('Please sign in to continue')
        setGameState('waiting')
        return
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token}`
      }

      const response = await fetch('/api/user-session-status', { headers })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to check session status')
      }

      if (!data.hasSession) {
        // No session exists for today
        setGameState('waiting')
        return
      }

      if (data.hasParticipated && data.isCompleted) {
        // User has already completed today's trivia
        setHasCompletedToday(true)
        setSessionResults(data.results)
        setGameState('already_completed')
        return
      }

      // Session exists and user hasn't completed it yet
      setSession(data.session)
      setGameState('waiting')

    } catch (err) {
      console.error('Error checking session status:', err)
      setError(err instanceof Error ? err.message : 'Failed to check session status')
      setGameState('waiting')
    }
  }

  const startTodaysTrivia = async () => {
    if (hasCompletedToday) {
      // User has already completed today's trivia, show results
      setGameState('already_completed')
      return
    }

    setGameState('loading')
    setError(null)
    
    try {
      // If we don't have a session yet, try to create or get one
      if (!session) {
        // First, try to fetch today's questions/session
        const response = await fetch('/api/todays-questions')
        const data = await response.json()
        
        if (data.success) {
          // Questions exist, start the game
          setQuestions(data.questions)
          setSession(data.session)
          setGameState('playing')
          setTimeRemaining(data.session?.timerDuration || 300)
          setTimerExpired(false)
          setStartTime(new Date())
          return
        }
        
        // No questions found, generate new ones (admin only)
        console.log('No questions found, generating new ones...')
        
        // Get auth token for admin verification
        const { data: { session: authSession } } = await supabase.auth.getSession()
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        }
        
        if (authSession?.access_token) {
          headers['Authorization'] = `Bearer ${authSession.access_token}`
        }
        
        const generateResponse = await fetch('/api/generate-questions', {
          method: 'POST',
          headers
        })
        const generateData = await generateResponse.json()
        
        if (!generateData.success) {
          throw new Error(generateData.error || generateData.message || 'Failed to generate questions')
        }
        
        // Fetch the newly generated questions
        const newQuestionsResponse = await fetch('/api/todays-questions')
        const newQuestionsData = await newQuestionsResponse.json()
        
        if (!newQuestionsData.success) {
          throw new Error('Failed to fetch generated questions')
        }
        
        setQuestions(newQuestionsData.questions)
        setSession(newQuestionsData.session)
        setGameState('playing')
        setTimeRemaining(newQuestionsData.session?.timerDuration || 300)
        setTimerExpired(false)
        setStartTime(new Date())
      } else {
        // We have a session, fetch its questions and start
        const response = await fetch('/api/todays-questions')
        const data = await response.json()
        
        if (!data.success) {
          throw new Error('Failed to fetch questions for existing session')
        }
        
        setQuestions(data.questions)
        setGameState('playing')
        setTimeRemaining(session.timerDuration)
        setTimerExpired(false)
        setStartTime(new Date())
      }
      
    } catch (err) {
      console.error('Error starting trivia:', err)
      setError(err instanceof Error ? err.message : 'Failed to start trivia')
      setGameState('waiting')
    }
  }

  const handleAnswerSelect = (questionId: string, answer: string) => {
    if (gameState !== 'playing' || timerExpired) return
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleFinalSubmit = async (autoSubmit = false) => {
    if (isSubmitting || gameState !== 'playing' || !session) return

    setIsSubmitting(true)
    setGameState('complete')

    try {
      // Calculate time taken
      const timeTaken = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : undefined

      // Prepare responses for submission
      const responses = Object.entries(answers).map(([questionId, userAnswer]) => ({
        questionId,
        userAnswer
      }))

      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`
      }

      // Submit to new API endpoint
      const response = await fetch('/api/submit-responses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.id,
          responses,
          timeTaken,
          autoSubmit
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit responses')
      }

      // Set results and mark as completed
      setSessionResults({
        participation: {
          id: '',
          status: 'completed',
          score: data.results.score,
          totalQuestions: data.results.totalQuestions,
          correctAnswers: data.results.correctAnswers,
          timeTaken: data.results.timeTaken,
          startedAt: startTime?.toISOString() || '',
          completedAt: new Date().toISOString()
        },
        responses: data.results.feedback.map((f: any) => {
          const question = questions.find(q => q.id === f.questionId)!
          return {
            questionId: f.questionId,
            question: question.question,
            category: question.category,
            options: question.options,
            userAnswer: answers[f.questionId] || '',
            correctAnswer: f.correctAnswer,
            isCorrect: f.isCorrect,
            answeredAt: new Date().toISOString()
          }
        })
      })

      setHasCompletedToday(true)

    } catch (err) {
      console.error('Error submitting trivia:', err)
      alert('Error saving your answers. Please try again.')
      setGameState('playing') // Allow retry
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Geography': 'bg-blue-100 text-blue-800',
      'Technology': 'bg-purple-100 text-purple-800',
      'History': 'bg-amber-100 text-amber-800',
      'Science': 'bg-green-100 text-green-800',
      'Astronomy': 'bg-indigo-100 text-indigo-800',
      'Sports': 'bg-red-100 text-red-800',
      'Entertainment': 'bg-pink-100 text-pink-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Already completed state - show results
  if (gameState === 'already_completed' && sessionResults) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Results Summary */}
        <div className="text-center py-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-lg font-semibold text-blue-800">📊 Today's Trivia Complete!</p>
          <p className="text-sm text-blue-700">
            Your score: <strong>{sessionResults.participation.score}</strong> points
          </p>
        </div>

        {/* Message about one session per day */}
        <div className="text-center py-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-700">Come back tomorrow for new questions!</p>
        </div>

        {/* Detailed Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessionResults.responses.map((response, index) => {
            const wasAnswered = response.userAnswer !== ''

            return (
              <Card key={response.questionId} className={`border-2 ${
                !wasAnswered ? 'border-gray-200 bg-gray-50' :
                response.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCategoryColor(response.category)}>
                      {response.category}
                    </Badge>
                    <div className="text-right">
                      {!wasAnswered ? (
                        <span className="text-gray-500 font-semibold">⏸ Not Answered</span>
                      ) : response.isCorrect ? (
                        <span className="text-green-600 font-semibold">✓ Correct (+1 pt)</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Incorrect</span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text">{response.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {wasAnswered ? (
                      <>
                        <p><strong>Your answer:</strong> <span className={response.isCorrect ? 'text-green-600' : 'text-red-600'}>{response.userAnswer}</span></p>
                        {!response.isCorrect && (
                          <p><strong>Correct answer:</strong> <span className="text-green-600">{response.correctAnswer}</span></p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No answer provided (time expired)</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Waiting state - show start button
  if (gameState === 'waiting') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-md">
              Welcome, {user.email}!
              {isAdmin && <Badge className="ml-2 bg-purple-100 text-purple-800">Admin</Badge>}
            </CardTitle>
            <CardDescription>
              {hasCompletedToday 
                ? "You've already completed today's trivia! Come back tomorrow for new questions."
                : session
                ? "Ready to test your knowledge? Click below to start today's trivia challenge!"
                : isAdmin 
                ? "As an admin, you can start today's trivia game or generate new questions if none exist yet."
                : "Ready to test your knowledge? Click below to start today's trivia challenge!"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <strong>Error:</strong> {error}
                {!isAdmin && error.includes('Forbidden') && (
                  <p className="mt-2 text-sm">
                    Only administrators can generate new trivia games. Please wait for an admin to create today's questions.
                  </p>
                )}
              </div>
            )}
            
            {!hasCompletedToday && (
              <>
                <Button 
                  onClick={startTodaysTrivia}
                  size="lg"
                  className="w-full"
                  disabled={hasCompletedToday}
                >
                  🎯 {isAdmin ? 'Start/Generate Today\'s Trivia' : 'Start Today\'s Trivia'}
                </Button>
                {isAdmin && !session && (
                  <p className="text-sm text-gray-600 text-center mt-2">
                    If no questions exist for today, this will automatically generate new ones using AI.
                  </p>
                )}
                {session && (
                  <p className="text-sm text-blue-600 text-center mt-2">
                    Today's trivia session is ready! Timer: {Math.floor(session.timerDuration / 60)} minutes
                    {session.category && ` | Category: ${session.category}`}
                  </p>
                )}
              </>
            )}

            {hasCompletedToday && (
              <Button 
                onClick={() => setGameState('already_completed')}
                size="lg"
                className="w-full"
                variant="outline"
              >
                📊 View Today's Results
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (gameState === 'loading') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">
                {session ? 'Loading today\'s trivia questions...' : 'Generating today\'s trivia questions...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Results state (after completing)
  if (gameState === 'complete' && sessionResults) {
    return (
      <div className="w-full mx-auto space-y-6">
        {/* Results Summary */}
        <div className="text-center py-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-lg font-semibold text-green-800">🎉 Quiz Complete!</p>
          <p className="text-sm text-green-700">
            You scored <strong>{sessionResults.participation.score}</strong> points 
            ({sessionResults.participation.correctAnswers}/{sessionResults.participation.totalQuestions} correct)
          </p>
        </div>

        {/* One session per day message */}
        <div className="text-center py-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">Come back tomorrow for new questions!</p>
        </div>

        {/* Detailed Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessionResults.responses.map((response, index) => {
            const wasAnswered = response.userAnswer !== ''

            return (
              <Card key={response.questionId} className={`border-2 ${
                !wasAnswered ? 'border-gray-200 bg-gray-50' :
                response.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCategoryColor(response.category)}>
                      {response.category}
                    </Badge>
                    <div className="text-right">
                      {!wasAnswered ? (
                        <span className="text-gray-500 font-semibold">⏸ Not Answered</span>
                      ) : response.isCorrect ? (
                        <span className="text-green-600 font-semibold">✓ Correct (+1 pt)</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Incorrect</span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{response.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {wasAnswered ? (
                      <>
                        <p><strong>Your answer:</strong> <span className={response.isCorrect ? 'text-green-600' : 'text-red-600'}>{response.userAnswer}</span></p>
                        {!response.isCorrect && (
                          <p><strong>Correct answer:</strong> <span className="text-green-600">{response.correctAnswer}</span></p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No answer provided (time expired)</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Playing state
  const allQuestionsAnswered = Object.keys(answers).length === questions.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Timer */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-4">
            <div></div> {/* Spacer */}
            <div className="text-center">
              <CardTitle className="text-2xl">Today's Trivia</CardTitle>
              {session?.category && (
                <Badge className="mt-2" variant="outline">
                  {session.category}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Time Left</div>
              <div className={`text-lg font-mono ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
          <CardDescription>
            Answer all {questions.length} questions below, then submit to see your results. Each correct answer is worth 1 point.
            {timeRemaining <= 30 && timeRemaining > 0 && (
              <div className="text-xs text-amber-600 mt-2">
                ⚠️ Quiz will auto-submit when time expires
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <span className="text-sm font-medium text-blue-800">
          Progress: {Object.keys(answers).length}/{questions.length} questions answered
        </span>
        <div className="text-sm text-blue-600">
          Potential Score: {questions.length} points
        </div>
      </div>

      {/* All Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className={getCategoryColor(question.category)}>
                  {question.category}
                </Badge>
                <span className="text-sm text-gray-500">Question {index + 1}/{questions.length}</span>
              </div>
              <CardTitle className="text-xl">{question.question}</CardTitle>
              <CardDescription>
                Select your answer. Worth 1 point.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid gap-2">
                {question.options.map((option, optionIndex) => (
                  <Button
                    key={optionIndex}
                    variant={answers[question.id] === option ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleAnswerSelect(question.id, option)}
                    disabled={isSubmitting || timerExpired}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Final Submit */}
      <Card className="border-green-200">
        <CardFooter className="pt-6">
          <Button 
            onClick={() => handleFinalSubmit(false)}
            disabled={!allQuestionsAnswered || isSubmitting || timerExpired}
            size="lg"
            className="w-full"
          >
            {isSubmitting ? 'Submitting Quiz...' : 
             timerExpired ? 'Time Expired - Auto Submitted' :
             `Submit All Answers (${Object.keys(answers).length}/${questions.length})`}
          </Button>
        </CardFooter>
      </Card>

      {!allQuestionsAnswered && !timerExpired && (
        <div className="text-center text-sm text-gray-500">
          Please answer all questions before submitting.
        </div>
      )}
    </div>
  )
} 