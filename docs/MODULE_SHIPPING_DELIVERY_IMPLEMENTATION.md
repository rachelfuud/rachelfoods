# Shipping & Delivery Module - Implementation Guide

## Overview

The Shipping & Delivery Module provides comprehensive delivery management with agent tracking, status updates, and full integration with the Order Management system. It enables real-time tracking of deliveries from assignment to completion.

**Module Location**: `backend/src/shipping/`  
**Database Migration**: `20251231150924_add_shipping_delivery_module`  
**Status**: ✅ Fully Implemented

---

## Table of Contents

1. [Features](#features)
2. [Database Schema](#database-schema)
3. [Shipping Status Flow](#shipping-status-flow)
4. [API Endpoints](#api-endpoints)
5. [Integration with Orders](#integration-with-orders)
6. [RBAC & Permissions](#rbac--permissions)
7. [Usage Examples](#usage-examples)
8. [Testing Guide](#testing-guide)
9. [Troubleshooting](#troubleshooting)

---

## Features

### Delivery Agent Management
- ✅ Create and manage delivery agent profiles
- ✅ Track agent availability and service areas
- ✅ Vehicle information and licensing
- ✅ Performance metrics (success rate, total deliveries)
- ✅ Agent statistics and ratings

### Shipping Assignment
- ✅ Assign orders to delivery agents
- ✅ Auto-validation of agent service areas
- ✅ Estimated delivery time tracking
- ✅ Assignment history per order
- ✅ Reassignment capability

### Status Tracking
- ✅ 8-stage shipping status flow
- ✅ Real-time status updates
- ✅ Complete audit trail (ShippingLog)
- ✅ GPS location tracking support
- ✅ Delivery proof (photo/signature)

### Notifications
- ✅ Multi-channel notifications on status changes
- ✅ Buyer notifications for shipping updates
- ✅ Agent notifications for assignments
- ✅ Integration with existing NotificationService

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Delivery agents see only assigned orders
- ✅ Sellers/admins have full visibility
- ✅ Permission-based endpoint protection

---

## Database Schema

### DeliveryAgent Model

```prisma
model DeliveryAgent {
  id          String   @id @default(uuid())
  
  // Link to user account
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Agent information
  agentCode   String   @unique // e.g., DA-0001
  vehicleType String?  // bike, car, van, truck
  vehicleNumber String?
  licenseNumber String?
  
  // Service area
  serviceZipCodes String[] // Array of zip codes
  maxDeliveryDistance Decimal? @db.Decimal(10, 2)
  
  // Availability
  isAvailable Boolean  @default(true)
  status      DeliveryAgentStatus @default(ACTIVE)
  
  // Performance metrics
  totalDeliveries Int @default(0)
  successfulDeliveries Int @default(0)
  averageRating Decimal? @db.Decimal(3, 2)
  
  // Relationships
  assignments ShippingAssignment[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Key Fields**:
- `agentCode`: Auto-generated unique identifier (DA-0001, DA-0002, etc.)
- `serviceZipCodes`: Array of zip codes the agent serves
- `isAvailable`: Toggle for agent availability (on/off duty)
- `status`: ACTIVE, INACTIVE, SUSPENDED

---

### ShippingAssignment Model

```prisma
model ShippingAssignment {
  id        String   @id @default(uuid())
  
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  agentId   String?
  agent     DeliveryAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)
  
  // Assignment details
  assignedAt DateTime @default(now())
  assignedBy String?  // User ID who made the assignment
  
  // Status tracking
  status     ShippingStatus @default(PENDING)
  acceptedAt DateTime?
  pickedUpAt DateTime?
  inTransitAt DateTime?
  deliveredAt DateTime?
  
  // Delivery details
  deliveryNotes String?
  deliveryProof String? // Photo URL or signature
  failureReason String?
  
  // Estimated vs actual
  estimatedDeliveryTime DateTime?
  actualDeliveryTime    DateTime?
  
  // Relationships
  logs      ShippingLog[]
}
```

**Key Fields**:
- `status`: Current shipping status (8 possible values)
- `deliveryProof`: URL to photo or signature for delivery confirmation
- `estimatedDeliveryTime`: Set during assignment
- `actualDeliveryTime`: Set when delivered

---

### ShippingLog Model

```prisma
model ShippingLog {
  id           String   @id @default(uuid())
  
  assignmentId String
  assignment   ShippingAssignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  
  // Status change details
  fromStatus   ShippingStatus?
  toStatus     ShippingStatus
  
  // Context
  changedBy    String?  // User ID
  notes        String?
  location     String?  // GPS coordinates or address
  
  createdAt    DateTime @default(now())
}
```

**Purpose**: Complete audit trail of all status changes for transparency and debugging.

---

### Enums

#### DeliveryAgentStatus
```prisma
enum DeliveryAgentStatus {
  ACTIVE      // Available for assignments
  INACTIVE    // Temporarily unavailable
  SUSPENDED   // Suspended due to issues
}
```

#### ShippingStatus
```prisma
enum ShippingStatus {
  PENDING     // Assignment created, awaiting agent acceptance
  ASSIGNED    // Assigned to agent, not yet picked up
  ACCEPTED    // Agent accepted the assignment
  PICKED_UP   // Agent picked up the order
  IN_TRANSIT  // Order in transit to customer
  DELIVERED   // Successfully delivered
  FAILED      // Delivery failed
  CANCELLED   // Assignment cancelled
}
```

---

## Shipping Status Flow

### Complete Lifecycle

```
PENDING → ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED
   ↓         ↓          ↓           ↓            ↓
CANCELLED CANCELLED CANCELLED   FAILED       FAILED
```

### Status Descriptions

1. **PENDING**: Assignment created, awaiting agent assignment
2. **ASSIGNED**: Order assigned to agent, awaiting acceptance
3. **ACCEPTED**: Agent accepted assignment, preparing to pick up
4. **PICKED_UP**: Agent has the order, ready to deliver
5. **IN_TRANSIT**: Order is on the way to customer
6. **DELIVERED**: Successfully delivered to customer
7. **FAILED**: Delivery attempt failed (customer unavailable, wrong address, etc.)
8. **CANCELLED**: Assignment cancelled (order cancelled, agent unavailable, etc.)

### Status Transitions

Valid transitions enforce proper workflow:

| From Status | Valid Next Statuses |
|-------------|---------------------|
| PENDING | ASSIGNED, CANCELLED |
| ASSIGNED | ACCEPTED, CANCELLED |
| ACCEPTED | PICKED_UP, CANCELLED |
| PICKED_UP | IN_TRANSIT, FAILED |
| IN_TRANSIT | DELIVERED, FAILED |
| DELIVERED | _(final state)_ |
| FAILED | _(final state)_ |
| CANCELLED | _(final state)_ |

---

## API Endpoints

### Base URLs
- Delivery Agents: `/delivery-agents`
- Shipping: `/shipping`

All endpoints require authentication (`JwtAuthGuard`) and proper permissions (`PermissionsGuard`).

---

## Delivery Agent Endpoints

### 1. Create Delivery Agent

**Endpoint**: `POST /delivery-agents`  
**Permission**: `user.create`  
**Description**: Create a new delivery agent profile

**Request Body**:
```json
{
  "userId": "user123",
  "vehicleType": "bike",
  "vehicleNumber": "DL-01-AB-1234",
  "licenseNumber": "DL12345678",
  "serviceZipCodes": ["400001", "400002", "400003"],
  "maxDeliveryDistance": 25,
  "isAvailable": true
}
```

**Response**: `201 Created`
```json
{
  "id": "agent123",
  "agentCode": "DA-0001",
  "userId": "user123",
  "vehicleType": "bike",
  "vehicleNumber": "DL-01-AB-1234",
  "licenseNumber": "DL12345678",
  "serviceZipCodes": ["400001", "400002", "400003"],
  "maxDeliveryDistance": "25.00",
  "isAvailable": true,
  "status": "ACTIVE",
  "totalDeliveries": 0,
  "successfulDeliveries": 0,
  "user": {
    "id": "user123",
    "email": "agent@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2025-12-31T10:00:00.000Z"
}
```

---

### 2. Get All Delivery Agents

**Endpoint**: `GET /delivery-agents`  
**Permission**: `shipping.view`

**Query Parameters**:
- `isAvailable` - Filter by availability (true/false)
- `status` - Filter by status (ACTIVE, INACTIVE, SUSPENDED)
- `zipCode` - Find agents serving specific zip code

**Example**: `GET /delivery-agents?isAvailable=true&zipCode=400001`

**Response**: `200 OK`
```json
[
  {
    "id": "agent123",
    "agentCode": "DA-0001",
    "vehicleType": "bike",
    "isAvailable": true,
    "status": "ACTIVE",
    "user": {...},
    "_count": {
      "assignments": 45
    }
  }
]
```

---

### 3. Get My Profile (Agent)

**Endpoint**: `GET /delivery-agents/me`  
**Permission**: `shipping.view`  
**Description**: Get current logged-in agent's profile with active assignments

**Response**: `200 OK`
```json
{
  "id": "agent123",
  "agentCode": "DA-0001",
  "isAvailable": true,
  "user": {...},
  "assignments": [
    {
      "id": "assign123",
      "status": "IN_TRANSIT",
      "order": {
        "orderNumber": "ORD-2025-0001",
        "deliveryAddress": "123 Main Street",
        "totalCost": "1500.00"
      }
    }
  ]
}
```

---

### 4. Get Agent Statistics

**Endpoint**: `GET /delivery-agents/:id/statistics`  
**Permission**: `shipping.view`

**Response**: `200 OK`
```json
{
  "agentCode": "DA-0001",
  "totalAssignments": 150,
  "pendingAssignments": 2,
  "activeAssignments": 5,
  "completedAssignments": 140,
  "failedAssignments": 3,
  "successRate": "93.33%",
  "averageRating": "4.75",
  "isAvailable": true,
  "status": "ACTIVE"
}
```

---

### 5. Get Available Agents for Zip Code

**Endpoint**: `GET /delivery-agents/available/:zipCode`  
**Permission**: `shipping.assign`  
**Description**: Get all available agents serving a specific zip code

**Example**: `GET /delivery-agents/available/400001`

**Response**: `200 OK` - List of agents sorted by rating and experience

---

### 6. Update Delivery Agent

**Endpoint**: `PATCH /delivery-agents/:id`  
**Permission**: `user.update`

**Request Body**:
```json
{
  "vehicleType": "car",
  "serviceZipCodes": ["400001", "400002", "400003", "400004"],
  "isAvailable": false
}
```

---

### 7. Toggle Agent Availability

**Endpoint**: `POST /delivery-agents/:id/toggle-availability`  
**Permission**: `shipping.update_status`  
**Description**: Quick toggle for agent availability (on/off duty)

**Response**: `200 OK` - Updated agent with new `isAvailable` status

---

## Shipping Assignment Endpoints

### 8. Assign Order to Agent

**Endpoint**: `POST /shipping/assign`  
**Permission**: `shipping.assign`  
**Description**: Assign an order to a delivery agent

**Request Body**:
```json
{
  "orderId": "order123",
  "agentId": "agent123",
  "estimatedDeliveryTime": "2025-12-31T18:00:00Z",
  "deliveryNotes": "Please call before arrival"
}
```

**Validations**:
- Order must be in PAID or PREPARING status
- Agent must be ACTIVE
- Agent must serve the delivery zip code
- Order cannot have active assignment

**Response**: `201 Created`
```json
{
  "id": "assign123",
  "orderId": "order123",
  "agentId": "agent123",
  "status": "ASSIGNED",
  "assignedAt": "2025-12-31T10:00:00.000Z",
  "estimatedDeliveryTime": "2025-12-31T18:00:00.000Z",
  "order": {...},
  "agent": {...}
}
```

**Side Effects**:
- Order status updated to SHIPPING
- Order `shippedAt` timestamp set
- ShippingLog entry created
- Buyer notified via NotificationService

---

### 9. Get All Assignments

**Endpoint**: `GET /shipping/assignments`  
**Permission**: `shipping.view`

**Query Parameters**:
- `status` - Filter by shipping status
- `agentId` - Filter by agent
- `startDate` / `endDate` - Date range filter

**Example**: `GET /shipping/assignments?status=IN_TRANSIT`

---

### 10. Get My Assignments (Agent)

**Endpoint**: `GET /shipping/my-assignments`  
**Permission**: `shipping.view`  
**Description**: Get assignments for the logged-in delivery agent

**Query Parameters**:
- `status` - Filter by status

**Example**: `GET /shipping/my-assignments?status=ASSIGNED`

---

### 11. Get Assignment by ID

**Endpoint**: `GET /shipping/assignments/:id`  
**Permission**: `shipping.view`  
**Description**: Get detailed assignment info with logs

**Response**: `200 OK`
```json
{
  "id": "assign123",
  "status": "IN_TRANSIT",
  "assignedAt": "2025-12-31T10:00:00.000Z",
  "pickedUpAt": "2025-12-31T11:00:00.000Z",
  "inTransitAt": "2025-12-31T11:15:00.000Z",
  "estimatedDeliveryTime": "2025-12-31T18:00:00.000Z",
  "order": {
    "orderNumber": "ORD-2025-0001",
    "buyer": {...},
    "items": [...]
  },
  "agent": {...},
  "logs": [
    {
      "id": "log1",
      "fromStatus": null,
      "toStatus": "ASSIGNED",
      "changedBy": "seller123",
      "createdAt": "2025-12-31T10:00:00.000Z"
    },
    {
      "id": "log2",
      "fromStatus": "ASSIGNED",
      "toStatus": "ACCEPTED",
      "changedBy": "agent123",
      "createdAt": "2025-12-31T10:30:00.000Z"
    }
  ]
}
```

---

### 12. Update Shipping Status

**Endpoint**: `PATCH /shipping/assignments/:id/status`  
**Permission**: `shipping.update_status`  
**Description**: Update the status of a shipping assignment

**Authorization**:
- Assigned agent can update their own assignments
- Sellers and admins can update any assignment

**Request Body**:
```json
{
  "status": "DELIVERED",
  "notes": "Package delivered to recipient",
  "location": "19.0760, 72.8777",
  "deliveryProof": "https://storage.example.com/proof/abc123.jpg"
}
```

**For FAILED status**:
```json
{
  "status": "FAILED",
  "failureReason": "Customer not available, left note",
  "notes": "Called customer 3 times, no answer",
  "location": "19.0760, 72.8777"
}
```

**Response**: `200 OK`

**Side Effects**:
- ShippingLog entry created
- If DELIVERED: Order status → DELIVERED, agent stats updated, buyer notified
- If FAILED: Agent stats updated

---

### 13. Cancel Assignment

**Endpoint**: `POST /shipping/assignments/:id/cancel`  
**Permission**: `shipping.assign`

**Request Body**:
```json
{
  "reason": "Agent became unavailable"
}
```

**Response**: `200 OK`

**Note**: Cannot cancel delivered assignments

---

### 14. Get Shipping History for Order

**Endpoint**: `GET /shipping/orders/:orderId/history`  
**Permission**: `shipping.view`  
**Description**: Get complete shipping history for an order

**Response**: `200 OK`
```json
[
  {
    "id": "assign123",
    "status": "DELIVERED",
    "assignedAt": "2025-12-31T10:00:00.000Z",
    "deliveredAt": "2025-12-31T16:30:00.000Z",
    "agent": {
      "agentCode": "DA-0001",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    "logs": [...]
  }
]
```

---

### 15. Get Agent Assignments

**Endpoint**: `GET /shipping/agents/:agentId/assignments`  
**Permission**: `shipping.view`

**Query Parameters**:
- `status` - Filter by status

**Example**: `GET /shipping/agents/agent123/assignments?status=DELIVERED`

---

## Integration with Orders

### Order Status Synchronization

The Shipping Module automatically updates Order status:

| Shipping Status | Order Status Update |
|----------------|-------------------|
| ASSIGNED | SHIPPING (if PREPARING) |
| DELIVERED | DELIVERED |

### Order Requirements for Assignment

An order can be assigned when:
- Order status: `PAID` or `PREPARING`
- Payment status: Any (but typically `PAID`)
- No active shipping assignment exists

### Workflow Integration

1. **Order Confirmed**: Seller confirms order → Status: CONFIRMED
2. **Payment Received**: Payment received → Status: PAID
3. **Preparing**: Seller prepares order → Status: PREPARING
4. **Assign Delivery**: Seller assigns to agent → Status: SHIPPING
5. **Agent Accepts**: Agent accepts → Assignment status: ACCEPTED
6. **Picked Up**: Agent picks up → Assignment status: PICKED_UP
7. **In Transit**: Agent en route → Assignment status: IN_TRANSIT
8. **Delivered**: Agent delivers → Order status: DELIVERED

---

## RBAC & Permissions

### Required Permissions

| Permission | Description | Roles |
|-----------|-------------|-------|
| `shipping.view` | View shipping information | delivery-agent, store-owner, platform-admin |
| `shipping.assign` | Assign orders to agents | store-owner, platform-admin |
| `shipping.update_status` | Update shipping status | delivery-agent, store-owner, platform-admin |
| `shipping.override` | Override shipping decisions | platform-admin |
| `user.create` | Create delivery agents | platform-admin |
| `user.update` | Update agent profiles | platform-admin |

### Access Control Rules

#### Delivery Agents
- **Can view**: Only their assigned orders/assignments
- **Can update**: Status of their own assignments
- **Cannot**: Assign orders, view other agents' assignments

#### Store Owners
- **Can view**: All shipping assignments
- **Can assign**: Orders to any available agent
- **Can update**: Any shipping status
- **Can cancel**: Any assignment

#### Platform Admins
- **Full access** to all shipping operations
- Can create/manage delivery agents
- Can override any restrictions

---

## Usage Examples

### Example 1: Create Delivery Agent

```bash
POST /delivery-agents
Authorization: Bearer <admin_jwt>

{
  "userId": "user_abc123",
  "vehicleType": "bike",
  "vehicleNumber": "MH-01-AB-1234",
  "licenseNumber": "MH1234567890",
  "serviceZipCodes": ["400001", "400002", "400003"],
  "maxDeliveryDistance": 20
}
```

**Result**: Agent profile created with code DA-0001

---

### Example 2: Assign Order to Agent

```bash
POST /shipping/assign
Authorization: Bearer <seller_jwt>

{
  "orderId": "order_xyz789",
  "agentId": "agent_abc123",
  "estimatedDeliveryTime": "2025-12-31T18:00:00Z",
  "deliveryNotes": "Fragile items - handle with care"
}
```

**Result**:
- Shipping assignment created
- Order status → SHIPPING
- Agent notified
- Buyer notified

---

### Example 3: Agent Updates Status (Picked Up)

```bash
PATCH /shipping/assignments/assign123/status
Authorization: Bearer <agent_jwt>

{
  "status": "PICKED_UP",
  "notes": "Order picked up from store",
  "location": "19.0760, 72.8777"
}
```

**Result**: Status updated, log created

---

### Example 4: Agent Delivers Order

```bash
PATCH /shipping/assignments/assign123/status
Authorization: Bearer <agent_jwt>

{
  "status": "DELIVERED",
  "notes": "Package delivered to Mr. Sharma",
  "location": "19.1234, 72.5678",
  "deliveryProof": "https://storage.example.com/deliveries/proof123.jpg"
}
```

**Result**:
- Assignment status → DELIVERED
- Order status → DELIVERED
- Agent statistics updated (totalDeliveries++, successfulDeliveries++)
- Buyer notified

---

### Example 5: Failed Delivery

```bash
PATCH /shipping/assignments/assign123/status
Authorization: Bearer <agent_jwt>

{
  "status": "FAILED",
  "failureReason": "Customer not available after 3 attempts",
  "notes": "Left delivery note at door. Customer will collect from store.",
  "location": "19.1234, 72.5678"
}
```

**Result**: Assignment marked failed, agent statistics updated

---

### Example 6: Get My Assignments (Agent View)

```bash
GET /shipping/my-assignments?status=ASSIGNED
Authorization: Bearer <agent_jwt>
```

**Result**: List of all assignments assigned to this agent

---

### Example 7: Check Agent Statistics

```bash
GET /delivery-agents/agent123/statistics
Authorization: Bearer <seller_jwt>
```

**Result**:
```json
{
  "agentCode": "DA-0001",
  "totalAssignments": 150,
  "completedAssignments": 145,
  "failedAssignments": 5,
  "successRate": "96.67%",
  "averageRating": "4.85"
}
```

---

## Testing Guide

### Prerequisites

1. Migration applied: `20251231150924_add_shipping_delivery_module`
2. Seed data with delivery-agent role
3. Test users:
   - Admin user
   - Seller user
   - Delivery agent user
   - Buyer user

### Test Scenarios

#### Scenario 1: Complete Delivery Flow

```bash
# 1. Admin creates delivery agent
POST /delivery-agents (as admin)

# 2. Buyer places order
POST /orders (as buyer)

# 3. Seller confirms and receives payment
POST /orders/:id/confirm (as seller)

# 4. Seller assigns to agent
POST /shipping/assign (as seller)
{
  "orderId": "order123",
  "agentId": "agent123"
}

# 5. Agent accepts assignment
PATCH /shipping/assignments/:id/status (as agent)
{ "status": "ACCEPTED" }

# 6. Agent picks up order
PATCH /shipping/assignments/:id/status (as agent)
{ "status": "PICKED_UP" }

# 7. Agent starts delivery
PATCH /shipping/assignments/:id/status (as agent)
{ "status": "IN_TRANSIT" }

# 8. Agent delivers
PATCH /shipping/assignments/:id/status (as agent)
{
  "status": "DELIVERED",
  "deliveryProof": "https://example.com/proof.jpg"
}

# Expected:
# - All status transitions successful
# - Order status → DELIVERED
# - Agent stats updated
# - Buyer notified at each step
```

---

#### Scenario 2: Agent Availability Management

```bash
# 1. Check agent profile
GET /delivery-agents/me (as agent)

# 2. Go off duty
POST /delivery-agents/:id/toggle-availability (as agent)
# isAvailable: false

# 3. Try to assign order (should fail or skip this agent)
POST /shipping/assign (as seller)

# 4. Go back on duty
POST /delivery-agents/:id/toggle-availability (as agent)
# isAvailable: true
```

---

#### Scenario 3: Failed Delivery

```bash
# 1. Assign and start delivery (steps 1-7 from Scenario 1)

# 2. Mark as failed
PATCH /shipping/assignments/:id/status (as agent)
{
  "status": "FAILED",
  "failureReason": "Customer unavailable"
}

# Expected:
# - Assignment marked FAILED
# - Agent stats updated (failed count increases)
```

---

#### Scenario 4: Permission Testing

```bash
# Agent tries to assign order (FORBIDDEN)
POST /shipping/assign (as agent)
# Expected: 403 Forbidden

# Agent tries to view another agent's assignments (FORBIDDEN)
GET /shipping/agents/other_agent_id/assignments (as agent)
# Expected: Only sees own assignments or 403

# Buyer tries to update shipping status (FORBIDDEN)
PATCH /shipping/assignments/:id/status (as buyer)
# Expected: 403 Forbidden
```

---

## Troubleshooting

### Issue: Cannot Assign Order to Agent

**Symptoms**: 400 Bad Request when assigning

**Possible Causes**:
1. Order not in PAID/PREPARING status
2. Order already has active assignment
3. Agent not ACTIVE
4. Agent doesn't serve delivery zip code

**Solution**:
```bash
# Check order status
GET /orders/:id

# Check agent details
GET /delivery-agents/:agentId

# Find available agents for zip code
GET /delivery-agents/available/:zipCode
```

---

### Issue: Agent Cannot Update Status

**Symptoms**: 403 Forbidden when updating status

**Possible Causes**:
1. Agent not assigned to this order
2. Missing `shipping.update_status` permission

**Solution**:
```bash
# Verify assignment belongs to agent
GET /shipping/my-assignments

# Check if assignment ID matches
GET /shipping/assignments/:id
```

---

### Issue: Invalid Status Transition

**Error**: "Invalid status transition from ASSIGNED to DELIVERED"

**Cause**: Skipping required intermediate statuses

**Solution**: Follow proper status flow:
```
ASSIGNED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED
```

---

### Issue: Agent Statistics Not Updating

**Symptoms**: Delivery completed but stats remain same

**Possible Causes**:
1. Status not set to DELIVERED or FAILED
2. Database transaction failed

**Solution**:
```bash
# Manually check assignment
GET /shipping/assignments/:id

# Verify final status
# If stuck, update status again
PATCH /shipping/assignments/:id/status
```

---

## Performance Considerations

### Database Indexes

Already included in schema:

```sql
-- DeliveryAgent indexes
CREATE INDEX idx_delivery_agent_user ON delivery_agents(userId);
CREATE INDEX idx_delivery_agent_code ON delivery_agents(agentCode);
CREATE INDEX idx_delivery_agent_available ON delivery_agents(isAvailable);
CREATE INDEX idx_delivery_agent_status ON delivery_agents(status);

-- ShippingAssignment indexes
CREATE INDEX idx_shipping_assignment_order ON shipping_assignments(orderId);
CREATE INDEX idx_shipping_assignment_agent ON shipping_assignments(agentId);
CREATE INDEX idx_shipping_assignment_status ON shipping_assignments(status);
CREATE INDEX idx_shipping_assignment_date ON shipping_assignments(assignedAt);

-- ShippingLog indexes
CREATE INDEX idx_shipping_log_assignment ON shipping_logs(assignmentId);
CREATE INDEX idx_shipping_log_status ON shipping_logs(toStatus);
CREATE INDEX idx_shipping_log_date ON shipping_logs(createdAt);
```

### Caching Opportunities

- Available agents by zip code (cache for 5 minutes)
- Agent statistics (cache for 15 minutes)
- Active assignments count (cache for 1 minute)

---

## Future Enhancements

### Phase 2 Features

- [ ] Real-time GPS tracking integration
- [ ] Route optimization
- [ ] Multi-stop deliveries
- [ ] Agent mobile app
- [ ] Customer delivery slot selection
- [ ] Real-time ETA updates
- [ ] Agent performance analytics dashboard
- [ ] Automatic agent assignment based on proximity
- [ ] Delivery zone heat maps
- [ ] Agent earnings tracking

### Integration Opportunities

- [ ] Google Maps API (real-time tracking, ETA)
- [ ] Firebase (push notifications to agents)
- [ ] Twilio (SMS updates to customers)
- [ ] Third-party delivery platforms (Dunzo, Swiggy Genie)

---

## Module Files

### Services
- `delivery-agent.service.ts` - Agent CRUD and management
- `shipping.service.ts` - Assignment and tracking logic

### Controllers
- `delivery-agent.controller.ts` - Agent endpoints (8 routes)
- `shipping.controller.ts` - Shipping endpoints (8 routes)

### DTOs
- `create-delivery-agent.dto.ts` - Agent creation
- `update-delivery-agent.dto.ts` - Agent updates
- `assign-order.dto.ts` - Order assignment
- `update-shipping-status.dto.ts` - Status updates with validation

### Module Configuration
- `shipping.module.ts` - Module definition with OrderModule import

---

## API Summary

### Delivery Agent Endpoints (8)
1. POST `/delivery-agents` - Create agent
2. GET `/delivery-agents` - List all agents
3. GET `/delivery-agents/me` - Get my profile
4. GET `/delivery-agents/:id/statistics` - Agent stats
5. GET `/delivery-agents/available/:zipCode` - Available agents
6. GET `/delivery-agents/:id` - Get agent details
7. PATCH `/delivery-agents/:id` - Update agent
8. POST `/delivery-agents/:id/toggle-availability` - Toggle availability

### Shipping Endpoints (8)
1. POST `/shipping/assign` - Assign order
2. GET `/shipping/assignments` - List all assignments
3. GET `/shipping/my-assignments` - My assignments (agent)
4. GET `/shipping/assignments/:id` - Assignment details
5. PATCH `/shipping/assignments/:id/status` - Update status
6. POST `/shipping/assignments/:id/cancel` - Cancel assignment
7. GET `/shipping/orders/:orderId/history` - Order history
8. GET `/shipping/agents/:agentId/assignments` - Agent's assignments

**Total**: 16 endpoints with full RBAC enforcement

---

## Support

For issues or questions:
1. Check this documentation
2. Review shipping logs: `GET /shipping/assignments/:id`
3. Check agent availability: `GET /delivery-agents/:id`
4. Verify order status: `GET /orders/:id`
5. Review permissions in seed data

---

**Last Updated**: December 31, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
