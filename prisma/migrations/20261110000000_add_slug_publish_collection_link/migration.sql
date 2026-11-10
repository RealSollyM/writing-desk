-- Migration for slug, publish flags, and collection link fields

-- Add columns to documents table
ALTER TABLE "documents" ADD COLUMN "slug" TEXT;
ALTER TABLE "documents" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "collectionId" TEXT;

-- Add columns to books table
ALTER TABLE "books" ADD COLUMN "slug" TEXT;
ALTER TABLE "books" ADD COLUMN "cover" TEXT;
ALTER TABLE "books" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "books" ADD COLUMN "collectionId" TEXT;

-- Create collections table
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "cover" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "documents_slug_key" ON "documents"("slug");
CREATE INDEX "documents_isPublished_idx" ON "documents"("isPublished");
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");
CREATE INDEX "books_isPublished_idx" ON "books"("isPublished");
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE INDEX "collections_isPublished_idx" ON "collections"("isPublished");

-- Add foreign key constraints
ALTER TABLE "documents" ADD CONSTRAINT "documents_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add many-to-many relation table for Collection -> Document
-- (Already handled by collectionId on documents)

-- Add many-to-many relation table for Collection -> Book
-- (Already handled by collectionId on books)