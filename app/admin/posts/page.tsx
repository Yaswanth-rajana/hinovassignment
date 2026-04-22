'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2, Eye } from 'lucide-react'

type PostWithAuthor = {
  id: string
  title: string
  summary: string
  created_at: string
  author_id: string
  author_name: string
}

export default function AdminPostsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()
  
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && (!user || user.role !== 'admin')) {
      toast.error('Admin access required')
      router.push('/')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPosts()
    }
  }, [user])

  const fetchPosts = async () => {
    setLoading(true)
    
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (postsError) {
      console.error('Error fetching posts:', postsError)
      toast.error('Failed to load posts')
      setLoading(false)
      return
    }

    const { data: usersData } = await supabase
      .from('users')
      .select('id, name')

    const userMap = new Map()
    if (usersData) {
      usersData.forEach((user: any) => {
        userMap.set(user.id, user.name)
      })
    }

    const formattedPosts = postsData.map((post: any) => ({
      id: post.id,
      title: post.title,
      summary: post.summary || 'No summary',
      created_at: post.created_at,
      author_id: post.author_id,
      author_name: userMap.get(post.author_id) || 'Anonymous',
    }))
    
    setPosts(formattedPosts)
    setLoading(false)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return
    
    setDeleting(postId)
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      toast.error('Failed to delete post')
    } else {
      toast.success('Post deleted successfully')
      setPosts(posts.filter(p => p.id !== postId))
    }
    
    setDeleting(null)
  }

  if (userLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600">Loading posts...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Manage Posts</h1>
            <p className="text-gray-600 mt-1">View, edit, or delete any post on the platform</p>
          </div>
          <div className="bg-gray-100 rounded-full px-4 py-2">
            <span className="font-semibold text-gray-700">{posts.length}</span>
            <span className="text-gray-500 ml-1">total posts</span>
          </div>
        </div>
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500">No posts yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {post.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{post.author_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 line-clamp-2 max-w-md">
                        {post.summary}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/posts/${post.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/posts/edit/${post.id}`}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deleting === post.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}