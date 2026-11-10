-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "bookId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Part_bookId_slug_key" ON "Part"("bookId", "slug");

-- CreateIndex
CREATE INDEX "Part_bookId_order_idx" ON "Part"("bookId", "order");

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "slug" TEXT;
ALTER TABLE "documents" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "documents" ADD COLUMN "partId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "documents_bookId_slug_key" ON "documents"("bookId", "slug");

-- CreateIndex
CREATE INDEX "documents_partId_idx" ON "documents"("partId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;