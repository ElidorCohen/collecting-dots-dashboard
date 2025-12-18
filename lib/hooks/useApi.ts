import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClientError, apiUtils } from '../services'

/**
 * Hook state interface
 */
interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  statusCode?: number
}

/**
 * Hook options
 */
interface UseApiOptions {
  onSuccess?: (data: any) => void
  onError?: (error: ApiClientError | Error) => void
  showErrorToast?: boolean
  redirectOnAuth?: boolean // Whether to redirect to sign-in on 401 errors
}

/**
 * Custom hook for API calls with loading states and error handling
 */
export function useApi<T = any>(options: UseApiOptions = {}) {
  const router = useRouter()
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async <R = T>(apiCall: () => Promise<{ data: R }>): Promise<R> => {
      console.log('🚀 USE_API: execute called')
      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        console.log('📞 USE_API: Calling API function...')
        const response = await apiCall()
        console.log('✅ USE_API: API call successful', response)
        const data = response.data

        setState({
          data: data as unknown as T,
          loading: false,
          error: null,
        })

        options.onSuccess?.(data)
        return data
      } catch (error) {
        console.error('❌ USE_API: API call failed', error)
        const errorInfo = apiUtils.formatApiError(error)
        console.error('  Formatted error:', errorInfo)
        
        setState({
          data: null,
          loading: false,
          error: errorInfo.message,
          statusCode: apiUtils.isApiError(error) ? error.statusCode : undefined,
        })

        // Handle 401 authentication errors
        if (apiUtils.isApiError(error) && error.statusCode === 401) {
          if (options.redirectOnAuth !== false) { // Default to true unless explicitly set to false
            console.log('Authentication required, redirecting to sign-in...')
            router.push('/sign-in')
            return Promise.reject(error) // Still reject so calling code can handle it
          }
        }

        options.onError?.(error as ApiClientError | Error)
        
        // Optionally show toast notification
        if (options.showErrorToast && typeof window !== 'undefined') {
          // You can integrate with your toast library here
          console.error('API Error:', errorInfo.message)
        }

        throw error
      }
    },
    [options, router]
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
    isError: !!state.error,
    isSuccess: !state.loading && !state.error && state.data !== null,
    isAuthError: !!state.error && state.statusCode === 401,
  }
}

/**
 * Hook specifically for demo operations
 */
export function useDemoApi(options: UseApiOptions = {}) {
  return useApi(options)
}

/**
 * Hook specifically for authentication operations
 */
export function useAuthApi(options: UseApiOptions = {}) {
  return useApi({ ...options, redirectOnAuth: false }) // Don't redirect on auth API errors
}