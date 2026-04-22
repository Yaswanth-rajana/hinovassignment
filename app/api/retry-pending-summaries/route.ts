import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase/client'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    
    // Find posts with rate limited or pending summaries
    const { data: pendingPosts } = await supabase
      .from('posts')
      .select('id, title, body, summary')
      .or("summary.ilike.%rate limited%,summary.ilike.%queued%")
      .limit(5)

    if (!pendingPosts || pendingPosts.length === 0) {
      return NextResponse.json({ message: 'No pending summaries' })
    }

    const results = []

    for (const post of pendingPosts) {
      try {
        // Truncate content
        const truncatedContent = post.body.length > 3000 
          ? post.body.substring(0, 3000) + '...' 
          : post.body

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        
        const prompt = `Create a ~200 word summary for blog post titled "${post.title}":\n\n${truncatedContent}`
        
        const result = await model.generateContent(prompt)
        const summary = result.response.text().replace(/^Summary:\s*/i, '').trim()

        // Update the post
        await supabase
          .from('posts')
          .update({ summary })
          .eq('id', post.id)

        results.push({ id: post.id, status: 'success', summary })
        
      } catch (error: any) {
        results.push({ id: post.id, status: 'failed', error: error.message })
        
        // If rate limit still active, stop processing more
        if (error.message?.includes('429')) {
          break
        }
      }
    }

    return NextResponse.json({ 
      message: `Processed ${results.length} posts`,
      results 
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process pending summaries' },
      { status: 500 }
    )
  }
}