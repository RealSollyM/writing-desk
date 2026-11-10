import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Gets all comments for a specific book, with optional parent filtering.
 * Supports pagination and nested replies.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const bookId = searchParams.get('bookId')
    const parentId = searchParams.get('parentId') // For getting replies to a specific comment

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Build query conditions
    const whereCondition = parentId
      ? {
          bookId,
          parentId,
        }
      : {
          bookId,
          parentId: null, // Top-level comments only
        }

    // Get comments with user info and reply count
    const comments = await prisma.comment.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    })

    // Format comments with reply count
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      bookId: comment.bookId,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name || 'Anonymous',
        image: comment.user.image,
      },
      replyCount: comment._count.replies,
    }))

    return NextResponse.json(formattedComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

/**
 * Creates a new comment.
 * Requires authentication and book access.
 * parentId optional for threaded replies.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const body = parsedBody as { bookId?: string; content?: string; parentId?: string | null }

    if (!body.bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: body.bookId },
      select: { id: true },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Verify parent comment exists if parentId is provided
    if (body.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: body.parentId },
        select: { bookId: true },
      })

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      if (parentComment.bookId !== body.bookId) {
        return NextResponse.json({ error: 'Parent comment does not belong to this book' }, { status: 400 })
      }
    }

    const comment = await prisma.comment.create({
      data: {
        bookId: body.bookId,
        userId: session.user.id,
        content: body.content.trim(),
        parentId: body.parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      bookId: comment.bookId,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name || 'Anonymous',
        image: comment.user.image,
      },
      replyCount: 0,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}