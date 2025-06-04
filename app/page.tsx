'use client'

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, loading } = useAuth();
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Sample trivia question - will be dynamic later
  const currentQuestion = {
    id: 1,
    question: "What is the capital of France?",
    correctAnswer: "Paris",
    points: 10
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setFeedback({type: 'error', message: 'Please log in to submit answers'});
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    
    try {
      const isCorrect = answer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase();
      const pointsEarned = isCorrect ? currentQuestion.points : 0;

      // Log user input for testing (Task 4.1 requirement)
      console.log('User answer submitted:', answer);
      console.log('Question ID:', currentQuestion.id);
      console.log('Correct answer:', currentQuestion.correctAnswer);
      console.log('Is correct:', isCorrect);
      console.log('Points earned:', pointsEarned);

      // Store answer + score to Supabase (Task 4.2)
      const { data, error } = await supabase
        .from('scores')
        .upsert({
          user_id: user.id,
          user_name: user.email || 'Unknown',
          score: pointsEarned, // This will be cumulative in a real app
          games_played: 1, // This will be incremented in a real app
          games_won: isCorrect ? 1 : 0, // This will be incremented in a real app
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        setFeedback({type: 'error', message: `Database error: ${error.message}`});
        return;
      }

      console.log('✅ Successfully saved to database:', data);

      // Show feedback to user
      if (isCorrect) {
        setFeedback({
          type: 'success', 
          message: `🎉 Correct! You earned ${pointsEarned} points. Answer saved to database.`
        });
      } else {
        setFeedback({
          type: 'error', 
          message: `❌ Incorrect. The correct answer is "${currentQuestion.correctAnswer}". Answer saved to database.`
        });
      }

      setSubmittedAnswer(answer);
      setAnswer('');

    } catch (err) {
      console.error('Submission error:', err);
      setFeedback({
        type: 'error', 
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-4xl mx-auto">
        {/* Auth Status */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          {user ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 font-medium">✅ Logged in as:</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500">ID: {user.id}</p>
              </div>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-gray-600">Not logged in</p>
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Trivia Section - Only show if logged in */}
        {user ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
              🧠 Trivia Challenge
            </h1>
            
            <div className="max-w-2xl mx-auto">
              {/* Question */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  Question {currentQuestion.id}:
                </h2>
                <p className="text-lg text-gray-700 bg-blue-50 p-4 rounded-lg">
                  {currentQuestion.question}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Worth {currentQuestion.points} points
                </p>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`mb-4 p-4 rounded-lg ${
                  feedback.type === 'success' 
                    ? 'bg-green-100 border border-green-400 text-green-700'
                    : 'bg-red-100 border border-red-400 text-red-700'
                }`}>
                  {feedback.message}
                </div>
              )}

              {/* Answer Form */}
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div>
                  <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer:
                  </label>
                  <input
                    id="answer"
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your answer here..."
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!answer.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </form>

              {/* Show submitted answer for testing */}
              {submittedAnswer && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Last submitted:</strong> "{submittedAnswer}"
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Check the browser console for detailed logs and database confirmation
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🧠 Welcome to Trivia Challenge
            </h1>
            <p className="text-gray-600 mb-6">
              Please sign in to start playing trivia questions!
            </p>
            <Link href="/login">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        )}

        {/* Footer Info */}
        <footer className="text-center text-sm text-gray-500 mt-12">
          <p>Built with Next.js, Supabase, and Tailwind CSS</p>
        </footer>
      </div>
    </div>
  );
}
