'use client'

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TriviaInterface } from "@/components/trivia-interface"

export default function Home() {
  const { user, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {user ? (
        <TriviaInterface user={user} isAdmin={isAdmin} />
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Trivia Challenge!
            </h2>
            <p className="text-gray-600 mb-6">
              Sign in to start playing trivia questions and compete for the top spot on the leaderboard.
            </p>
            <Link href="/login">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
