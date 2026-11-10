"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SocialShareProps {
  /** Title for the share preview (defaults to page title) */
  title?: string;
  /** Description for the share preview */
  description?: string;
  /** Image URL for the share preview */
  image?: string;
}

/**
 * Social sharing component that generates share links for Twitter and Facebook.
 * Uses the current page URL as the canonical link for sharing.
 */
export default function SocialShare({ title, description, image }: SocialShareProps) {
  const [pageUrl, setPageUrl] = useState("");
  const [shareText, setShareText] = useState("");
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Generate the canonical URL from the current path and query params
    const url = typeof window !== "undefined"
      ? `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
      : "";
    setPageUrl(url);

    // Use provided share text or default to title + description
    const text = title || description || "Check out this content";
    setShareText(text);
  }, [pathname, searchParams, title, description]);

  // Twitter share URL
  const twitterUrl = `#${pageUrl}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(pageUrl || window.location.origin);

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=WritingDesk`;

  // Facebook share URL
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const shareOnTwitter = () => {
    window.open(twitterShareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareOnFacebook = () => {
    window.open(facebookShareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={shareOnTwitter}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
        aria-label="Share on Twitter"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
        Twitter
      </button>

      <button
        onClick={shareOnFacebook}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-md transition-colors"
        aria-label="Share on Facebook"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 5 3.368 9.128 7.875 10.45V16h-1.625l-1.125 2h2.75l1.125-2H18v4.45A10.001 10.001 0 0022 12z" />
        </svg>
        Facebook
      </button>
    </div>
  );
}