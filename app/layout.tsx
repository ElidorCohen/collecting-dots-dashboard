import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import { ClerkProvider } from '@clerk/nextjs'
import { ClerkApiProvider } from '@/lib/providers/clerk-api-provider'
import { ThemeProvider } from '@/lib/providers/theme-provider'
import { RoleProvider } from '@/lib/providers/role-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const display = localFont({ src: '../public/fonts/BNBobbieSans.otf', variable: '--font-display' })

export const viewport: Viewport = {
  themeColor: '#0a0b0a',
  viewportFit: 'cover',
}

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
        <body className={`${inter.variable} ${mono.variable} ${display.variable}`}>
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
