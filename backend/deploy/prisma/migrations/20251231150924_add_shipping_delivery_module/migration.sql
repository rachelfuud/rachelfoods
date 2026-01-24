-- CreateEnum
CREATE TYPE "DeliveryAgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('PENDING', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "delivery_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "licenseNumber" TEXT,
    "serviceZipCodes" TEXT[],
    "maxDeliveryDistance" DECIMAL(10,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "DeliveryAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "successfulDeliveries" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_assignments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "agentId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "status" "ShippingStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveryNotes" TEXT,
    "deliveryProof" TEXT,
    "failureReason" TEXT,
    "estimatedDeliveryTime" TIMESTAMP(3),
    "actualDeliveryTime" TIMESTAMP(3),

    CONSTRAINT "shipping_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_logs" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "fromStatus" "ShippingStatus",
    "toStatus" "ShippingStatus" NOT NULL,
    "changedBy" TEXT,
    "notes" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_agents_userId_key" ON "delivery_agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_agents_agentCode_key" ON "delivery_agents"("agentCode");

-- CreateIndex
CREATE INDEX "delivery_agents_userId_idx" ON "delivery_agents"("userId");

-- CreateIndex
CREATE INDEX "delivery_agents_agentCode_idx" ON "delivery_agents"("agentCode");

-- CreateIndex
CREATE INDEX "delivery_agents_isAvailable_idx" ON "delivery_agents"("isAvailable");

-- CreateIndex
CREATE INDEX "delivery_agents_status_idx" ON "delivery_agents"("status");

-- CreateIndex
CREATE INDEX "shipping_assignments_orderId_idx" ON "shipping_assignments"("orderId");

-- CreateIndex
CREATE INDEX "shipping_assignments_agentId_idx" ON "shipping_assignments"("agentId");

-- CreateIndex
CREATE INDEX "shipping_assignments_status_idx" ON "shipping_assignments"("status");

-- CreateIndex
CREATE INDEX "shipping_assignments_assignedAt_idx" ON "shipping_assignments"("assignedAt");

-- CreateIndex
CREATE INDEX "shipping_logs_assignmentId_idx" ON "shipping_logs"("assignmentId");

-- CreateIndex
CREATE INDEX "shipping_logs_toStatus_idx" ON "shipping_logs"("toStatus");

-- CreateIndex
CREATE INDEX "shipping_logs_createdAt_idx" ON "shipping_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "delivery_agents" ADD CONSTRAINT "delivery_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_assignments" ADD CONSTRAINT "shipping_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_assignments" ADD CONSTRAINT "shipping_assignments_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "delivery_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_logs" ADD CONSTRAINT "shipping_logs_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "shipping_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
