'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

// Timer configuration (in seconds)
const QUIZ_TIMER_SECONDS = 60 // 1 minute - easily configurable

// Types for our trivia system
interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  category: string
}

interface TriviaInterfaceProps {
  user: any
  isAdmin?: boolean
}

export function TriviaInterface({ user, isAdmin = false }: TriviaInterfaceProps) {
  const [gameState, setGameState] = useState<'waiting' | 'loading' | 'playing' | 'complete'>('waiting')
  const [questions, setQuestions] = useState<TriviaQuestion[]>([])
  const [answers, setAnswers] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_TIMER_SECONDS)
  const [timerExpired, setTimerExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<{
    score: number
    correctAnswers: number
    feedback: {questionId: string, isCorrect: boolean, correctAnswer: string}[]
    timeExpired?: boolean
  } | null>(null)

  // Timer effect - only runs when playing
  useEffect(() => {
    if (gameState !== 'playing' || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
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

  const startTodaysTrivia = async () => {
    setGameState('loading')
    setError(null)
    
    try {
      // First, try to fetch today's questions
      const response = await fetch('/api/todays-questions')
      const data = await response.json()
      
      if (data.success) {
        // Questions exist, start the game
        setQuestions(data.questions)
        setGameState('playing')
        setTimeRemaining(QUIZ_TIMER_SECONDS)
        setTimerExpired(false)
        return
      }
      
      // No questions found, generate new ones
      console.log('No questions found, generating new ones...')
      
      // Get auth token for admin verification
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
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
      setGameState('playing')
      setTimeRemaining(QUIZ_TIMER_SECONDS)
      setTimerExpired(false)
      
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
    if (isSubmitting || gameState !== 'playing') return

    setIsSubmitting(true)
    setGameState('complete')

    try {
      let totalScore = 0
      let correctCount = 0
      const feedback = []

      // Calculate score and prepare feedback
      for (const question of questions) {
        const userAnswer = answers[question.id]
        const isCorrect = userAnswer === question.correctAnswer
        
        if (isCorrect) {
          totalScore += 1 // 1 point per correct answer
          correctCount += 1
        }

        feedback.push({
          questionId: question.id,
          isCorrect,
          correctAnswer: question.correctAnswer
        })
      }

      // Store final results in Supabase
      const { error } = await supabase
        .from('scores')
        .upsert({
          user_id: user.id,
          user_name: user.email || 'Unknown',
          score: totalScore,
          games_played: 1,
          games_won: correctCount === questions.length ? 1 : 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      // Set results
      setResults({
        score: totalScore,
        correctAnswers: correctCount,
        feedback,
        timeExpired: autoSubmit
      })

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

  // Waiting state - show start button
  if (gameState === 'waiting') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-md">
              Welcome, {user.email}!
              {isAdmin && <Badge className="ml-2 bg-purple-100 text-purple-800">Admin</Badge>}
            </CardTitle>
            <CardDescription>
              {isAdmin 
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
            <Button 
              onClick={startTodaysTrivia}
              size="lg"
              className="w-full"
            >
              🎯 {isAdmin ? 'Start/Generate Today\'s Trivia' : 'Start Today\'s Trivia'}
            </Button>
            {isAdmin && (
              <p className="text-sm text-gray-600 text-center mt-2">
                If no questions exist for today, this will automatically generate new ones using AI.
              </p>
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
              <p className="text-gray-600">Generating today's trivia questions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Results state
  if (gameState === 'complete' && results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Results Summary */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {results.timeExpired ? '⏰ Time Up!' : '🎉 Quiz Complete!'}
            </CardTitle>
            <CardDescription className="text-lg">
              You scored <strong>{results.score}</strong> points ({results.correctAnswers}/{questions.length} correct)
              {results.timeExpired && (
                <div className="mt-2 text-amber-600">
                  <strong>Note:</strong> Quiz was auto-submitted when time expired
                </div>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Detailed Results */}
        <div className="grid gap-4">
          {questions.map((question, index) => {
            const userAnswer = answers[question.id]
            const feedback = results.feedback.find(f => f.questionId === question.id)
            const isCorrect = feedback?.isCorrect || false
            const wasAnswered = userAnswer !== undefined

            return (
              <Card key={question.id} className={`border-2 ${
                !wasAnswered ? 'border-gray-200 bg-gray-50' :
                isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCategoryColor(question.category)}>
                      {question.category}
                    </Badge>
                    <div className="text-right">
                      {!wasAnswered ? (
                        <span className="text-gray-500 font-semibold">⏸ Not Answered</span>
                      ) : isCorrect ? (
                        <span className="text-green-600 font-semibold">✓ Correct (+1 pt)</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Incorrect</span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {wasAnswered ? (
                      <>
                        <p><strong>Your answer:</strong> <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer}</span></p>
                        {!isCorrect && (
                          <p><strong>Correct answer:</strong> <span className="text-green-600">{question.correctAnswer}</span></p>
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

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link href="/leaderboard">
            <Button size="lg">
              🏆 View Leaderboard
            </Button>
          </Link>
          <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
            🔄 Play Again
          </Button>
        </div>
      </div>
    )
  }

  // Playing state
  const allQuestionsAnswered = Object.keys(answers).length === questions.length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Timer */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-4">
            <div></div> {/* Spacer */}
            <div className="text-center">
              <CardTitle className="text-2xl">Today's Trivia</CardTitle>
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
      <div className="grid gap-6">
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