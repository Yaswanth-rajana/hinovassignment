'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import toast from 'react-hot-toast'
import { ArrowLeft, Image as ImageIcon, Save, Trash2 } from 'lucide-react'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const supabase = createClient()
  const postId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    image_url: '',
  })
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null)

  // Fetch post data
  useEffect(() => {
    if (postId && user) {
      fetchPost()
    }
  }, [postId, user])

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (error) {
      toast.error('Post not found')
      router.push('/')
      return
    }

    // Check permission: author or admin
    if (user?.id !== data.author_id && user?.role !== 'admin') {
      toast.error('You do not have permission to edit this post')
      router.push('/')
      return
    }

    setFormData({
      title: data.title,
      body: data.body,
      image_url: data.image_url,
    })
    setOriginalAuthorId(data.author_id)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('posts')
      .update({
        title: formData.title,
        body: formData.body,
        image_url: formData.image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)

    if (error) {
      toast.error('Failed to update post')
    } else {
      toast.success('Post updated successfully!')
      router.push(`/posts/${postId}`)
      router.refresh()
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
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
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center text-gray-600">Loading post...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/posts/${postId}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Post
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Post</h1>
            <p className="text-gray-600 mt-1">Update your post content</p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete Post'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Field */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter post title"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Featured Image URL Field */}
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
            Featured Image URL *
          </label>
          <div className="flex items-start space-x-3">
            <input
              type="url"
              id="image_url"
              required
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="https://example.com/image.jpg"
            />
            <button
              type="button"
              onClick={() => {
                const url = prompt('Paste image URL:')
                if (url) setFormData({ ...formData, image_url: url })
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
          {formData.image_url && (
            <div className="mt-2">
              <img
                src={formData.image_url}
                alt="Preview"
                className="h-32 w-auto object-cover rounded-lg border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* Body Field */}
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
            Post Content *
          </label>
          <textarea
            id="body"
            required
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={12}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            placeholder="Write your post content here..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: Use line breaks for paragraphs
          </p>
        </div>

        {/* Note about AI Summary */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-md p-4">
          <p className="text-sm text-yellow-700">
            <strong>Note:</strong> Editing this post will not regenerate the AI summary.
            The existing summary will remain unchanged.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <Link
            href={`/posts/${postId}`}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}