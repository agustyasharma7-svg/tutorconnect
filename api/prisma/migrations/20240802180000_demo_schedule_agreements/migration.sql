-- CreateEnum
CREATE TYPE "DemoClassStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RELEASED');

-- CreateEnum
CREATE TYPE "SlotSource" AS ENUM ('DEMO', 'AGREEMENT');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'PENDING_STUDENT_SIGN', 'PENDING_TUTOR_SIGN', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "demo_classes" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER NOT NULL DEFAULT 45,
    "mode" "TeachingMode" NOT NULL,
    "status" "DemoClassStatus" NOT NULL DEFAULT 'SCHEDULED',
    "join_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agreements" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "monthly_fee" INTEGER NOT NULL,
    "schedule_json" JSONB NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_url" TEXT,
    "pdf_storage_key" TEXT,
    "student_signed_at" TIMESTAMP(3),
    "tutor_signed_at" TIMESTAMP(3),
    "student_sign_ip" TEXT,
    "tutor_sign_ip" TEXT,
    "terms_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'OCCUPIED',
    "source" "SlotSource" NOT NULL,
    "agreement_id" TEXT,
    "demo_class_id" TEXT,
    "mode" "TeachingMode",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_classes_match_id_key" ON "demo_classes"("match_id");

-- CreateIndex
CREATE INDEX "demo_classes_scheduled_at_idx" ON "demo_classes"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "agreements_match_id_key" ON "agreements"("match_id");

-- CreateIndex
CREATE INDEX "agreements_status_idx" ON "agreements"("status");

-- CreateIndex
CREATE INDEX "schedule_slots_tutor_id_start_at_idx" ON "schedule_slots"("tutor_id", "start_at");

-- CreateIndex
CREATE INDEX "schedule_slots_agreement_id_idx" ON "schedule_slots"("agreement_id");

-- AddForeignKey
ALTER TABLE "demo_classes" ADD CONSTRAINT "demo_classes_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
