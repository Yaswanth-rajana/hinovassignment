'use client'

import { useCallback, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import toast from 'react-hot-toast'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Calendar, MessageCircle, ArrowLeft, Edit, Trash2 } from 'lucide-react'

type Post = {
  id: string
  title: string
  body: string
  summary: string
  image_url: string
  author_id: string
  created_at: string
  updated_at: string
  author_name: string
  author_role: string
}

type Comment = {
  id: string
  comment_text: string
  created_at: string
  user_id: string
  author_name: string
}

type PostRow = Omit<Post, 'author_name' | 'author_role'> & {
  author_id: string
  author_name?: string | null
  author_role?: string | null
}

type CommentRow = Omit<Comment, 'author_name'> & {
  author_name?: string | null
  user_name?: string | null
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42703'
  )
}

export default function SinglePostPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const handleRegenerateSummary = async () => {
    if (!post) return
    setRegenerating(true)
    try {
      const response = await fetch('/api/regenerate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          title: post.title,
          content: post.body,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Summary regenerated successfully!')
        setPost({ ...post, summary: data.summary })
      } else {
        toast.error(data.error || 'Failed to regenerate')
      }
    } catch {
      toast.error('Failed to regenerate summary')
    } finally {
      setRegenerating(false)
    }
  }

  const loadComments = useCallback(async () => {
    const supabase = createClient()

    let { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (isMissingColumnError(error)) {
      const fallbackResult = await supabase
        .from('comments')
        .select('id, comment_text, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error || !data) {
      return
    }

    setComments((data as CommentRow[]).map((comment) => ({
      ...comment,
      author_name: comment.author_name || comment.user_name || 'Anonymous',
    })))
  }, [postId])

  // Fetch post and comments
  useEffect(() => {
    if (userLoading || !postId) return

    const loadInitialData = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Error fetching post:', error)
        toast.error('Post not found')
        router.push('/')
        setLoading(false)
        return
      }

      const postData = data as PostRow

      setPost({
        ...postData,
        author_name: postData.author_name || 'Unknown',
        author_role: postData.author_role || 'viewer',
      })
      setLoading(false)

      let { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (isMissingColumnError(commentError)) {
        const fallbackResult = await supabase
          .from('comments')
          .select('id, comment_text, created_at, user_id')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })

        commentData = fallbackResult.data
        commentError = fallbackResult.error
      }

      if (commentError || !commentData) {
        return
      }

      setComments((commentData as CommentRow[]).map((comment) => ({
        ...comment,
        author_name: comment.author_name || comment.user_name || 'Anonymous',
      })))
    }

    void loadInitialData()
  }, [postId, router, userLoading])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please sign in to comment')
      router.push('/auth/signin')
      return
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment')
      return
    }

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        comment_text: commentText,
      })

    if (error) {
      toast.error('Failed to add comment')
    } else {
      toast.success('Comment added!')
      setCommentText('')
      await loadComments()
    }
    setSubmitting(false)
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting('post')
    const supabase = createClient()
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      toast.error('Failed to delete post')
    } else {
      toast.success('Post deleted successfully')
      router.push('/')
    }
    setDeleting(null)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    setDeleting(commentId)
    const supabase = createClient()
    
    // Delete the comment from database
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete comment')
    } else {
      toast.success('Comment deleted successfully')
      // Remove the comment from local state immediately
      setComments(comments.filter(c => c.id !== commentId))
    }
    
    setDeleting(null)
  }

  const canEdit = user && (user.id === post?.author_id || user.role === 'admin')
  const canDelete = user && (user.id === post?.author_id || user.role === 'admin')
  const canDeleteComment = (commentUserId: string) => {
    console.log('Current user ID:', user?.id)
    console.log('Comment user ID:', commentUserId)
    console.log('Are they equal?', user?.id === commentUserId)
    
    if (!user) return false
    
    // Admin can delete any comment
    if (user.role === 'admin') return true
    
    // Post author can delete comments on their post
    if (user.id === post?.author_id) return true
    
    // Comment author can delete their own comment
    if (user.id === commentUserId) return true
    
    return false
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Skeleton height={400} className="mb-6" />
        <Skeleton height={40} width="80%" className="mb-4" />
        <Skeleton height={20} width="40%" className="mb-8" />
        <Skeleton height={100} count={3} />
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Home
      </Link>

      {/* Featured Image */}
      <img
        src={post.image_url}
        alt={post.title}
        className="w-full h-64 md:h-96 object-cover rounded-lg shadow-md mb-6"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/1200x600?text=No+Image'
        }}
      />

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        {post.title}
      </h1>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-100">
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold shadow-sm">
                {post.author_name?.charAt(0).toUpperCase()}
             </div>
             <div>
                <div className="font-bold text-gray-900">{post.author_name}</div>
                <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">{post.author_role}</div>
             </div>
          </div>
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{comments.length} comments</span>
          </div>
        </div>

        {/* Edit/Delete Buttons */}
        <div className="flex space-x-2">
          {user?.role === 'admin' && post.summary?.toLowerCase().includes('rate limited') && (
            <button
              onClick={handleRegenerateSummary}
              disabled={regenerating}
              className="inline-flex items-center px-4 py-2 text-sm bg-green-50 text-green-700 font-semibold rounded-full hover:bg-green-100 transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {regenerating ? 'Generating...' : 'Regenerate Summary'}
            </button>
          )}
          {canEdit && (
            <Link
              href={`/posts/edit/${post.id}`}
              className="inline-flex items-center px-4 py-2 text-sm bg-indigo-50 text-indigo-700 font-semibold rounded-full hover:bg-indigo-100 transition-colors"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDeletePost}
              disabled={deleting === 'post'}
              className="inline-flex items-center px-4 py-2 text-sm bg-red-50 text-red-700 font-semibold rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {deleting === 'post' ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      {/* AI Summary Box */}
      {post.summary && (
        <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-10 border border-indigo-100/50 shadow-sm animate-fade-in text-gray-800">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
              <span className="text-lg animate-bounce-slow">🤖</span>
            </div>
            <div>
               <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-700">Powered by AI</span>
               <h3 className="text-sm font-bold text-gray-900">Key Takeaways</h3>
            </div>
          </div>
          <p className="text-[1.05rem] text-gray-700 leading-relaxed font-medium">
            {post.summary}
          </p>
        </div>
      )}

      {/* Post Body */}
      <article 
        className="prose prose-lg md:prose-xl prose-indigo max-w-none mb-16 text-gray-800 leading-relaxed font-sans"
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(post.body.replace(/\n/g, '<br/>')) 
        }}
      />
      
      {/* Author Bio Section */}
      <div className="bg-white rounded-3xl p-8 mb-12 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6 border border-gray-100 shadow-sm">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-4xl shadow-lg ring-4 ring-indigo-50">
          {post.author_name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Written by {post.author_name}</h3>
          <p className="text-sm uppercase tracking-wider text-indigo-600 font-bold mb-3">{post.author_role}</p>
          <p className="text-gray-600 leading-relaxed">
            A prolific {post.author_role} on our technical blogging platform, passionately sharing insights, experiences, and technical deep-dives with a growing community of readers worldwide.
          </p>
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-12 pt-6 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Comments ({comments.length})
        </h2>

        {/* Add Comment Form */}
        {user ? (
          <form onSubmit={handleAddComment} className="mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-center mb-8">
            <p className="text-gray-600">
              <Link href="/auth/signin" className="text-indigo-600 hover:underline">
                Sign in
              </Link>
              {' '}to leave a comment
            </p>
          </div>
        )}

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{comment.author_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Show delete button ONLY for: Admin, Post Author, or Comment Author */}
                  {(user?.role === 'admin' || 
                    user?.id === post?.author_id || 
                    user?.id === comment.user_id) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deleting === comment.id}
                      className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                    >
                      {deleting === comment.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
                <p className="text-gray-700">{comment.comment_text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
