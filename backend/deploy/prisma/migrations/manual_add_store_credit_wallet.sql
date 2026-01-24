-- Phase 5C: Store Credit & Loyalty Wallet System
-- This migration adds the store credit wallet and transaction tracking

-- Create transaction type enum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- Create transaction source enum
CREATE TYPE "WalletTransactionSource" AS ENUM (
    'REFUND',
    'LOYALTY',
    'ADMIN',
    'PROMO',
    'ORDER_PAYMENT'
);

-- Create store credit wallets table
CREATE TABLE "store_credit_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_credit_wallets_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on userId
CREATE UNIQUE INDEX "store_credit_wallets_userId_key" ON "store_credit_wallets"("userId");

-- Create index for performance
CREATE INDEX "store_credit_wallets_userId_idx" ON "store_credit_wallets"("userId");

-- Create wallet transactions ledger table
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "source" "WalletTransactionSource" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "reference" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for wallet transactions
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");
CREATE INDEX "wallet_transactions_source_idx" ON "wallet_transactions"("source");
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");
CREATE INDEX "wallet_transactions_reference_idx" ON "wallet_transactions"("reference");

-- Add wallet usage field to orders table
ALTER TABLE "orders" ADD COLUMN "walletUsed" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- Add foreign key constraints
ALTER TABLE "store_credit_wallets" 
    ADD CONSTRAINT "store_credit_wallets_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wallet_transactions" 
    ADD CONSTRAINT "wallet_transactions_walletId_fkey" 
    FOREIGN KEY ("walletId") REFERENCES "store_credit_wallets"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments explaining the schema
COMMENT ON TABLE "store_credit_wallets" IS 'Phase 5C: User store credit and loyalty wallet balances';
COMMENT ON TABLE "wallet_transactions" IS 'Phase 5C: Immutable ledger of all wallet transactions';
COMMENT ON COLUMN "orders"."walletUsed" IS 'Phase 5C: Amount of wallet credit applied to this order';
COMMENT ON COLUMN "wallet_transactions"."metadata" IS 'JSON string with additional transaction details';
