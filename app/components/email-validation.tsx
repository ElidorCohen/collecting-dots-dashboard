'use client'

import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function EmailValidationCheck() {
  const { user } = useUser()
  const [validationStatus, setValidationStatus] = useState<{
    loading: boolean
    authorized: boolean | null
    userEmail?: string
    reason?: string
  }>({ loading: true, authorized: null })

  useEffect(() => {
    if (user) {
      fetch('/api/validate-email')
        .then(res => res.json())
        .then(data => {
          setValidationStatus({
            loading: false,
            authorized: data.authorized,
            userEmail: data.userEmail,
            reason: data.reason
          })
          
          // If not authorized, redirect to unauthorized page
          if (!data.authorized) {
            window.location.href = '/unauthorized'
          }
        })
        .catch(error => {
          console.error('Email validation failed:', error)
          setValidationStatus({
            loading: false,
            authorized: false,
            reason: 'Validation error'
          })
        })
    }
  }, [user])

  if (validationStatus.loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Validating access...</span>
      </div>
    )
  }

  if (!validationStatus.authorized) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Access Not Authorized</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>Email: {validationStatus.userEmail}</p>
              <p>Reason: {validationStatus.reason}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Access Authorized</h3>
          <div className="mt-2 text-sm text-green-700">
            <p>Welcome, {validationStatus.userEmail}</p>
          </div>
        </div>
      </div>
    </div>
  )
}