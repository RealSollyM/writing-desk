import { NextResponse } from 'next/server'

// Get key from environment
const key = process.env.ARCJET_KEY

// Initialize arcjet lazily
let aj: unknown = null

async function getArcjet() {
  if (aj) return aj

  if (!key) {
    return null
  }

  try {
    const { default: arcjet, fixedWindow, detectBot } = await import('arcjet')

    const rateLimitRule = fixedWindow({
      window: '5 minutes',
      max: 100,
    })

    const botRule = detectBot({
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        'BING_CRAWLER',
        'GOOGLE_CRAWLER',
      ],
    })

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

// Get client IP
function getIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return '127.0.0.1'
}

export async function GET(request: Request) {
  // Your API logic here
  return NextResponse.json({
    message: 'Documents endpoint',
    protected: !!key,
  })
}

export async function POST(request: Request) {
  // Protect with Arcjet if key is set
  const arcjetInstance = await getArcjet()

  if (arcjetInstance) {
    const ip = getIP(request)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await (arcjetInstance as any).protect(
        {},
        {
          url: request.url,
          method: 'POST',
          ip,
          headers: Object.fromEntries(request.headers.entries()),
        }
      )

      if (result.isDenied()) {
        if (result.reason?.type === 'RATE_LIMIT') {
          return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                ...result.rateLimit?.headers,
              },
            }
          )
        }
      }
    } catch (error) {
      console.error('Arcjet error:', error)
    }
  }

  // Your API logic here
  return NextResponse.json({
    message: 'Document created',
    success: true,
  })
}