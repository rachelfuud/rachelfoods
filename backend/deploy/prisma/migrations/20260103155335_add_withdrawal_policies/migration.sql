-- CreateTable
CREATE TABLE "withdrawal_policies" (
    "id" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "role" TEXT,
    "currency" TEXT NOT NULL,
    "dailyAmountLimit" DECIMAL(15,2),
    "weeklyAmountLimit" DECIMAL(15,2),
    "monthlyAmountLimit" DECIMAL(15,2),
    "dailyCountLimit" INTEGER,
    "weeklyCountLimit" INTEGER,
    "monthlyCountLimit" INTEGER,
    "maxSingleWithdrawal" DECIMAL(15,2),
    "minSingleWithdrawal" DECIMAL(15,2),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "withdrawal_policies_scopeType_enabled_idx" ON "withdrawal_policies"("scopeType", "enabled");

-- CreateIndex
CREATE INDEX "withdrawal_policies_role_enabled_idx" ON "withdrawal_policies"("role", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "withdrawal_policies_scopeType_role_currency_key" ON "withdrawal_policies"("scopeType", "role", "currency");
