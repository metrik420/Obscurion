-- AlterEnum - Convert role column to UserRole enum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MODERATOR', 'VIP', 'USER');

-- Add new columns to User table
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "tosAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "tosAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "agreedToTerms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "agreedToTermsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "dataDeleteRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "dataDeleteRequestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastLogin" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "loginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastLoginAttempt" TIMESTAMP(3);

-- Update role column type and data (convert 'user' to 'USER', etc.)
UPDATE "User" SET "role" = 'USER' WHERE "role" = 'user';
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'admin';
UPDATE "User" SET "role" = 'MODERATOR' WHERE "role" = 'moderator';
UPDATE "User" SET "role" = 'VIP' WHERE "role" = 'vip';

-- Now alter the type
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (CASE
    WHEN "role" = 'user' THEN 'USER'::"UserRole"
    WHEN "role" = 'admin' THEN 'ADMIN'::"UserRole"
    WHEN "role" = 'moderator' THEN 'MODERATOR'::"UserRole"
    WHEN "role" = 'vip' THEN 'VIP'::"UserRole"
    ELSE 'USER'::"UserRole"
END);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";

-- Create AuditLog table
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuditLog_adminEmail_fkey" FOREIGN KEY ("adminEmail") REFERENCES "User" ("email") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "AuditLog_adminEmail_idx" ON "AuditLog"("adminEmail");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- Create ComplianceLog table
CREATE TABLE "ComplianceLog" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ComplianceLog_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User" ("email") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX "ComplianceLog_userEmail_idx" ON "ComplianceLog"("userEmail");
CREATE INDEX "ComplianceLog_createdAt_idx" ON "ComplianceLog"("createdAt");
CREATE INDEX "ComplianceLog_event_idx" ON "ComplianceLog"("event");
