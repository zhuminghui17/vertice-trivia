import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface UserResponse {
  questionId: string
  userAnswer: string
}

export async function POST(request: NextRequest) {
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

    const { sessionId, responses, timeTaken, autoSubmit } = await request.json()

    if (!sessionId || !responses || !Array.isArray(responses)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 })
    }

    // Check if session exists and get question details
    const { data: session, error: sessionError } = await supabase
      .from('trivia_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({
        success: false,
        error: 'Session not found'
      }, { status: 404 })
    }

    // Get all questions for this session
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .in('id', session.question_ids)

    if (questionsError || !questions) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch questions'
      }, { status: 500 })
    }

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map(q => [q.id, q]))

    // Process each response and calculate score
    let correctAnswers = 0
    let totalScore = 0
    const userResponses: any[] = []
    const feedback: any[] = []

    for (const response of responses as UserResponse[]) {
      const question = questionMap.get(response.questionId)
      if (!question) continue

      const isCorrect = response.userAnswer === question.correct_answer
      if (isCorrect) {
        correctAnswers++
        totalScore++
      }

      userResponses.push({
        user_id: user.id,
        session_id: sessionId,
        question_id: response.questionId,
        user_answer: response.userAnswer,
        is_correct: isCorrect
      })

      feedback.push({
        questionId: response.questionId,
        isCorrect,
        correctAnswer: question.correct_answer
      })
    }

    // Insert user responses
    const { error: responsesError } = await supabase
      .from('user_responses')
      .upsert(userResponses, { 
        onConflict: 'user_id,session_id,question_id' 
      })

    if (responsesError) {
      throw new Error(`Failed to save responses: ${responsesError.message}`)
    }

    // Create or update user session participation
    const { error: participationError } = await supabase
      .from('user_session_participations')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        status: 'completed',
        score: totalScore,
        total_questions: questions.length,
        correct_answers: correctAnswers,
        time_taken: timeTaken,
        completed_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,session_id' 
      })

    if (participationError) {
      throw new Error(`Failed to save participation: ${participationError.message}`)
    }

    // Update overall user scores table (for leaderboard compatibility)
    const { error: scoresError } = await supabase
      .from('scores')
      .upsert({
        user_id: user.id,
        user_name: user.email || 'Unknown',
        score: totalScore,
        games_played: 1,
        games_won: correctAnswers === questions.length ? 1 : 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (scoresError) {
      console.error('Failed to update scores table:', scoresError)
      // Don't fail the whole operation for this
    }

    // Update session statistics and determine winners
    await updateSessionStatistics(sessionId)

    async function updateSessionStatistics(sessionId: string) {
      try {
        // Get all completed participations for this session
        const { data: allParticipations, error: participationsError } = await supabase
          .from('user_session_participations')
          .select('user_id, score')
          .eq('session_id', sessionId)
          .eq('status', 'completed')

        if (participationsError || !allParticipations) {
          console.error('Failed to fetch session participations:', participationsError)
          return
        }

        // Calculate session statistics
        const totalParticipants = allParticipations.length
        const highestScore = Math.max(...allParticipations.map(p => p.score), 0)
        const winnerUserIds = allParticipations
          .filter(p => p.score === highestScore)
          .map(p => p.user_id)

        // Update the session with statistics
        const { error: sessionUpdateError } = await supabase
          .from('trivia_sessions')
          .update({
            total_participants: totalParticipants,
            highest_score: highestScore,
            winner_user_ids: winnerUserIds,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (sessionUpdateError) {
          console.error('Failed to update session statistics:', sessionUpdateError)
        } else {
          console.log(`✅ Updated session ${sessionId} with ${totalParticipants} participants, highest score: ${highestScore}`)
        }
      } catch (error) {
        console.error('Error updating session statistics:', error)
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        score: totalScore,
        correctAnswers,
        totalQuestions: questions.length,
        feedback,
        timeExpired: autoSubmit,
        timeTaken
      }
    })

  } catch (error) {
    console.error('Error submitting responses:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 