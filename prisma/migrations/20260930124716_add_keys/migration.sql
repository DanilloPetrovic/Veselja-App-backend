/*
  Warnings:

  - Added the required column `file_key` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN "cover_image_key" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_url" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "guest_session_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_media" ("created_at", "event_id", "file_size", "file_type", "file_url", "guest_session_id", "id", "mime_type") SELECT "created_at", "event_id", "file_size", "file_type", "file_url", "guest_session_id", "id", "mime_type" FROM "media";
DROP TABLE "media";
ALTER TABLE "new_media" RENAME TO "media";
CREATE INDEX "media_event_id_idx" ON "media"("event_id");
CREATE INDEX "media_guest_session_id_idx" ON "media"("guest_session_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
