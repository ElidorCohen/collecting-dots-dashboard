import { apiClient } from './api-client'
import { ApiResponse, PaginatedResponse, QueryParams } from './types'

/**
 * Demo-related types (updated to match actual API response)
 */
export interface Demo {
  demo_id: string
  track_title: string
  artist_name: string
  shared_link: string
  submitted_at: string
  status: DemoStatus
  email: string
}

export type DemoStatus = 
  | "submitted" 
  | "liked"  // Keep for backward compatibility
  | "assistant_liked"  // New status from backend
  | "rejected_by_assistant" 
  | "rejected"  // New status from backend
  | "owner_liked"  // New status from backend
  | "approved" 
  | "rejected_by_admin"

export interface DemoCreateRequest {
  track_title: string
  artist_name: string
  shared_link: string
  email: string
}

export interface DemoUpdateRequest {
  track_title?: string
  artist_name?: string
  status?: DemoStatus
}

export interface DemoFilterParams {
  status?: DemoStatus | DemoStatus[]
  artist_name?: string
  track_title?: string
  dateFrom?: string
  dateTo?: string
  role?: 'admin' | 'assistant'
}

export interface DemoCounts {
  submitted: number
  liked: number
  rejected_by_assistant: number
  approved: number
  rejected_by_admin: number
}

export interface DashboardData {
  demos: Demo[]
  counts: DemoCounts
}

/**
 * API Response structure for demos endpoint
 */
export interface DemosApiResponse {
  count: number
  demos: Demo[]
  status: string
}

/**
 * Demo API Service
 * Handles all demo-related API operations
 */
export class DemoService {
  private readonly endpoint = '/demos'

  /**
   * Get all demos with optional filtering and pagination
   */
  async getDemos(params?: DemoFilterParams & QueryParams): Promise<ApiResponse<PaginatedResponse<Demo>>> {
    const queryParams = new URLSearchParams()
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v.toString()))
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })
    }

    const endpoint = queryParams.toString() 
      ? `${this.endpoint}?${queryParams.toString()}`
      : this.endpoint

    return apiClient.get<PaginatedResponse<Demo>>(endpoint)
  }

  /**
   * Get dashboard data (demos + counts) for a specific role
   */
  async getDashboardData(role: 'admin' | 'assistant', status?: string): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams()
    params.append('role', role)
    if (status && status !== 'all') {
      params.append('status', status)
    }

    return apiClient.get<DashboardData>(`${this.endpoint}/dashboard?${params.toString()}`)
  }

  /**
   * Get a specific demo by ID
   */
  async getDemo(id: string): Promise<ApiResponse<Demo>> {
    return apiClient.get<Demo>(`${this.endpoint}/${id}`)
  }

  /**
   * Create a new demo
   */
  async createDemo(demo: DemoCreateRequest): Promise<ApiResponse<Demo>> {
    return apiClient.post<Demo>(this.endpoint, demo)
  }

  /**
   * Update an existing demo
   */
  async updateDemo(id: string, updates: DemoUpdateRequest): Promise<ApiResponse<Demo>> {
    return apiClient.patch<Demo>(`${this.endpoint}/${id}`, updates)
  }

  /**
   * Update demo status (for workflow actions)
   */
  async updateDemoStatus(id: string, status: DemoStatus): Promise<ApiResponse<Demo>> {
    return apiClient.patch<Demo>(`${this.endpoint}/${id}/status`, { status })
  }

  /**
   * Delete a demo
   */
  async deleteDemo(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.endpoint}/${id}`)
  }

  /**
   * Upload demo file
   */
  async uploadDemo(file: File, metadata: Omit<DemoCreateRequest, 'shared_link'>): Promise<ApiResponse<Demo>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('metadata', JSON.stringify(metadata))

    return apiClient.upload<Demo>(`${this.endpoint}/upload`, formData)
  }

  /**
   * Get demo statistics/counts
   */
  async getDemoCounts(role?: 'admin' | 'assistant'): Promise<ApiResponse<DemoCounts>> {
    const endpoint = role 
      ? `${this.endpoint}/counts?role=${role}`
      : `${this.endpoint}/counts`
    
    return apiClient.get<DemoCounts>(endpoint)
  }

  /**
   * Batch update demo statuses
   */
  async batchUpdateStatus(
    updates: Array<{ id: string; status: DemoStatus }>
  ): Promise<ApiResponse<Demo[]>> {
    return apiClient.post<Demo[]>(`${this.endpoint}/batch-update`, { updates })
  }

  /**
   * Search demos with advanced filters
   */
  async searchDemos(
    query: string,
    filters?: DemoFilterParams,
    pagination?: QueryParams
  ): Promise<ApiResponse<PaginatedResponse<Demo>>> {
    const params = {
      search: query,
      ...filters,
      ...pagination,
    }

    return this.getDemos(params)
  }

  /**
   * Assistant action on demo (like, reject, undo_reject)
   */
  async assistantAction(
    demoId: string, 
    action: 'like' | 'reject' | 'undo_reject'
  ): Promise<ApiResponse<Demo>> {
    const payload = { action }
    const endpoint = `${this.endpoint}/${demoId}/assistant-action`
    
    console.log('🔥 ASSISTANT ACTION REQUEST:')
    console.log('  📍 Endpoint:', endpoint)
    console.log('  🎯 Demo ID:', demoId)
    console.log('  ⚡ Action:', action)
    console.log('  📦 Payload:', JSON.stringify(payload, null, 2))
    console.log('  🌐 Full URL will be:', `${endpoint}`)
    
    try {
      const response = await apiClient.post<Demo>(endpoint, payload)
      console.log('✅ ASSISTANT ACTION SUCCESS:', response)
      return response
    } catch (error) {
      console.error('❌ ASSISTANT ACTION ERROR:', error)
      throw error
    }
  }

  /**
   * Owner action on demo (approve, reject, undo_reject, like)
   */
  async ownerAction(
    demoId: string, 
    action: 'approve' | 'reject' | 'undo_reject' | 'like'
  ): Promise<ApiResponse<Demo>> {
    return apiClient.post<Demo>(`${this.endpoint}/${demoId}/owner-action`, { action })
  }

  /**
   * Test function to get all demos from the actual API endpoint
   */
  async getAllDemos(): Promise<ApiResponse<DemosApiResponse>> {
    console.log('🎯 DEMO SERVICE: getAllDemos called')
    console.log('  📍 Endpoint:', this.endpoint)
    console.log('  🔗 Will call:', `/api${this.endpoint}`)
    
    try {
      const result = await apiClient.get<DemosApiResponse>(this.endpoint)
      console.log('✅ DEMO SERVICE: getAllDemos success', result)
      return result
    } catch (error) {
      console.error('❌ DEMO SERVICE: getAllDemos error', error)
      throw error
    }
  }
}

// Export singleton instance
export const demoService = new DemoService()