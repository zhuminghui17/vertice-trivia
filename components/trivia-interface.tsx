'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

// Types for our trivia system
interface TriviaQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: string
  category: string
  points: number
}

// 5 questions from different categories
const triviaQuestions: TriviaQuestion[] = [
  {
    id: 1,
    question: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Perth"],
    correctAnswer: "Canberra",
    category: "Geography",
    points: 20
  },
  {
    id: 2,
    question: "Which company developed the React JavaScript library?",
    options: ["Google", "Facebook/Meta", "Microsoft", "Apple"],
    correctAnswer: "Facebook/Meta",
    category: "Technology",
    points: 20
  },
  {
    id: 3,
    question: "In which year did World War II end?",
    options: ["1944", "1945", "1946", "1947"],
    correctAnswer: "1945",
    category: "History",
    points: 20
  },
  {
    id: 4,
    question: "What is the chemical symbol for Gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: "Au",
    category: "Science",
    points: 20
  },
  {
    id: 5,
    question: "Which planet is known as the 'Red Planet'?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    correctAnswer: "Mars",
    category: "Astronomy",
    points: 20
  }
]

interface TriviaInterfaceProps {
  user: any
}

export function TriviaInterface({ user }: TriviaInterfaceProps) {
  const [answers, setAnswers] = useState<{[key: number]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [results, setResults] = useState<{
    score: number
    correctAnswers: number
    feedback: {questionId: number, isCorrect: boolean, correctAnswer: string}[]
  } | null>(null)

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleFinalSubmit = async () => {
    if (Object.keys(answers).length !== triviaQuestions.length || !user) return

    setIsSubmitting(true)

    try {
      let totalScore = 0
      let correctCount = 0
      const feedback = []

      // Calculate score and prepare feedback
      for (const question of triviaQuestions) {
        const userAnswer = answers[question.id]
        const isCorrect = userAnswer === question.correctAnswer
        
        if (isCorrect) {
          totalScore += question.points
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
          games_won: correctCount === triviaQuestions.length ? 1 : 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      // Set results and mark as complete
      setResults({
        score: totalScore,
        correctAnswers: correctCount,
        feedback
      })
      setIsComplete(true)

    } catch (err) {
      console.error('Error submitting trivia:', err)
      alert('Error saving your answers. Please try again.')
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
      'Astronomy': 'bg-indigo-100 text-indigo-800'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (isComplete && results) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Results Summary */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🎉 Quiz Complete!</CardTitle>
            <CardDescription className="text-lg">
              You scored <strong>{results.score}</strong> points ({results.correctAnswers}/{triviaQuestions.length} correct)
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Detailed Results */}
        <div className="grid gap-4">
          {triviaQuestions.map((question, index) => {
            const userAnswer = answers[question.id]
            const feedback = results.feedback.find(f => f.questionId === question.id)
            const isCorrect = feedback?.isCorrect || false

            return (
              <Card key={question.id} className={`border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={getCategoryColor(question.category)}>
                      {question.category}
                    </Badge>
                    <div className="text-right">
                      {isCorrect ? (
                        <span className="text-green-600 font-semibold">✓ Correct (+{question.points} pts)</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Incorrect</span>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Your answer:</strong> <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer}</span></p>
                    {!isCorrect && (
                      <p><strong>Correct answer:</strong> <span className="text-green-600">{question.correctAnswer}</span></p>
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

  const allQuestionsAnswered = Object.keys(answers).length === triviaQuestions.length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome, {user.email}!</CardTitle>
          <CardDescription>
            Answer all 5 questions below, then submit to see your results. Each correct answer is worth 20 points.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
        <span className="text-sm font-medium text-blue-800">
          Progress: {Object.keys(answers).length}/{triviaQuestions.length} questions answered
        </span>
        <div className="text-sm text-blue-600">
          Potential Score: {triviaQuestions.length * 20} points
        </div>
      </div>

      {/* All Questions */}
      <div className="grid gap-6">
        {triviaQuestions.map((question, index) => (
          <Card key={question.id} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className={getCategoryColor(question.category)}>
                  {question.category}
                </Badge>
                <span className="text-sm text-gray-500">Question {index + 1}/5</span>
              </div>
              <CardTitle className="text-xl">{question.question}</CardTitle>
              <CardDescription>
                Select your answer. Worth {question.points} points.
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
                    disabled={isSubmitting}
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
            onClick={handleFinalSubmit}
            disabled={!allQuestionsAnswered || isSubmitting}
            size="lg"
            className="w-full"
          >
            {isSubmitting ? 'Submitting Quiz...' : `Submit All Answers (${Object.keys(answers).length}/${triviaQuestions.length})`}
          </Button>
        </CardFooter>
      </Card>

      {!allQuestionsAnswered && (
        <div className="text-center text-sm text-gray-500">
          Please answer all questions before submitting.
        </div>
      )}
    </div>
  )
} 