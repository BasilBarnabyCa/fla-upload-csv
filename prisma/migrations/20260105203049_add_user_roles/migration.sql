-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ISSUE_SAS', 'UPLOAD_COMPLETE', 'UPLOAD_FAILED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'USER_CREATED');

-- CreateTable
CREATE TABLE "upload_sessions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'internal',
    "userId" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_files" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" VARCHAR(64),
    "blobPath" TEXT NOT NULL,
    "etag" TEXT,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "uploadSessionId" TEXT,
    "ipHash" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detailsJson" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_sessions_createdAt_idx" ON "upload_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "upload_sessions_userId_idx" ON "upload_sessions"("userId");

-- CreateIndex
CREATE INDEX "upload_files_uploadSessionId_idx" ON "upload_files"("uploadSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_uploadSessionId_idx" ON "audit_logs"("uploadSessionId");

-- AddForeignKey
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_files" ADD CONSTRAINT "upload_files_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "upload_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_uploadSessionId_fkey" FOREIGN KEY ("uploadSessionId") REFERENCES "upload_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
