-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'WITHDRAWAL_DEBIT';
ALTER TYPE "LedgerEntryType" ADD VALUE 'WITHDRAWAL_FEE';

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "payoutProvider" TEXT,
ADD COLUMN     "payoutReference" TEXT,
ADD COLUMN     "payoutTransactionId" TEXT;
