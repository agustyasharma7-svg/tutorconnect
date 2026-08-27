-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'OPEN', 'APPLIED', 'SHORTLISTED', 'MATCHED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementMode" AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('INVITED', 'APPLIED', 'SHORTLISTED', 'ACCEPTED', 'MATCHED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    "budget_min" INTEGER NOT NULL,
    "budget_max" INTEGER NOT NULL,
    "mode" "RequirementMode" NOT NULL,
    "schedule_days" "WeekDay"[],
    "schedule_time" TEXT,
    "duration_mins" INTEGER NOT NULL DEFAULT 60,
    "pincode" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "message" TEXT,
    "proposed_fee" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "requirements_status_subject_id_idx" ON "requirements"("status", "subject_id");

-- CreateIndex
CREATE INDEX "requirements_student_id_idx" ON "requirements"("student_id");

-- CreateIndex
CREATE INDEX "matches_requirement_id_status_idx" ON "matches"("requirement_id", "status");

-- CreateIndex
CREATE INDEX "matches_tutor_id_idx" ON "matches"("tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_requirement_id_tutor_id_key" ON "matches"("requirement_id", "tutor_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_match_id_key" ON "applications"("match_id");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
