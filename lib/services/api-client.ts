import type { ApiResponse, ApiError, RequestConfig } from '@/lib/services/types'

/**
 * API Configuration
 * These values should be set via environment variables
 */
const API_CONFIG = {
  // Base URL for the Python Flask backend, fallback to local Next.js API
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  
  // API version (if versioned endpoints are used)
  VERSION: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
  
  // Default timeout for requests (in milliseconds)
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  
  // API Key placeholder (to be injected later)
  API_KEY: process.env.NEXT_PUBLIC_API_KEY || '',
}

/**
 * Custom API Error class for better error handling
 */
export class ApiClientError extends Error {
  public statusCode: number
  public response?: any
  public isApiError = true

  constructor(message: string, statusCode: number, response?: any) {
    super(message)
    this.name = 'ApiClientError'
    this.statusCode = statusCode
    this.response = response
  }
}

/**
 * Main API Client class
 * Handles all HTTP requests with consistent configuration and error handling
 */
export class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>
  private timeout: number
  private getTokenFunction?: () => Promise<string | null>

  constructor() {
    // Use BASE_URL directly without appending version
    this.baseURL = API_CONFIG.BASE_URL
    this.timeout = API_CONFIG.TIMEOUT
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    // Add API key to headers if available
    if (API_CONFIG.API_KEY) {
      this.defaultHeaders['X-API-Key'] = API_CONFIG.API_KEY
    }
  }

  /**
   * Set the Clerk getToken function for authentication
   * This should be called from components that have access to Clerk's useAuth hook
   */
  public setGetTokenFunction(getTokenFn: () => Promise<string | null>) {
    this.getTokenFunction = getTokenFn
  }

  /**
   * Get authentication headers
   * Now uses Clerk tokens instead of localStorage
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.getTokenFunction) {
      try {
        const token = await this.getTokenFunction()
        if (token) {
          return {
            'Authorization': `Bearer ${token}`
          }
        }
      } catch (error) {
        console.error('Failed to get Clerk token:', error)
        // Don't throw here, just continue without auth headers
      }
    }
    return {}
  }

  /**
   * Build complete headers for requests
   */
  private async buildHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const authHeaders = await this.getAuthHeaders()
    return {
      ...this.defaultHeaders,
      ...authHeaders,
      ...customHeaders,
    }
  }

  /**
   * Handle API responses and errors
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    let data: any
    try {
      data = isJson ? await response.json() : await response.text()
    } catch (error) {
      throw new ApiClientError(
        'Failed to parse response',
        response.status,
        { parseError: error }
      )
    }

    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401) {
        // This could trigger a redirect to sign-in in the UI
        const errorMessage = 'Authentication required. Please sign in.'
        throw new ApiClientError(errorMessage, response.status, data)
      }

      const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new ApiClientError(errorMessage, response.status, data)
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    }
  }

  /**
   * Make HTTP requests with timeout and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      headers: customHeaders,
      timeout = this.timeout,
      ...fetchOptions
    } = config

    const url = `${this.baseURL}${endpoint}`
    const headers = await this.buildHeaders(customHeaders)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        ...fetchOptions,
      })

      clearTimeout(timeoutId)
      return await this.handleResponse<T>(response)
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ApiClientError) {
        throw error
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiClientError('Request timeout', 408)
        }
        throw new ApiClientError(`Network error: ${error.message}`, 0)
      }

      throw new ApiClientError('Unknown error occurred', 0)
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    // Add detailed logging for POST requests
    console.log('🌐 API CLIENT POST REQUEST:')
    console.log('  📍 Endpoint:', endpoint)
    console.log('  🏠 Base URL:', this.baseURL)
    console.log('  🔗 Full URL:', `${this.baseURL}${endpoint}`)
    console.log('  📦 Request Body:', JSON.stringify(body, null, 2))
    console.log('  ⚙️ Config:', config)
    
    const result = await this.makeRequest<T>(endpoint, { ...config, method: 'POST', body })
    
    console.log('📨 API CLIENT POST RESPONSE:', result)
    return result
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PUT', body })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'PATCH', body })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...config, method: 'DELETE' })
  }

  /**
   * Upload file(s) with multipart/form-data
   */
  async upload<T>(
    endpoint: string,
    formData: FormData,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    const authHeaders = await this.getAuthHeaders()
    const uploadConfig = {
      ...config,
      method: 'POST' as const,
      headers: {
        // Remove Content-Type to let browser set it with boundary for multipart
        ...authHeaders,
        ...config?.headers,
      },
    }

    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: uploadConfig.method,
        headers: uploadConfig.headers,
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return await this.handleResponse<T>(response)
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof ApiClientError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiClientError('Upload timeout', 408)
        }
        throw new ApiClientError(`Upload error: ${error.message}`, 0)
      }
      
      throw new ApiClientError('Unknown upload error occurred', 0)
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get('/health')
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export for testing or custom instances
export default ApiClient

/**
 * Utility functions for handling API errors
 */
export const apiUtils = {
  /**
   * Check if an error is an API client error
   */
  isApiError(error: unknown): error is ApiClientError {
    return error instanceof ApiClientError
  },

  /**
   * Get a user-friendly error message from any error
   */
  getErrorMessage(error: unknown): string {
    if (this.isApiError(error)) {
      return error.message
    }
    if (error instanceof Error) {
      return error.message
    }
    return 'An unexpected error occurred'
  },

  /**
   * Format error for display or logging
   */
  formatApiError(error: unknown): object {
    if (this.isApiError(error)) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        response: error.response,
        isApiError: true
      }
    }
    return {
      message: this.getErrorMessage(error),
      isApiError: false
    }
  }
}