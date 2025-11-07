import { apiClient } from './api-client'
import { ApiResponse } from './types'

/**
 * User and authentication related types
 */
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'admin' | 'assistant'
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
  permissions?: string[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface LoginRequest {
  email: string
  password?: string
  provider?: 'clerk' | 'google' | 'email'
  clerkToken?: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface UserUpdateRequest {
  firstName?: string
  lastName?: string
  email?: string
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
}

/**
 * Authentication API Service
 * Handles user authentication and profile management
 */
export class AuthService {
  private readonly endpoint = '/auth'

  /**
   * Login with email/password or external provider
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<LoginResponse>(`${this.endpoint}/login`, credentials)
  }

  /**
   * Login with Clerk token (for your current setup)
   */
  async loginWithClerk(clerkToken: string): Promise<ApiResponse<LoginResponse>> {
    return apiClient.post<LoginResponse>(`${this.endpoint}/clerk-login`, {
      clerkToken,
      provider: 'clerk'
    })
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return apiClient.post<AuthTokens>(`${this.endpoint}/refresh`, {
      refreshToken
    })
  }

  /**
   * Logout (invalidate tokens)
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.endpoint}/logout`)
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>(`${this.endpoint}/me`)
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UserUpdateRequest): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`${this.endpoint}/me`, updates)
  }

  /**
   * Change password
   */
  async changePassword(passwords: PasswordChangeRequest): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.endpoint}/change-password`, passwords)
  }

  /**
   * Validate email for whitelist
   */
  async validateEmail(email: string): Promise<ApiResponse<{ isAllowed: boolean; role?: 'admin' | 'assistant' }>> {
    return apiClient.post<{ isAllowed: boolean; role?: 'admin' | 'assistant' }>(`${this.endpoint}/validate-email`, {
      email
    })
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.endpoint}/permissions`)
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<ApiResponse<{ hasPermission: boolean }>> {
    return apiClient.get<{ hasPermission: boolean }>(`${this.endpoint}/permissions/${permission}`)
  }
}

// Export singleton instance
export const authService = new AuthService()