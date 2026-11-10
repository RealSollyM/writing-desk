import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

interface BookWithContent {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  cover: string | null;
  collection: {
    title: string;
    slug: string;
    description: string | null;
  } | null;
  documents: Array<{
    id: string;
    title: string;
    slug: string | null;
    content: string;
    createdAt: Date;
  }>;
}

async function getBook(slug: string): Promise<BookWithContent | null> {
  return prisma.book.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isPublic: true,
      cover: true,
      collection: {
        select: {
          title: true,
          slug: true,
          description: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export default async function BookReaderPage({
  params,
}: {
  params: { id: string };
}) {
  const book = await getBook(params.id);

  if (!book) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with back link */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <Link
            href="/books"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back to Books
          </Link>
        </div>
      </nav>

      {/* Book Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {book.cover && (
              <img
                src={book.cover}
                alt={book.title}
                className="w-32 h-48 object-cover rounded-lg"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {book.title}
              </h1>
              {book.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  {book.description}
                </p>
              )}
              {book.collection && (
                <Link
                  href={`/books?collection=${book.collection.slug}`}
                  className="text-indigo-600 hover:text-indigo-700 text-sm mt-2 inline-block"
                >
                  Series: {book.collection.title}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Table of Contents */}
      {book.documents.length > 0 && (
        <aside className="border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Table of Contents
            </h2>
            <ul className="space-y-2">
              {book.documents.map((doc, index) => (
                <li key={doc.id}>
                  <Link
                    href={`/books/${book.slug || book.id}?chapter=${index + 1}`}
                    className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 block py-1"
                  >
                    <span className="text-gray-500 dark:text-gray-500 mr-2">
                      Chapter {index + 1}
                    </span>
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}

      {/* Content Area - Reader Mode */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {book.documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No chapters published yet.
            </p>
          </div>
        ) : (
          <article className="prose prose-lg max-w-none dark:prose-invert">
            {book.documents.map((doc, index) => (
              <section key={doc.id} className={index === 0 ? "" : "mt-12 pt-12 border-t border-gray-200 dark:border-gray-700"}>
                <h2>{doc.title}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: doc.content.replace(/\n/g, "\n"),
                  }}
                />
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  );
}