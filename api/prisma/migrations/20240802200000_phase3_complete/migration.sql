-- AlterTable
ALTER TABLE "demo_classes" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "demo_classes_status_scheduled_at_idx" ON "demo_classes"("status", "scheduled_at");

-- CreateTable
CREATE TABLE "tutor_availability_exceptions" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutor_availability_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tutor_availability_exceptions_tutor_id_date_idx" ON "tutor_availability_exceptions"("tutor_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "tutor_availability_exceptions_tutor_id_date_key" ON "tutor_availability_exceptions"("tutor_id", "date");

-- AddForeignKey
ALTER TABLE "tutor_availability_exceptions" ADD CONSTRAINT "tutor_availability_exceptions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
