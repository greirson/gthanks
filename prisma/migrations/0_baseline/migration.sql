-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenIv" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GroupInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    FOREIGN KEY ("invitedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "password" TEXT,
    "shareToken" TEXT,
    "slug" TEXT,
    "hideFromProfile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "giftCardPreferences" TEXT DEFAULT '[]',
    FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListAdmin" (
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,

    PRIMARY KEY ("listId", "userId"),
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListGroup" (
    "listId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sharedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sharedBy" TEXT NOT NULL,

    PRIMARY KEY ("listId", "groupId"),
    FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    FOREIGN KEY ("invitedBy") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListWish" (
    "listId" TEXT NOT NULL,
    "wishId" TEXT NOT NULL,
    "wishLevel" INTEGER NOT NULL DEFAULT 1,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("listId", "wishId"),
    FOREIGN KEY ("wishId") REFERENCES "Wish" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wishId" TEXT NOT NULL,
    "reserverName" TEXT,
    "reserverEmail" TEXT,
    "accessToken" TEXT,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" DATETIME,
    FOREIGN KEY ("wishId") REFERENCES "Wish" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "suspendedAt" DATETIME,
    "suspendedBy" TEXT,
    "suspensionReason" TEXT,
    "themePreference" TEXT DEFAULT 'system',
    "isOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "usernameSetAt" DATETIME,
    "canUseVanityUrls" BOOLEAN NOT NULL DEFAULT true,
    "showPublicProfile" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "UserEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" DATETIME,
    "verificationToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,

    PRIMARY KEY ("userId", "groupId"),
    FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sortBy" TEXT NOT NULL DEFAULT 'createdAt',
    "sortOrder" TEXT NOT NULL DEFAULT 'desc',
    "wishLevelMin" INTEGER,
    "wishLevelMax" INTEGER,
    "priceMin" REAL,
    "priceMax" REAL,
    "autoAcceptGroupInvitations" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "url" TEXT,
    "price" REAL,
    "currency" TEXT,
    "imageUrl" TEXT,
    "sourceImageUrl" TEXT,
    "localImagePath" TEXT,
    "imageStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "size" TEXT,
    "color" TEXT,
    "wishLevel" INTEGER NOT NULL DEFAULT 1,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_invitedBy_createdAt_idx" ON "GroupInvitation"("invitedBy" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_email_acceptedAt_idx" ON "GroupInvitation"("email" ASC, "acceptedAt" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_acceptedAt_idx" ON "GroupInvitation"("groupId" ASC, "acceptedAt" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_expiresAt_idx" ON "GroupInvitation"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_invitedBy_idx" ON "GroupInvitation"("invitedBy" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_token_idx" ON "GroupInvitation"("token" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_email_idx" ON "GroupInvitation"("email" ASC);

-- CreateIndex
CREATE INDEX "GroupInvitation_groupId_idx" ON "GroupInvitation"("groupId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "GroupInvitation_token_key" ON "GroupInvitation"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "List_ownerId_slug_key" ON "List"("ownerId" ASC, "slug" ASC);

-- CreateIndex
CREATE INDEX "List_ownerId_hideFromProfile_idx" ON "List"("ownerId" ASC, "hideFromProfile" ASC);

-- CreateIndex
CREATE INDEX "List_slug_idx" ON "List"("slug" ASC);

-- CreateIndex
CREATE INDEX "List_createdAt_idx" ON "List"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "List_ownerId_visibility_idx" ON "List"("ownerId" ASC, "visibility" ASC);

-- CreateIndex
CREATE INDEX "List_shareToken_idx" ON "List"("shareToken" ASC);

-- CreateIndex
CREATE INDEX "List_ownerId_idx" ON "List"("ownerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "List_shareToken_key" ON "List"("shareToken" ASC);

-- CreateIndex
CREATE INDEX "ListAdmin_userId_idx" ON "ListAdmin"("userId" ASC);

-- CreateIndex
CREATE INDEX "ListAdmin_listId_idx" ON "ListAdmin"("listId" ASC);

-- CreateIndex
CREATE INDEX "ListGroup_listId_groupId_idx" ON "ListGroup"("listId" ASC, "groupId" ASC);

-- CreateIndex
CREATE INDEX "ListGroup_groupId_sharedAt_idx" ON "ListGroup"("groupId" ASC, "sharedAt" ASC);

-- CreateIndex
CREATE INDEX "ListGroup_groupId_idx" ON "ListGroup"("groupId" ASC);

-- CreateIndex
CREATE INDEX "ListGroup_listId_idx" ON "ListGroup"("listId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ListInvitation_listId_email_key" ON "ListInvitation"("listId" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_email_acceptedAt_idx" ON "ListInvitation"("email" ASC, "acceptedAt" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_listId_acceptedAt_idx" ON "ListInvitation"("listId" ASC, "acceptedAt" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_expiresAt_idx" ON "ListInvitation"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_invitedBy_idx" ON "ListInvitation"("invitedBy" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_token_idx" ON "ListInvitation"("token" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_email_idx" ON "ListInvitation"("email" ASC);

-- CreateIndex
CREATE INDEX "ListInvitation_listId_idx" ON "ListInvitation"("listId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ListInvitation_token_key" ON "ListInvitation"("token" ASC);

-- CreateIndex
CREATE INDEX "ListWish_wishId_idx" ON "ListWish"("wishId" ASC);

-- CreateIndex
CREATE INDEX "ListWish_listId_idx" ON "ListWish"("listId" ASC);

-- CreateIndex
CREATE INDEX "MagicLink_token_idx" ON "MagicLink"("token" ASC);

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token" ASC);

-- CreateIndex
CREATE INDEX "Reservation_accessToken_idx" ON "Reservation"("accessToken" ASC);

-- CreateIndex
CREATE INDEX "Reservation_reserverEmail_idx" ON "Reservation"("reserverEmail" ASC);

-- CreateIndex
CREATE INDEX "Reservation_wishId_idx" ON "Reservation"("wishId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_accessToken_key" ON "Reservation"("accessToken" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "User_canUseVanityUrls_idx" ON "User"("canUseVanityUrls" ASC);

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username" ASC);

-- CreateIndex
CREATE INDEX "User_isAdmin_idx" ON "User"("isAdmin" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_userId_isPrimary_idx" ON "UserEmail"("userId" ASC, "isPrimary" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_verificationToken_idx" ON "UserEmail"("verificationToken" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_isVerified_idx" ON "UserEmail"("isVerified" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_isPrimary_idx" ON "UserEmail"("isPrimary" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_email_idx" ON "UserEmail"("email" ASC);

-- CreateIndex
CREATE INDEX "UserEmail_userId_idx" ON "UserEmail"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_verificationToken_key" ON "UserEmail"("verificationToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserEmail_email_key" ON "UserEmail"("email" ASC);

-- CreateIndex
CREATE INDEX "UserGroup_joinedAt_idx" ON "UserGroup"("joinedAt" ASC);

-- CreateIndex
CREATE INDEX "UserGroup_groupId_role_idx" ON "UserGroup"("groupId" ASC, "role" ASC);

-- CreateIndex
CREATE INDEX "UserGroup_groupId_idx" ON "UserGroup"("groupId" ASC);

-- CreateIndex
CREATE INDEX "UserGroup_userId_idx" ON "UserGroup"("userId" ASC);

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token" ASC);

-- CreateIndex
CREATE INDEX "Wish_ownerId_wishLevel_idx" ON "Wish"("ownerId" ASC, "wishLevel" ASC);

-- CreateIndex
CREATE INDEX "Wish_price_idx" ON "Wish"("price" ASC);

-- CreateIndex
CREATE INDEX "Wish_wishLevel_idx" ON "Wish"("wishLevel" ASC);

-- CreateIndex
CREATE INDEX "Wish_ownerId_createdAt_idx" ON "Wish"("ownerId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Wish_imageStatus_idx" ON "Wish"("imageStatus" ASC);

-- CreateIndex
CREATE INDEX "Wish_ownerId_idx" ON "Wish"("ownerId" ASC);

