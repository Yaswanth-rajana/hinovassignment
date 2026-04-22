'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import toast from 'react-hot-toast'
import { Users, MessageCircle, FileText, Shield } from 'lucide-react'

export default function AdminPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      toast.error('Admin access required')
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600">Loading...</div>
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return null
  }

  const adminCards = [
    {
      title: 'Manage Users',
      description: 'View all users and change their roles (viewer/author/admin)',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Comments',
      description: 'View and moderate all comments across the platform',
      icon: MessageCircle,
      href: '/admin/comments',
      color: 'bg-green-500',
    },
    {
      title: 'All Posts',
      description: 'View, edit, or delete any post on the platform',
      icon: FileText,
      href: '/admin/posts',
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">
          Welcome back, {user.name}. Manage users, posts, and comments from here.
        </p>
      </div>

      {/* Admin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {adminCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm">{card.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
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
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Retry Pending AI Summaries
          </button>
        </div>
      </div>
    </div>
  )
}