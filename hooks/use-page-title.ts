import { usePathname } from 'next/navigation'
import { CalendarDays, BarChart, User, Home } from 'lucide-react'

export const usePageTitle = () => {
  const pathname = usePathname()

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return {
          title: "Today's Trivia",
          description: "Test your knowledge and compete with others!",
          icon: CalendarDays
        }
      case '/leaderboard':
        return {
          title: 'Leaderboard', 
          description: 'See how you rank against other players',
          icon: BarChart
        }
      case '/games':
        return {
          title: 'My Games',
          description: 'Your game history',
          icon: User
        }
      case '/questions':
        return {
          title: 'Question Bank',
          description: 'Browse past questions', 
          icon: Home
        }
      default:
        return {
          title: 'Vertice Trivia',
          description: 'Trivia game for Vertice AI',
          icon: CalendarDays
        }
    }
  }

  return getPageTitle()
} 