'use client'

import { usePageTitle } from "@/hooks/use-page-title"

export function PageHeader() {
  const { title, description, icon: Icon } = usePageTitle()

  return (
    <div className="flex items-center gap-3">
      <Icon className="size-6 text-gray-700" />
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  )
} 