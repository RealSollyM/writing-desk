import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0;

async function getBooks() {
  return prisma.book.findMany({
    where: {
      isPublished: true,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      cover: true,
      isPublic: true,
      collection: {
        select: {
          title: true,
          slug: true,
        },
      },
      _count: {
        select: { documents: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function BooksPage() {
  const books = await getBooks();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Published Books
        </h1>

        {books.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No published books yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.slug || book.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {book.cover ? (
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 text-2xl font-bold">
                      {book.title.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {book.title}
                  </h2>
                  {book.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
                      {book.description}
                    </p>
                  )}
                  {book.collection && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      From: {book.collection.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {book._count.documents} chapter
                    {book._count.documents !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}