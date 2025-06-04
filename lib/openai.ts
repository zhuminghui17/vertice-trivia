import OpenAI from 'openai'

// Initialize OpenAI client with better error handling
let openai: OpenAI | null = null

try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not found in environment variables')
  } else {
    console.log('✅ Initializing OpenAI client...')
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    console.log('✅ OpenAI client initialized successfully')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error)
}

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctAnswer: string
  category: string
}

export async function generateDailyQuestions(): Promise<GeneratedQuestion[]> {
  // Check if OpenAI client is available
  if (!openai) {
    throw new Error('OpenAI client not initialized - check API key')
  }

  console.log('🤖 Starting OpenAI question generation...')

  try {
    const prompt = `Generate 5 multiple choice medium-difficulty trivia questions for a daily quiz. Each question should:
    
1. Be from a different category (Geography, Technology, History, Science, Sports, Entertainment, etc.)
2. Have exactly 4 answer options
3. Be moderate difficulty - not too easy, not too hard
4. Have clear, unambiguous correct answers
5. Be appropriate for a general audience

Format your response as a JSON array with this exact structure:
[
  {
    "question": "What is the capital of Japan?",
    "options": ["Tokyo", "Kyoto", "Osaka", "Hiroshima"],
    "correctAnswer": "Tokyo",
    "category": "Geography"
  }
]

Make sure the JSON is valid and each question is unique and interesting.`

    console.log('📡 Sending request to OpenAI...')
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a trivia question generator. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8, // Add some creativity
      max_tokens: 2000,
    })

    console.log('✅ Received response from OpenAI')

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    console.log('📝 Parsing OpenAI response...')
    
    // Parse the JSON response
    const questions = JSON.parse(content)
    
    // Validate each question
    const validatedQuestions: GeneratedQuestion[] = questions.map((q: any, index: number) => {
      if (!q.question || !q.options || !q.correctAnswer || !q.category) {
        throw new Error(`Invalid question format at index ${index}`)
      }
      
      if (q.options.length !== 4) {
        throw new Error(`Question ${index} must have exactly 4 options`)
      }
      
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(`Question ${index} correct answer not found in options`)
      }
      
      return {
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category
      }
    })

    if (validatedQuestions.length !== 5) {
      throw new Error('Must generate exactly 5 questions')
    }

    console.log('✅ Successfully generated and validated 5 questions')
    return validatedQuestions

  } catch (error) {
    console.error('❌ Error in generateDailyQuestions:', error)
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 