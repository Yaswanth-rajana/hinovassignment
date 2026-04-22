import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase/client'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { postId, title, content } = await request.json()

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Generate summary
    const truncatedContent = content.length > 3000 
      ? content.substring(0, 3000) + '...' 
      : content

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    
    const prompt = `Create a ~200 word summary for blog post titled "${title}":\n\n${truncatedContent}`
    
    const result = await model.generateContent(prompt)
    const summary = result.response.text().replace(/^Summary:\s*/i, '').trim()

    // Update post
    await supabase
      .from('posts')
      .update({ summary })
      .eq('id', postId)

    return NextResponse.json({ summary })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate summary' },
      { status: 500 }
    )
  }
}