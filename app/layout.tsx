import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ClerkApiProvider } from '@/lib/providers/clerk-api-provider'
import { ThemeProvider } from '@/lib/providers/theme-provider'
import { RoleProvider } from '@/lib/providers/role-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Demo Submission Dashboard',
  description: 'A professional dashboard for managing music demo submissions with role-based access for label assistants and owners.',
  keywords: ['music', 'demo', 'submission', 'dashboard', 'label'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider defaultTheme="system" storageKey="dashboard-theme">
            <RoleProvider defaultRole="assistant">
              <ClerkApiProvider>
                {children}
              </ClerkApiProvider>
            </RoleProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
