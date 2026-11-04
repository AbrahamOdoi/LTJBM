-- Phase E: online giving checkout + live outbox fields

-- AlterTable MessageOutbox
ALTER TABLE "MessageOutbox" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "MessageOutbox" ADD COLUMN "error" TEXT;

-- CreateEnum
CREATE TYPE "GivingProvider" AS ENUM ('Paystack', 'MoMo', 'Demo');
CREATE TYPE "GivingCheckoutStatus" AS ENUM ('Pending', 'AwaitingProvider', 'Paid', 'Failed', 'Cancelled', 'Expired');

-- CreateTable
CREATE TABLE "OnlineGivingCheckout" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "provider" "GivingProvider" NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "GivingCheckoutStatus" NOT NULL DEFAULT 'Pending',
    "memberId" TEXT,
    "obligationId" TEXT,
    "giftKindCode" TEXT,
    "payerEmail" TEXT,
    "payerPhone" TEXT,
    "payerName" TEXT,
    "providerRef" TEXT,
    "authorizationUrl" TEXT,
    "demoMode" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OnlineGivingCheckout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnlineGivingCheckout_reference_key" ON "OnlineGivingCheckout"("reference");
CREATE UNIQUE INDEX "OnlineGivingCheckout_paymentId_key" ON "OnlineGivingCheckout"("paymentId");
CREATE INDEX "OnlineGivingCheckout_status_createdAt_idx" ON "OnlineGivingCheckout"("status", "createdAt");
CREATE INDEX "OnlineGivingCheckout_memberId_idx" ON "OnlineGivingCheckout"("memberId");
CREATE INDEX "OnlineGivingCheckout_provider_idx" ON "OnlineGivingCheckout"("provider");

ALTER TABLE "OnlineGivingCheckout" ADD CONSTRAINT "OnlineGivingCheckout_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineGivingCheckout" ADD CONSTRAINT "OnlineGivingCheckout_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineGivingCheckout" ADD CONSTRAINT "OnlineGivingCheckout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
