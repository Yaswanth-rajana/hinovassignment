'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/UserContext'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Image as ImageIcon } from 'lucide-react'

export default function CreatePostPage() {
  const router = useRouter()
  const { user } = useUser()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    image_url: '',
  })

  // Redirect if not author or admin
  useEffect(() => {
    if (user && user.role !== 'author' && user.role !== 'admin') {
      toast.error('You need author permissions to create posts')
      router.push('/')
    } else if (!user) {
      router.push('/auth/signin')
    }
  }, [user, router])

  if (!user || (user.role !== 'author' && user.role !== 'admin')) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Insert post without summary first
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          title: formData.title,
          body: formData.body,
          image_url: formData.image_url,
          author_id: user.id,
          author_name: user.name,
          author_role: user.role,
        })
        .select()
        .single()

      if (postError) throw postError

      // Call AI API to generate summary with retry logic
      let summary = 'Summary generation queued. It will appear shortly.'
      let summaryStatus = 'pending'

      try {
        const aiResponse = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            content: formData.body,
          }),
        })
        
        const aiData = await aiResponse.json()
        
        if (aiResponse.ok && aiData.summary) {
          summary = aiData.summary
          summaryStatus = 'completed'
        } else if (aiResponse.status === 429) {
          summary = '⏳ Summary generation is rate limited. It will be generated automatically when you edit this post.'
          summaryStatus = 'rate_limited'
          
          // Store that this post needs summary regeneration
          localStorage.setItem(`pending_summary_${post.id}`, JSON.stringify({
            postId: post.id,
            title: formData.title,
            content: formData.body,
            retryCount: 0
          }))
        }
      } catch (aiError) {
        console.error('AI API error:', aiError)
        summary = '❌ Failed to generate summary. Admin can regenerate manually.'
        summaryStatus = 'failed'
      }

      // Update post with summary (or placeholder)
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          summary: summary,
          summary_status: summaryStatus 
        })
        .eq('id', post.id)

      if (updateError) throw updateError

      toast.success('Post created successfully!')
      router.push(`/posts/${post.id}`)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create post'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Post</h1>
        <p className="text-gray-600 mt-1">Share your thoughts with the world</p>
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400 shadow-sm transition-all"
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
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400 shadow-sm transition-all"
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

        {/* Body Field - Rich Text */}
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono bg-white text-gray-900 placeholder-gray-400 shadow-sm transition-all"
            placeholder="Write your post content here... (Markdown supported)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tip: You can use HTML tags for formatting
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Publish Post'}
          </button>
        </div>
      </form>
    </div>
  )
}
