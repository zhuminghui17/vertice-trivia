'use client'

import * as React from "react"
import { User, ChevronUp, LogOut, Home, Shield, CalendarDays, BarChart } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { signOut } from "@/lib/auth"

// Menu items for navigation
const items = [
  {
    title: "Today's Trivia",
    url: "/",
    icon: CalendarDays,
    description: "Play trivia questions"
  },
  {
    title: "Leaderboard",
    url: "/leaderboard", 
    icon: BarChart,
    description: "View top players"
  },
]

// Future items to be added
const comingSoonItems = [
  {
    title: "My Games",
    url: "#",
    icon: User,
    description: "Your game history"
  },
  {
    title: "Question Bank",
    url: "#", 
    icon: Home,
    description: "Browse past questions"
  },
]

export function AppSidebar() {
  const { user, isAdmin } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {/* <Brain className="size-4" /> // use vertice logo */}
                  <Image src="/vertice-log.png" alt="Vertice Logo" width={32} height={32} className="rounded" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Vertice Trivia</span>
                  <span className="truncate text-xs">Trivia game for Vertice AI</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.description}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Coming Soon Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {comingSoonItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    disabled
                    tooltip={`${item.description} (Coming Soon)`}
                  >
                    <item.icon className="opacity-50" />
                    <span className="opacity-50">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {isAdmin ? <Shield className="size-4 text-purple-600" /> : <User className="size-4" />}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold flex items-center gap-2">
                      {user ? 'Signed In' : 'Guest'}
                      {isAdmin && <Badge variant="secondary" className="text-xs ml-2 bg-purple-100 text-purple-800">Admin</Badge>}
                    </span>
                    <span className="truncate text-xs">
                      {user ? user.email : 'Sign in to play'}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                {user ? (
                  <>
                    <DropdownMenuItem disabled>
                      <User className="mr-2 size-4" />
                      Profile Settings
                      <span className="ml-auto text-xs opacity-60">Soon</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 size-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/login">
                      <User className="mr-2 size-4" />
                      Sign In
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
} 