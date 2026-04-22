'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/supabase/auth'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((userData) => {
      if (!userData) {
        router.push('/auth/signin')
      } else {
        setUser(userData)
      }
      setLoading(false)
    })
  }, [router])

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              Sign Out
            </button>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {user.name}
            </p>
            <p className="text-gray-700 mt-2">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-gray-700 mt-2">
              <span className="font-medium">Role:</span>{' '}
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                user.role === 'author' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role}
              </span>
            </p>
          </div>

          {(user.role === 'author' || user.role === 'admin') && (
            <div className="mt-6">
              <Link
                href="/posts/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create New Post
              </Link>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  toast.loading('Retrying pending summaries...')
                  const response = await fetch('/api/retry-pending-summaries', { method: 'POST' })
                  const data = await response.json()
                  toast.dismiss()
                  if (response.ok) {
                    toast.success(`Processed ${data.results?.length || 0} posts`)
                  } else {
                    toast.error('Failed to retry')
                  }
                }}
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Pending Summaries
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}