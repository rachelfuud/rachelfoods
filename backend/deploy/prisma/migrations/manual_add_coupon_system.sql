-- Phase 5B: Add Coupon System
-- This migration adds the coupons table and updates orders table

-- Create CouponType enum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- Create coupons table
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "minOrderAmount" DECIMAL(10,2),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- Create unique index on coupon code
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- Create indexes for performance
CREATE INDEX "coupons_code_idx" ON "coupons"("code");
CREATE INDEX "coupons_isActive_idx" ON "coupons"("isActive");
CREATE INDEX "coupons_expiresAt_idx" ON "coupons"("expiresAt");

-- Add discount fields to orders table
ALTER TABLE "orders" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "couponCode" TEXT;

-- Add comment explaining the schema
COMMENT ON TABLE "coupons" IS 'Phase 5B: Coupon and promotion management';
COMMENT ON COLUMN "orders"."discountAmount" IS 'Phase 5B: Discount applied from coupon';
COMMENT ON COLUMN "orders"."couponCode" IS 'Phase 5B: Coupon code used for this order';
