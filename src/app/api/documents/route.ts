import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json() as { title?: string; content?: string; status?: "DRAFT" | "PUBLISHED"; bookId?: string | null }
    const { title, content, status, bookId } = body

    const document = await prisma.document.create({
      data: {
        title: title || 'Untitled',
        content: content || '',
        status: status || 'DRAFT',
        authorId: session.user.id,
        bookId: bookId || null,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}