-- CreateEnum
CREATE TYPE "RegistrationFeeChoice" AS ENUM ('PAY_NOW', 'EARN_FIRST');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'GENERATED', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('REGISTRATION', 'COMMISSION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "tutors" ADD COLUMN "registration_fee_choice" "RegistrationFeeChoice";

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "agreement_id" TEXT NOT NULL,
    "monthly_fee" INTEGER NOT NULL,
    "commission_gross" INTEGER NOT NULL,
    "commission_taxable" DECIMAL(12,2) NOT NULL,
    "commission_gst" DECIMAL(12,2) NOT NULL,
    "registration_gross" INTEGER NOT NULL DEFAULT 0,
    "registration_taxable" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "registration_gst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "gst_amount" DECIMAL(12,2) NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'GENERATED',
    "due_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "waived_reason" TEXT,
    "invoice_pdf_url" TEXT,
    "invoice_storage_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "payer_id" TEXT NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "gross_amount" INTEGER NOT NULL,
    "taxable_amount" DECIMAL(12,2) NOT NULL,
    "gst_amount" DECIMAL(12,2) NOT NULL,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_signature" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "receipt_url" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commissions_agreement_id_key" ON "commissions"("agreement_id");

-- CreateIndex
CREATE UNIQUE INDEX "commissions_tutor_id_student_id_key" ON "commissions"("tutor_id", "student_id");

-- CreateIndex
CREATE INDEX "commissions_tutor_id_status_idx" ON "commissions"("tutor_id", "status");

-- CreateIndex
CREATE INDEX "commissions_status_due_at_idx" ON "commissions"("status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_order_id_key" ON "payments"("gateway_order_id");

-- CreateIndex
CREATE INDEX "payments_payer_id_type_idx" ON "payments"("payer_id", "type");

-- CreateIndex
CREATE INDEX "payments_entity_type_entity_id_idx" ON "payments"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_event_idx" ON "notifications"("event");

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_fkey" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
