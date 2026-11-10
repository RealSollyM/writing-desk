import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Gets the user's role from the database for authorization checks.
 */
async function getUserRole(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role ?? null
}

/**
 * Generates a UUID v4 string using crypto (available in Node.js 14.17+)
 */
function generateUUID(): string {
  return (
    crypto.randomUUID?.() ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  )
}

/**
 * GET /api/documents/[id]/versions
 * Lists all versions for a document.
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
    const document = await prisma.document.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, email: true } } },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const userRole = await getUserRole(session.user.id)
    if (document.authorId !== session.user.id && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(versions)
  } catch (error) {
    console.error('Error fetching document versions:', error)
    return NextResponse.json({ error: 'Failed to fetch document versions' }, { status: 500 })
  }
}

/**
 * POST /api/documents/[id]/versions
 * Creates a new version snapshot of the document.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Create a new version snapshot
    const newVersionId = generateUUID()
    const newVersion = await prisma.documentVersion.create({
      data: {
        versionId: newVersionId,
        documentId: id,
        title: document.title,
        content: document.content,
        status: document.status,
        authorId: document.authorId,
      },
    })

    // Update the document's versionId to point to the new version
    await prisma.document.update({
      where: { id },
      data: { versionId: newVersionId },
    })

    return NextResponse.json(newVersion, { status: 201 })
  } catch (error) {
    console.error('Error creating document version:', error)
    return NextResponse.json({ error: 'Failed to create document version' }, { status: 500 })
  }
}

/**
 * PATCH /api/documents/[id]/versions?restore=[versionId]
 * Restores a document to a specific version.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const url = new URL(request.url)
    const restoreVersionId = url.searchParams.get('restore')

    if (!restoreVersionId) {
      return NextResponse.json({ error: 'Missing restore version ID' }, { status: 400 })
    }

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

    // Find the version to restore
    const version = await prisma.documentVersion.findFirst({
      where: {
        documentId: id,
        versionId: restoreVersionId,
      },
    })

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Restore the document to this version
    const restored = await prisma.document.update({
      where: { id },
      data: {
        title: version.title,
        content: version.content,
        status: version.status,
        versionId: version.versionId,
      },
    })

    // Create a new version entry for the restore action
    await prisma.documentVersion.create({
      data: {
        versionId: generateUUID(),
        documentId: id,
        title: restored.title,
        content: restored.content,
        status: restored.status,
        authorId: restored.authorId,
      },
    })

    // Update the document's versionId to the restored version
    await prisma.document.update({
      where: { id },
      data: { versionId: version.versionId },
    })

    return NextResponse.json({ success: true, document: restored })
  } catch (error) {
    console.error('Error restoring document version:', error)
    return NextResponse.json({ error: 'Failed to restore document version' }, { status: 500 })
  }
}