-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('PAYMENT', 'CONDUCT', 'SCHEDULE', 'QUALITY', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'AADHAAR';
ALTER TYPE "DocumentType" ADD VALUE 'PAN';
ALTER TYPE "DocumentType" ADD VALUE 'DEGREE';

-- AlterTable tutors
ALTER TABLE "tutors" ADD COLUMN "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "tutors" ADD COLUMN "is_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tutors" ADD COLUMN "verification_reject_reason" TEXT;
ALTER TABLE "tutors" ADD COLUMN "rating_avg" DOUBLE PRECISION;
ALTER TABLE "tutors" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "tutors_verification_status_idx" ON "tutors"("verification_status");
CREATE INDEX "tutors_is_verified_idx" ON "tutors"("is_verified");

-- AlterTable tutor_documents
ALTER TABLE "tutor_documents" ADD COLUMN "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "tutor_documents" ADD COLUMN "pii_ciphertext" TEXT;
ALTER TABLE "tutor_documents" ADD COLUMN "pii_last4" TEXT;
ALTER TABLE "tutor_documents" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "tutor_documents" ADD COLUMN "reviewed_by" TEXT;

CREATE INDEX "tutor_documents_verification_status_idx" ON "tutor_documents"("verification_status");

-- CreateTable ratings
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "rater_user_id" TEXT NOT NULL,
    "ratee_user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "review" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_agreement_id_rater_user_id_key" ON "ratings"("agreement_id", "rater_user_id");
CREATE INDEX "ratings_ratee_user_id_idx" ON "ratings"("ratee_user_id");

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_user_id_fkey" FOREIGN KEY ("rater_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_user_id_fkey" FOREIGN KEY ("ratee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable disputes
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "raised_by_user_id" TEXT NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "evidence_urls" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "disputes_status_idx" ON "disputes"("status");
CREATE INDEX "disputes_agreement_id_idx" ON "disputes"("agreement_id");

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_raised_by_user_id_fkey" FOREIGN KEY ("raised_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
