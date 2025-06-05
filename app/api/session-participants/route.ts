import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const date = searchParams.get('date') // Alternative: get by date

    if (!sessionId && !date) {
      return NextResponse.json({
        success: false,
        error: 'Either sessionId or date parameter is required'
      }, { status: 400 })
    }

    let sessionQuery = supabase.from('trivia_sessions').select('*')
    
    if (sessionId) {
      sessionQuery = sessionQuery.eq('id', sessionId)
    } else if (date) {
      sessionQuery = sessionQuery.eq('date', date)
    }

    const { data: session, error: sessionError } = await sessionQuery.single()

    if (sessionError) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }

    // Get all participants and their performance
    const { data: participants, error: participantsError } = await supabase
      .from('user_session_participations')
      .select(`
        *,
        user_responses (
          id,
          question_id,
          user_answer,
          is_correct,
          answered_at
        )
      `)
      .eq('session_id', session.id)
      .order('score', { ascending: false })
      .order('time_taken', { ascending: true }) // Secondary sort by time for ties

    if (participantsError) {
      throw new Error(`Failed to fetch participants: ${participantsError.message}`)
    }

    // Get user details for participants
    const userIds = participants?.map(p => p.user_id) || []
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Failed to fetch user details:', usersError)
    }

    // Create a map of user details
    const userMap = new Map()
    users?.forEach(user => {
      userMap.set(user.id, {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email
      })
    })

    // Format participants with user details and rank
    const formattedParticipants = participants?.map((participant, index) => {
      const user = userMap.get(participant.user_id)
      return {
        rank: index + 1,
        user: user || { id: participant.user_id, email: 'Unknown', name: 'Unknown User' },
        participation: {
          id: participant.id,
          status: participant.status,
          score: participant.score,
          totalQuestions: participant.total_questions,
          correctAnswers: participant.correct_answers,
          timeTaken: participant.time_taken,
          startedAt: participant.started_at,
          completedAt: participant.completed_at
        },
        responseCount: participant.user_responses?.length || 0
      }
    }) || []

    // Identify winners (highest score)
    const highestScore = formattedParticipants.length > 0 ? formattedParticipants[0].participation.score : 0
    const winners = formattedParticipants.filter(p => p.participation.score === highestScore)

    // Session statistics
    const stats = {
      totalParticipants: formattedParticipants.length,
      completedParticipants: formattedParticipants.filter(p => p.participation.status === 'completed').length,
      averageScore: formattedParticipants.length > 0 
        ? formattedParticipants.reduce((sum, p) => sum + p.participation.score, 0) / formattedParticipants.length 
        : 0,
      averageTime: formattedParticipants.length > 0 
        ? formattedParticipants
            .filter(p => p.participation.timeTaken)
            .reduce((sum, p) => sum + (p.participation.timeTaken || 0), 0) / 
          formattedParticipants.filter(p => p.participation.timeTaken).length
        : 0,
      highestScore,
      perfectScores: formattedParticipants.filter(p => 
        p.participation.score === p.participation.totalQuestions
      ).length
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        date: session.date,
        category: session.category,
        status: session.status,
        sessionType: session.session_type,
        timerDuration: session.timer_duration,
        questionCount: session.question_ids?.length || 0
      },
      participants: formattedParticipants,
      winners,
      statistics: stats
    })

  } catch (error) {
    console.error('Error fetching session participants:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 