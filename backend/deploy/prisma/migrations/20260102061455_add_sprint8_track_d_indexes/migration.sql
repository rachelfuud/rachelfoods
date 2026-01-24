-- Sprint 8 Track D: Performance Indexes
-- Reference: SPRINT_8_TRACK_D_HARDENING.md - Database Indexing

-- Composite index for wallet balance queries (Track D)
CREATE INDEX "ledger_entries_walletId_amount_idx" ON "ledger_entries"("walletId", "amount");

-- Composite index for agent active assignments (Track D)
CREATE INDEX "shipping_assignments_agentId_status_assignedAt_idx" ON "shipping_assignments"("agentId", "status", "assignedAt");

-- Index for ledger entries by creation date (DESC for recent queries) (Track D)
CREATE INDEX "ledger_entries_createdAt_desc_idx" ON "ledger_entries"("createdAt" DESC);

-- Partial index for SLA queries on delivered assignments (Track B metrics)
CREATE INDEX "shipping_assignments_delivered_sla_idx" ON "shipping_assignments"("status", "deliveredAt", "estimatedDeliveryTime") WHERE "status" = 'DELIVERED';

-- GIN index for zip code array queries (Track B geographic coverage)
CREATE INDEX "delivery_agents_service_zip_codes_gin_idx" ON "delivery_agents" USING GIN ("serviceZipCodes");
