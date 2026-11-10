import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SocialShare from "@/components/SocialShare";
import type { Metadata } from "next";

interface Document {
  id: string;
  slug: string | null;
  title: string;
  content: string;
  status: string;
  order: number | null;
  partId: string | null;
}

interface BookPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ chapter?: string }>;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { slug } = await params;

  // Fetch book for metadata
  const book = await prisma.book.findUnique({
    where: { id: slug },
    select: {
      title: true,
      description: true,
      slug: true,
    },
  });

  if (!book) {
    return {
      title: "Book Not Found",
    };
  }

  // Build URL
  const bookUrl = `/books/${book.slug || slug}`;

  return {
    title: book.title,
    description: book.description || "",
    openGraph: {
      title: book.title,
      description: book.description || "",
      url: `${process.env.NEXT_PUBLIC_SITE_URL}${bookUrl}`,
      siteName: "Writing Desk",
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description: book.description || "",
    },
  };
}

export default async function BookReaderPage({ params, searchParams }: BookPageProps) {
  const { slug } = await params;
  const chapterSlug = (await (searchParams || {})).chapter;

  // Fetch book with documents
  const book = await prisma.book.findUnique({
    where: { id: slug },
    include: {
      documents: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!book) {
    notFound();
  }

  // Find the current chapter
  const currentChapter = chapterSlug
    ? (book.documents as Document[]).find((doc) => doc.slug === chapterSlug)
    : null;

  // Use the current chapter if specified, otherwise first chapter
  const activeChapter = currentChapter || (book.documents as Document[])[0] || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <article className="max-w-3xl mx-auto py-12 px-4">
        {/* Book Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {book.title}
          </h1>
          {book.description && (
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              {book.description}
            </p>
          )}

          {/* Social Sharing */}
          <SocialShare
            title={book.title}
            description={book.description || ""}
          />
        </header>

        {/* Chapter Content */}
        {activeChapter ? (
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              {activeChapter.title}
            </h2>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: activeChapter.content }}
            />
          </section>
        ) : (
          <section>
            <p className="text-gray-500 dark:text-gray-400">
              No chapters are available yet.
            </p>
          </section>
        )}

        {/* Chapter List */}
        {(book.documents as Document[]).length > 0 && (
          <section className="mt-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Chapters
            </h3>
            <ul className="space-y-2">
              {(book.documents as Document[]).map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/books/${slug}${doc.slug ? `?chapter=${doc.slug}` : ""}`}
                    className={`block py-2 px-3 rounded-md transition-colors ${
                      doc.slug === chapterSlug
                        ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 font-medium"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </div>
  );
}