import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // First, check if there's a trivia session for today
    const { data: session, error: sessionError } = await supabase
      .from('trivia_sessions')
      .select('*')
      .eq('date', today)
      .single()

    if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Database error: ${sessionError.message}`)
    }

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'No trivia session found for today. Generate new questions first.' 
      }, { status: 404 })
    }

    // Get the questions for this session
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', session.question_ids)
      .order('generated_at', { ascending: true })
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No questions found for today\'s session.' 
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
      session: {
        id: session.id,
        date: session.date,
        status: session.status,
        sessionType: session.session_type,
        category: session.category,
        timerDuration: session.timer_duration
      },
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