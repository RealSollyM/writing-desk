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
 * Validates document request body for PUT operations (full document replacement).
 * Returns sanitized object or null if invalid.
 */
function validateRequestBody(body: unknown): { title: string; content: string; status: "DRAFT" | "PUBLISHED"; bookId: string | null } | null {
  if (body === null || typeof body !== 'object') {
    return null
  }
  const { title, content, status, bookId } = body as Record<string, unknown>
  const result: Record<string, unknown> = {}

  if (title !== undefined) result.title = String(title)
  if (content !== undefined) result.content = String(content)
  if (status === 'DRAFT' || status === 'PUBLISHED') result.status = status
  // Handle bookId: null means detach from book, undefined means no change
  if (bookId === null) result.bookId = null
  else if (bookId !== undefined) result.bookId = String(bookId)

  return result as { title: string; content: string; status: "DRAFT" | "PUBLISHED"; bookId: string | null }
}

/**
 * Retrieves a single document by ID.
 * Returns the document if found and the user is author or admin, otherwise 403.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const userRole = await getUserRole(session.user.id)
    const document = await prisma.document.findUnique({
      where: {
        id,
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

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.authorId !== session.user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

/**
 * Updates a document by ID.
 * Only updates fields supplied in the request to avoid overwriting concurrent edits.
 * bookId can be explicitly set to null to detach from a book.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Validate request body
    let body: { title?: string; content?: string; status?: "DRAFT" | "PUBLISHED"; bookId?: string | null } | null = null
    try {
      body = validateRequestBody(await request.json())
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { title, content, status, bookId } = body

    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const userRole = await getUserRole(session.user.id)
    if (document.authorId !== session.user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate bookId access if provided (only when not null)
    if (bookId !== undefined && bookId !== null) {
      // Check if book exists
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { id: true },
      })
      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }
    }

    // Build update data with only the fields supplied in the request
    // This prevents overwriting concurrent edits to omitted fields
    const updateData: { title?: string; content?: string; status?: "DRAFT" | "PUBLISHED"; bookId?: string | null } = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (status !== undefined) updateData.status = status
    // Only set bookId if explicitly provided (including explicit null to detach)
    if (bookId !== undefined) updateData.bookId = bookId

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

/**
 * Deletes a document by ID.
 * Only accessible to the document's author or an admin.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const userRole = await getUserRole(session.user.id)
    if (document.authorId !== session.user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.document.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}