import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateDailyQuestions } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    // Check if questions already exist for today
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    
    const { data: existingQuestions, error: checkError } = await supabase
      .from('questions')
      .select('id')
      .eq('date', today)
    
    if (checkError) {
      throw new Error(`Database error: ${checkError.message}`)
    }
    
    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Questions already generated for today' 
      }, { status: 400 })
    }

    // Check environment variables
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY
    
    if (!hasOpenAIKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Generate questions using OpenAI
    console.log('Generating questions with OpenAI...')
    const generatedQuestions = await generateDailyQuestions()
    
    // Save questions to database
    const questionsToInsert = generatedQuestions.map(q => ({
      date: today,
      question: q.question,
      options: JSON.stringify(q.options),
      correct_answer: q.correctAnswer,
      category: q.category
    }))
    
    const { data, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select()
    
    if (error) {
      throw new Error(`Failed to save questions: ${error.message}`)
    }
    
    console.log(`✅ Successfully saved ${data.length} questions for ${today}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Generated ${data.length} questions for today using AI`,
      questions: data
    })
    
  } catch (error) {
    console.error('❌ Error in generate-questions API:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 