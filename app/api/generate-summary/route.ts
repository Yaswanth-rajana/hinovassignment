import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // Truncate content if too long (save tokens)
    const truncatedContent = content.length > 3000 
      ? content.substring(0, 3000) + '...' 
      : content

    // Use Gemini 2.0 Flash (free tier)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a helpful assistant that creates concise blog post summaries.
    
    Blog Title: ${title}
    
    Blog Content: 
    ${truncatedContent}
    
    Instructions:
    - Create a summary that is approximately 200 words
    - Capture the main points and key takeaways
    - Keep the tone professional and engaging
    - Do not use markdown or special characters
    - Write in plain text only
    
    Summary:`

    const result = await model.generateContent(prompt)
    const summary = result.response.text()

    // Clean up the summary (remove any "Summary:" prefix if present)
    const cleanSummary = summary.replace(/^Summary:\s*/i, '').trim()

    return NextResponse.json({ summary: cleanSummary })
    
  } catch (error: any) {
    console.error('AI Summary Error:', error)
    
    // Check for rate limit error
    if (error.message?.includes('429') || error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}