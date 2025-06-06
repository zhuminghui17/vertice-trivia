export interface Question {
  id: string
  date: string
  question: string
  options: string[]
  correct_answer: string
  category: string
  generated_at: string
}

export interface QuestionWithAnswerCount extends Question {
  // Additional fields for question analytics
  times_answered?: number
  correct_answers?: number
  accuracy_rate?: number
} 