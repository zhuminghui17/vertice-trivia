import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get auth token
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Invalid session' 
      }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    // Check if there's an active session for today
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
        success: true,
        hasSession: false,
        message: 'No trivia session exists for today'
      })
    }

    // Check if user has participated in today's session
    const { data: participation, error: participationError } = await supabase
      .from('user_session_participations')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_id', session.id)
      .single()

    if (participationError && participationError.code !== 'PGRST116') {
      throw new Error(`Database error: ${participationError.message}`)
    }

    if (!participation) {
      return NextResponse.json({
        success: true,
        hasSession: true,
        hasParticipated: false,
        session: {
          id: session.id,
          date: session.date,
          status: session.status,
          sessionType: session.session_type,
          category: session.category,
          timerDuration: session.timer_duration
        }
      })
    }

    // User has participated - get their detailed results
    if (participation.status === 'completed') {
      // Get the user's responses with question details
      const { data: responses, error: responsesError } = await supabase
        .from('user_responses')
        .select(`
          *,
          questions (
            id,
            question,
            options,
            correct_answer,
            category
          )
        `)
        .eq('user_id', user.id)
        .eq('session_id', session.id)

      if (responsesError) {
        throw new Error(`Database error: ${responsesError.message}`)
      }

      // Format the results
      const formattedResults = {
        participation,
        responses: responses?.map(r => ({
          questionId: r.question_id,
          question: r.questions.question,
          category: r.questions.category,
          options: typeof r.questions.options === 'string' ? JSON.parse(r.questions.options) : r.questions.options,
          userAnswer: r.user_answer,
          correctAnswer: r.questions.correct_answer,
          isCorrect: r.is_correct,
          answeredAt: r.answered_at
        })) || []
      }

      return NextResponse.json({
        success: true,
        hasSession: true,
        hasParticipated: true,
        isCompleted: true,
        results: formattedResults
      })
    }

    // User started but hasn't completed - they can continue or resume
    return NextResponse.json({
      success: true,
      hasSession: true,
      hasParticipated: true,
      isCompleted: false,
      participation
    })

  } catch (error) {
    console.error('Error checking user session status:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 