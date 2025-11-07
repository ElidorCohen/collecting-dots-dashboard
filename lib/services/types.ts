/**
 * Standard API Response interface
 */
export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

/**
 * API Error interface
 */
export interface ApiError {
  message: string
  statusCode: number
  error?: string
  details?: any
  timestamp?: string
}

/**
 * Request configuration interface
 */
export interface RequestConfig extends RequestInit {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Standard paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Filter parameters for list endpoints
 */
export interface FilterParams {
  search?: string
  filters?: Record<string, any>
  dateFrom?: string
  dateTo?: string
}

/**
 * Combined query parameters
 */
export interface QueryParams extends PaginationParams, FilterParams {
  [key: string]: any
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (progress: {
  loaded: number
  total: number
  percentage: number
}) => void

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  requiresAuth?: boolean
}

/**
 * Batch operation request
 */
export interface BatchRequest<T = any> {
  operations: Array<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    endpoint: string
    body?: T
  }>
}

/**
 * Batch operation response
 */
export interface BatchResponse<T = any> {
  results: Array<{
    success: boolean
    data?: T
    error?: ApiError
  }>
}