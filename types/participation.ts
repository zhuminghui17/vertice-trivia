export interface UserSessionParticipation {
  id: string
  user_id: string
  session_id: string
  status: 'started' | 'completed' | 'abandoned'
  score: number
  total_questions: number
  correct_answers: number
  time_taken?: number // in seconds
  started_at: string
  completed_at?: string
} 