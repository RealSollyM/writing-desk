import { NextResponse } from 'next/server'

// Get key from environment
const key = process.env.ARCJET_KEY

// Initialize Arcjet client once - following best practices
let aj: unknown = null

async function initializeArcjet() {
  if (aj) return aj

  if (!key) {
    return null
  }

  try {
    // Dynamic import to handle missing key gracefully
    const { default: arcjet, fixedWindow, detectBot } = await import('arcjet')

    // Create rules with LIVE mode as per SDK requirements
    const rateLimitRule = fixedWindow({
      mode: 'LIVE',
      window: '5 minutes',
      max: 100,
    })

    const botRule = detectBot({
      mode: 'LIVE',
      // Allow verified bots and search engines
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        'BING_CRAWLER',
        'GOOGLE_CRAWLER',
      ],
    })

    // Create arcjet instance with key and rules
    // Note: The client is provided by Arcjet SDK when using Next.js middleware
    aj = arcjet({
      key,
      rules: [rateLimitRule, botRule],
      log: console,
    })

    return aj
  } catch (error) {
    console.error('Failed to initialize Arcjet:', error)
    return null
  }
}

export async function middleware(request: Request) {
  // Get the Arcjet client
  const arcjetInstance = await initializeArcjet()

  // Protected paths that require both Arcjet protection and authentication
  const protectedPaths = ['/dashboard', '/api/protected']
  const url = new URL(request.url)
  const isProtected = protectedPaths.some((path) =>
    url.pathname.startsWith(path)
  )

  // Skip Arcjet for non-API routes unless they're protected paths
  const isApiRoute = url.pathname.startsWith('/api/')

  // If Arcjet is configured, enforce protection on API routes
  if (isApiRoute && arcjetInstance) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    // Protect the request
    const result = await (arcjetInstance as any).protect(
      {},
      {
        url: request.url,
        method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS',
        ip,
        headers: Object.fromEntries(request.headers.entries()),
      }
    )

    if (result.isDenied()) {
      if (result.reason?.type === 'RATE_LIMIT') {
        return new NextResponse(JSON.stringify({
          error: 'Too many requests',
          rateLimit: result.rateLimit,
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.rateLimit?.headers,
          },
        })
      }

      if (result.reason?.type === 'BOT') {
        return new NextResponse(JSON.stringify({
          error: 'Bot detected',
          message: 'Automated requests are not allowed.',
        }), {
          status: 403,
        })
      }
    }
  }

  // Also check Arcjet for protected non-API routes
  if (!isApiRoute && isProtected && arcjetInstance) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    const result = await (arcjetInstance as any).protect(
      {},
      {
        url: request.url,
        method: request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS',
        ip,
        headers: Object.fromEntries(request.headers.entries()),
      }
    )

    if (result.isDenied()) {
      if (result.reason?.type === 'RATE_LIMIT') {
        return new NextResponse(JSON.stringify({
          error: 'Too many requests',
          rateLimit: result.rateLimit,
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...result.rateLimit?.headers,
          },
        })
      }

      if (result.reason?.type === 'BOT') {
        return new NextResponse(JSON.stringify({
          error: 'Bot detected',
          message: 'Automated requests are not allowed.',
        }), {
          status: 403,
        })
      }
    }
  }

  // Fall back to auth check if Arcjet key is not configured
  if (!key || !arcjetInstance) {
    if (isProtected) {
      const { auth } = await import('@/lib/auth')
      const session = await auth.api.getSession({
        headers: request.headers,
      })

      if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return NextResponse.next()
  }

  // Auth middleware - protect dashboard and /api/protected routes with session check
  if (isProtected) {
    const { auth } = await import('@/lib/auth')
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Configure the middleware to run on all routes except static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).+)'],
}