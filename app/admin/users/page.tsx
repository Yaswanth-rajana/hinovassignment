'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, UserCheck, UserCog, Shield, Crown, Save } from 'lucide-react'

type User = {
  id: string
  name: string
  email: string
  role: 'viewer' | 'author' | 'admin'
  created_at: string
}

export default function AdminUsersPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()
  
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [roleChanges, setRoleChanges] = useState<Record<string, 'viewer' | 'author' | 'admin'>>({})

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      toast.error('Admin access required')
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } else {
      setUsers(data || [])
    }
    
    setLoading(false)
  }

  const handleRoleChange = (userId: string, newRole: 'viewer' | 'author' | 'admin') => {
    setRoleChanges(prev => ({
      ...prev,
      [userId]: newRole
    }))
  }

  const handleSaveRole = async (userId: string) => {
    const newRole = roleChanges[userId]
    if (!newRole) return

    setSaving(userId)

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update user role')
    } else {
      toast.success('User role updated successfully')
      // Update local state
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      // Remove from pending changes
      setRoleChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[userId]
        return newChanges
      })
    }

    setSaving(null)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'author': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4" />
      case 'author': return <UserCog className="w-4 h-4" />
      default: return <UserCheck className="w-4 h-4" />
    }
  }

  const getRoleOptions = () => {
    return [
      { value: 'viewer', label: 'Viewer', description: 'Can read and comment' },
      { value: 'author', label: 'Author', description: 'Can create and edit own posts' },
      { value: 'admin', label: 'Admin', description: 'Full access to everything' },
    ]
  }

  if (userLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600">Loading users...</div>
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Admin Panel
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            <p className="text-gray-600 mt-1">View all users and manage their roles and permissions</p>
          </div>
          <div className="bg-gray-100 rounded-full px-4 py-2">
            <span className="font-semibold text-gray-700">{users.length}</span>
            <span className="text-gray-500 ml-1">total users</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((userItem) => (
                <tr key={userItem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold">
                          {userItem.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.name}
                          {userItem.id === user?.id && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{userItem.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(userItem.role)}`}>
                      {getRoleIcon(userItem.role)}
                      <span>{userItem.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={roleChanges[userItem.id] || userItem.role}
                      onChange={(e) => handleRoleChange(userItem.id, e.target.value as any)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={userItem.id === user?.id && userItem.role === 'admin'}
                    >
                      {getRoleOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {roleChanges[userItem.id] && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Will change to {roleChanges[userItem.id]}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(userItem.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {roleChanges[userItem.id] && (
                      <button
                        onClick={() => handleSaveRole(userItem.id)}
                        disabled={saving === userItem.id}
                        className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving === userItem.id ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">👁️ Viewer</span>
            <p className="text-blue-700 text-xs mt-1">Can read posts, view summaries, and add comments</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">✍️ Author</span>
            <p className="text-blue-700 text-xs mt-1">Can create, edit, and delete their own posts</p>
          </div>
          <div>
            <span className="font-medium text-blue-800">👑 Admin</span>
            <p className="text-blue-700 text-xs mt-1">Full access: manage users, posts, and comments</p>
          </div>
        </div>
      </div>
    </div>
  )
}