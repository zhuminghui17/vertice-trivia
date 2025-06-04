import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('date', today)
      .order('generated_at', { ascending: true })
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No questions found for today. Generate new questions first.' 
      }, { status: 404 })
    }
    
    // Parse the options JSON for each question
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correctAnswer: q.correct_answer,
      category: q.category,
      date: q.date
    }))
    
    return NextResponse.json({ 
      success: true, 
      questions: formattedQuestions,
      count: formattedQuestions.length
    })
    
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 