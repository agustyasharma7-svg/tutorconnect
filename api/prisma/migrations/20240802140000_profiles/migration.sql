-- CreateEnum
CREATE TYPE "RegistrationFeeStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED', 'REFUNDED');
CREATE TYPE "TeachingMode" AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE "WeekDay" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');
CREATE TYPE "DocumentType" AS ENUM ('PHOTO', 'CERTIFICATE', 'OTHER');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tutors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "experience_years" INTEGER,
    "photo_url" TEXT,
    "registration_fee_status" "RegistrationFeeStatus" NOT NULL DEFAULT 'PENDING',
    "teaching_radius_km" INTEGER,
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_discoverable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tutors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_hi" TEXT NOT NULL,
    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tutor_subjects" (
    "tutor_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    CONSTRAINT "tutor_subjects_pkey" PRIMARY KEY ("tutor_id","subject_id")
);

CREATE TABLE "tutor_classes" (
    "tutor_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    CONSTRAINT "tutor_classes_pkey" PRIMARY KEY ("tutor_id","class_id")
);

CREATE TABLE "tutor_boards" (
    "tutor_id" TEXT NOT NULL,
    "board_id" TEXT NOT NULL,
    CONSTRAINT "tutor_boards_pkey" PRIMARY KEY ("tutor_id","board_id")
);

CREATE TABLE "tutor_availability" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "day" "WeekDay" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "mode" "TeachingMode" NOT NULL,
    CONSTRAINT "tutor_availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tutor_documents" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tutor_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");
CREATE UNIQUE INDEX "tutors_user_id_key" ON "tutors"("user_id");
CREATE UNIQUE INDEX "subjects_name_en_key" ON "subjects"("name_en");
CREATE UNIQUE INDEX "classes_name_en_key" ON "classes"("name_en");
CREATE UNIQUE INDEX "boards_name_en_key" ON "boards"("name_en");
CREATE INDEX "tutor_availability_tutor_id_idx" ON "tutor_availability"("tutor_id");
CREATE INDEX "tutor_documents_tutor_id_idx" ON "tutor_documents"("tutor_id");
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- FKs
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_classes" ADD CONSTRAINT "tutor_classes_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_classes" ADD CONSTRAINT "tutor_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_boards" ADD CONSTRAINT "tutor_boards_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_boards" ADD CONSTRAINT "tutor_boards_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_availability" ADD CONSTRAINT "tutor_availability_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tutor_documents" ADD CONSTRAINT "tutor_documents_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
