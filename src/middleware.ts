import { NextResponse } from 'next/server'

// Get key from environment
const key = process.env.ARCJET_KEY

// Only initialize arcjet if key is set
let aj: unknown = null

async function initializeArcjet() {
  if (aj) return aj

  if (!key) {
    return null
  }

  try {
    // Dynamic import to handle missing key gracefully
    const { default: arcjet, fixedWindow, detectBot } = await import('arcjet')

    // Create rules
    const rateLimitRule = fixedWindow({
      window: '5 minutes',
      max: 100,
    })

    const botRule = detectBot({
      // Allow verified bots and search engines
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        'BING_CRAWLER',
        'GOOGLE_CRAWLER',
      ],
    })

    // Create arcjet instance with key and rules
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
  // Skip if Arcjet key is not configured
  if (!key) {
    // Still check auth for protected routes
    const url = new URL(request.url)
    const protectedPaths = ["/dashboard", "/api/protected"]
    const isProtected = protectedPaths.some((path) =>
      url.pathname.startsWith(path)
    )

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

  const url = new URL(request.url)
  const isApiRoute = url.pathname.startsWith('/api/')

  if (isApiRoute) {
    try {
      const arcjetInstance = await initializeArcjet()

      if (!arcjetInstance) {
        // Still check auth for protected routes
        const protectedPaths = ["/dashboard", "/api/protected"]
        const isProtected = protectedPaths.some((path) =>
          url.pathname.startsWith(path)
        )

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
    } catch (error) {
      console.error('Arcjet error:', error)
      // Fail open - continue without protection on error
    }
  }

  // Auth middleware - protect dashboard and /api/protected routes
  const { auth } = await import('@/lib/auth')
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const protectedPaths = ['/dashboard', '/api/protected']

  const isProtected = protectedPaths.some((path) =>
    url.pathname.startsWith(path)
  )

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// Configure the middleware to run on API routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).+)'],
}