'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { apiClient } from '@/lib/services/api-client'

interface ClerkApiProviderProps {
  children: React.ReactNode
}

/**
 * Provider component that initializes the API client with Clerk authentication
 * This component should be placed high in the component tree to ensure
 * the API client has access to authentication tokens for all requests
 */
export function ClerkApiProvider({ children }: ClerkApiProviderProps) {
  const { getToken, isLoaded } = useAuth()

  useEffect(() => {
    // Only set up the token function once Clerk is loaded
    if (isLoaded) {
      // Set up the API client to use Clerk's getToken function
      apiClient.setGetTokenFunction(async () => {
        try {
          // Get the Clerk session token
          const token = await getToken()
          return token
        } catch (error) {
          console.error('Failed to get Clerk token:', error)
          return null
        }
      })
    }
  }, [getToken, isLoaded])

  return <>{children}</>
}