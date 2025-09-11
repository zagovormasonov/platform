import { ReactNode } from 'react'
import { Navigation } from './Navigation'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="pb-4 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
