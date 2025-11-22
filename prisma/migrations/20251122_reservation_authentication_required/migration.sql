-- BREAKING CHANGE: Delete all existing reservations (cannot migrate without userId)
DELETE FROM Reservation WHERE 1=1;

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "loginMessage" TEXT,
    "loginMessageUpdatedAt" DATETIME,
    "loginMessageUpdatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reservation_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reservation" ("id", "reservedAt", "wishId") SELECT "id", "reservedAt", "wishId" FROM "Reservation";
DROP TABLE "Reservation";
ALTER TABLE "new_Reservation" RENAME TO "Reservation";
CREATE INDEX "Reservation_wishId_idx" ON "Reservation"("wishId");
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

