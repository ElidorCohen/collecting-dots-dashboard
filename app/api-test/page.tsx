'use client'

import { useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { apiClient } from '@/lib/services/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ApiTestPage() {
  const { getToken, isLoaded } = useAuth()
  const { user } = useUser()
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testApiCall = async () => {
    if (!isLoaded) {
      setTestResult('Clerk not loaded yet')
      return
    }

    setLoading(true)
    try {
      // Test getting a token
      const token = await getToken()
      console.log('Got Clerk token:', token ? 'Token received' : 'No token')

      // Test API call to demos endpoint (protected)
      const response = await apiClient.get('/demos')
      setTestResult(`✅ API call successful! Status: ${response.status}`)
    } catch (error: any) {
      console.error('API test error:', error)
      setTestResult(`❌ API call failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>API Authentication Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">User Information:</h3>
              <p className="text-sm text-gray-600">
                Email: {user?.emailAddresses[0]?.emailAddress || 'Not available'}
              </p>
              <p className="text-sm text-gray-600">
                Status: {user ? 'Authenticated' : 'Not authenticated'}
              </p>
              <p className="text-sm text-gray-600">
                Clerk Loaded: {isLoaded ? 'Yes' : 'No'}
              </p>
            </div>
            
            <Button 
              onClick={testApiCall} 
              disabled={loading || !isLoaded}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Protected API Call'}
            </Button>
            
            {testResult && (
              <div className={`p-3 rounded text-sm ${
                testResult.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult}
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              <p>This test will:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Get a Clerk authentication token</li>
                <li>Make a request to the protected /api/demos endpoint</li>
                <li>Show the result of the authenticated API call</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}