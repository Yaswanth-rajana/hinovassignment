'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Trash2, MessageCircle, ArrowLeft } from 'lucide-react'

type CommentWithDetails = {
  id: string
  comment_text: string
  created_at: string
  post_id: string
  post_title: string
  user_name: string
  user_email: string
}

export default function AdminCommentsPage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()
  
  const [comments, setComments] = useState<CommentWithDetails[]>([])
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
      fetchComments()
    }
  }, [user])

  const fetchComments = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        post:post_id(title),
        user:user_id(name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      toast.error('Failed to load comments')
    } else {
      const formattedComments = data.map((comment: any) => ({
        id: comment.id,
        comment_text: comment.comment_text,
        created_at: comment.created_at,
        post_id: comment.post_id,
        post_title: comment.post?.title || 'Deleted Post',
        user_name: comment.user?.name || 'Unknown User',
        user_email: comment.user?.email || 'No email',
      }))
      setComments(formattedComments)
    }
    
    setLoading(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    setDeleting(commentId)
    
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast.error('Failed to delete comment')
    } else {
      toast.success('Comment deleted successfully')
      setComments(comments.filter(c => c.id !== commentId))
    }
    
    setDeleting(null)
  }

  if (userLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600">Loading...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Manage Comments</h1>
            <p className="text-gray-600 mt-1">View and moderate all user comments</p>
          </div>
          <div className="bg-gray-100 rounded-full px-4 py-2">
            <span className="font-semibold text-gray-700">{comments.length}</span>
            <span className="text-gray-500 ml-1">total comments</span>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No comments yet</h3>
          <p className="text-gray-500">Comments will appear here once users start engaging</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post
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
              {comments.map((comment) => (
                <tr key={comment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {comment.comment_text}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{comment.user_name}</div>
                    <div className="text-xs text-gray-500">{comment.user_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/posts/${comment.post_id}`}
                      target="_blank"
                      className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline line-clamp-1"
                    >
                      {comment.post_title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deleting === comment.id}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}