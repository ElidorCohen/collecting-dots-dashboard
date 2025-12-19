import { ApiClientError } from './api-client'

// Export main API client
export { apiClient, ApiClient, ApiClientError } from './api-client'

// Export types
export type * from './types'

// Export services
export { demoService, DemoService } from './demo-service'
export { authService, AuthService } from './auth-service'
export { EmailService, getEmailService } from './email'

// Export email templates for customization
export {
  getDemoLikedEmail,
  getDemoRejectedEmail,
  getDemoApprovedEmail,
} from './email-templates'

// Export demo-specific types for convenience
export type {
  Demo,
  DemoStatus,
  DemoCreateRequest,
  DemoUpdateRequest,
  DemoFilterParams,
  DemoCounts,
  DashboardData,
  DemosApiResponse
} from './demo-service'

// Export auth-specific types for convenience
export type {
  User,
  AuthTokens,
  LoginRequest,
  LoginResponse,
  UserUpdateRequest,
  PasswordChangeRequest
} from './auth-service'

// Utility functions for common operations
export const apiUtils = {
  /**
   * Build query string from object
   */
  buildQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v.toString()))
        } else {
          searchParams.append(key, value.toString())
        }
      }
    })
    
    return searchParams.toString()
  },

  /**
   * Check if error is an API error
   */
  isApiError: (error: any): error is ApiClientError => {
    return error && error.isApiError === true
  },

  /**
   * Get error message from API error or generic error
   */
  getErrorMessage: (error: any): string => {
    if (apiUtils.isApiError(error)) {
      return error.message
    }
    
    if (error instanceof Error) {
      return error.message
    }
    
    return 'An unknown error occurred'
  },

  /**
   * Format API error for display
   */
  formatApiError: (error: any): { message: string; statusCode?: number; details?: any } => {
    if (apiUtils.isApiError(error)) {
      return {
        message: error.message,
        statusCode: error.statusCode,
        details: error.response
      }
    }

    return {
      message: apiUtils.getErrorMessage(error)
    }
  }
}