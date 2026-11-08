import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Gets the user's role from the database for authorization checks.
 * This loads the role directly from the database rather than relying on
 * session.user.role which may be undefined for non-admin users.
 */
async function getUserRole(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role ?? null
}

/**
 * Validates the document request body for POST/PUT operations.
 * Returns a sanitized object with only the allowed fields, or null if invalid.
 */
function validateDocumentBody(body: unknown): { title?: string; content?: string; status?: "DRAFT" | "PUBLISHED"; bookId?: string | null } | null {
  if (body === null || typeof body !== 'object') {
    return null
  }
  const { title, content, status, bookId } = body as Record<string, unknown>
  const result: Record<string, unknown> = {}

  if (title !== undefined) result.title = String(title)
  if (content !== undefined) result.content = String(content)
  if (status === 'DRAFT' || status === 'PUBLISHED') result.status = status
  if (bookId === null || bookId === undefined) {
    result.bookId = bookId === null ? null : undefined
  } else {
    result.bookId = String(bookId)
  }

  return result as { title?: string; content?: string; status?: "DRAFT" | "PUBLISHED"; bookId?: string | null }
}

/**
 * Retrieves all documents for the authenticated user.
 * Returns documents ordered by most recently updated first, including book info.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const documents = await prisma.document.findMany({
      where: {
        authorId: session.user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

/**
 * Creates a new document for the authenticated user.
 * Validates the request body and book access before creating.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Validate request body - parse JSON first to catch malformed JSON
    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const body = validateDocumentBody(parsedBody)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { title, content, status, bookId } = body

    // Validate bookId access if provided
    if (bookId !== undefined && bookId !== null) {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true },
      })
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }
    }

    const document = await prisma.document.create({
      data: {
        title: title ?? 'Untitled',
        content: content ?? '',
        status: status ?? 'DRAFT',
        authorId: session.user.id,
        bookId: bookId ?? null,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}