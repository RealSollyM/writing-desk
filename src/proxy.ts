import { NextResponse } from "next/server";

/**
 * Get the Arcjet API key from environment variables.
 * Arcjet protection is only enabled when this key is set.
 */
const key = process.env.ARCJET_KEY;

/**
 * Cached Arcjet client instance for reuse.
 * Following Arcjet best practices: create once, import everywhere.
 */
let aj: unknown = null;

/**
 * Initialize and cache the Arcjet client instance.
 *
 * @returns Arcjet client if ARCJET_KEY is configured, null otherwise
 *
 * @remarks
 * - Uses lazy initialization to handle missing key gracefully
 * - Creates rules with LIVE mode as required by Arcjet SDK 1.15.0
 * - Caches the instance for reuse (per Arcjet best practices)
 */
async function initializeArcjet() {
  // Return cached instance if available
  if (aj) return aj;

  // Check if Arcjet key is configured
  if (!key) {
    return null;
  }

  try {
    // Dynamic import to handle missing key gracefully
    const { default: arcjet, fixedWindow, detectBot } = await import("arcjet");

    // Create rules with LIVE mode as per SDK requirements
    const rateLimitRule = fixedWindow({
      mode: "LIVE",
      window: "5 minutes",
      max: 100,
    });

    const botRule = detectBot({
      mode: "LIVE",
      // Allow verified bots and search engines
      allow: ["CATEGORY:SEARCH_ENGINE", "BING_CRAWLER", "GOOGLE_CRAWLER"],
    });

    // Create arcjet instance with key and rules
    aj = arcjet({
      key,
      rules: [rateLimitRule, botRule],
      log: console,
    });

    return aj;
  } catch (error) {
    console.error("Failed to initialize Arcjet:", error);
    return null;
  }
}

/**
 * Next.js middleware for API route protection and authentication.
 *
 * @remarks
 * - Applies Arcjet protection (rate limiting + bot detection) to API routes
 * - Falls back to session-based auth for protected routes when Arcjet is unavailable
 * - Redirects unauthenticated users to /login for protected routes
 *
 * @param request - The incoming Request object
 * @returns NextResponse - Next.js response object
 */
export async function proxy(request: Request) {
  const url = new URL(request.url);
  const arcjetInstance = await initializeArcjet();

  // Protected paths that require authentication
  const protectedPaths = ["/dashboard", "/api/protected"];
  const isProtected = protectedPaths.some((path) =>
    url.pathname.startsWith(path),
  );

  // API routes get Arcjet protection (rate limiting + bot detection)
  const isApiRoute = url.pathname.startsWith("/api/");

  // Apply Arcjet protection on API routes when key is available
  if (isApiRoute && arcjetInstance) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const result = await (arcjetInstance as any).protect(
      {},
      {
        url: request.url,
        method: request.method as
          | "GET"
          | "POST"
          | "PUT"
          | "DELETE"
          | "PATCH"
          | "OPTIONS",
        ip,
        headers: Object.fromEntries(request.headers.entries()),
      },
    );

    if (result.isDenied()) {
      if (result.reason?.type === "RATE_LIMIT") {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests",
            rateLimit: result.rateLimit,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...result.rateLimit?.headers,
            },
          },
        );
      }

      if (result.reason?.type === "BOT") {
        return new NextResponse(
          JSON.stringify({
            error: "Bot detected",
            message: "Automated requests are not allowed.",
          }),
          {
            status: 403,
          },
        );
      }
    }
  }

  // Fallback: Check authentication for protected routes
  // This runs when Arcjet key is not configured or on non-API protected routes
  if (isProtected) {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Configure the middleware to run on all routes except static files.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).+)"],
};
