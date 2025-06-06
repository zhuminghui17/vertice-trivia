'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QuestionBankDataTable } from '@/components/question-bank-data-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Question } from '@/types/question'

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuestions() {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('generated_at', { ascending: false })

        if (error) {
          setError(error.message)
          console.error('Error fetching questions:', error)
        } else {
          setQuestions(data || [])
          console.log('✅ Questions data fetched:', data)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error fetching questions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
            <span className="text-gray-600">Loading questions...</span>
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

      {/* Questions Content */}
      {!loading && !error && (
        <Card>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg mb-4">
                  No questions found in the database.
                </p>
              </div>
            ) : (
              <QuestionBankDataTable data={questions} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 