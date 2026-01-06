# RBAC Authorization Implementation

## Overview
Role-Based Access Control (RBAC) authorization system that checks user permissions dynamically from the database before allowing access to protected resources.

---

## Architecture

### Components

1. **PermissionService** - Loads user permissions from database and checks access
2. **PermissionsGuard** - NestJS guard that enforces permission requirements
3. **@Permissions() Decorator** - Marks routes with required permissions
4. **@CurrentUser() Decorator** - Extracts authenticated user from request
5. **Audit Logging** - Logs all permission checks for compliance

---

## Authorization Flow

```
1. Client Request with JWT
   ↓
2. JwtAuthGuard validates token → Attaches user to request
   ↓
3. PermissionsGuard extracts required permissions from route metadata
   ↓
4. PermissionService loads user's roles and permissions from database
   ↓
5. Check: Does user have ALL required permissions?
   ↓
6. Log permission check (allowed/denied)
   ↓
7. Allow access OR throw ForbiddenException
   ↓
8. Execute route handler
```

---

## Usage Examples

### Protecting a Route

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Both guards required
export class ProductsController {
  
  // View products - All authenticated users
  @Get()
  @Permissions('product.view')
  async findAll(@CurrentUser() user: any) {
    // User is guaranteed to have product.view permission
    return this.productsService.findAll();
  }

  // Create product - Admin and Store Owner only
  @Post()
  @Permissions('product.create')
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: any) {
    // User is guaranteed to have product.create permission
    return this.productsService.create(dto, user.id);
  }

  // Multiple permissions required
  @Post(':id/publish')
  @Permissions('product.update', 'product.view')
  async publish(@Param('id') id: string) {
    // User must have BOTH permissions
    return this.productsService.publish(id);
  }
}
```

---

## Permission Format

Permissions follow the pattern: `resource.action`

### Examples from Seed Data:

#### Category Permissions
- `category.create` - Create new categories
- `category.update` - Update existing categories
- `category.delete` - Delete categories
- `category.view` - View categories

#### Product Permissions
- `product.create` - Create new products
- `product.update` - Update existing products
- `product.delete` - Delete products
- `product.view` - View products
- `product.disable` - Disable products temporarily

#### Order Permissions
- `order.create` - Create new orders
- `order.view` - View orders
- `order.confirm` - Confirm orders (Seller control)
- `order.cancel` - Cancel orders
- `order.update` - Update order details

#### Shipping Permissions
- `shipping.view` - View shipping information
- `shipping.override` - Override shipping cost (Seller/Admin only)
- `shipping.update_status` - Update shipping status (Delivery Agent)
- `shipping.assign` - Assign shipping provider

#### Payment Permissions
- `payment.view` - View payment information
- `payment.enable_cod` - Enable cash on delivery (Seller only)
- `payment.enable_prepaid` - Enable prepaid payment
- `payment.confirm` - Confirm payment received

---

## Role-Permission Mapping

Based on [docs/ROLE_PERMISSION_MATRIX.md](../../docs/ROLE_PERMISSION_MATRIX.md):

### Platform Admin
Has **ALL** permissions (34 total)

### Store Owner (Seller)
- Category management (create, update, view)
- Product management (create, update, delete, view, disable)
- Order management (view, confirm, cancel, update)
- Shipping control (view, override, assign)
- Payment configuration (view, enable_cod, enable_prepaid, confirm)
- Review moderation

### Buyer
- View categories and products
- Create and manage own orders
- Create and view reviews
- View referrals
- Limited to own data

### Delivery Agent
- View orders (limited)
- View shipping information
- Update shipping status only

---

## Guard Behavior

### Multiple Roles Support
✅ Users can have multiple roles  
✅ Permissions are aggregated from all active roles  
✅ If ANY role grants the permission, access is allowed

### Inactive Roles
❌ Permissions from inactive roles are NOT included  
✅ Role.isActive flag is checked dynamically

### Multiple Permissions
When route requires multiple permissions: `@Permissions('product.update', 'product.view')`  
✅ User must have **ALL** specified permissions  
❌ Having only some permissions will deny access

### No Permissions Decorator
If route has no `@Permissions()` decorator:  
✅ Access is allowed (only JWT authentication required)

---

## Audit Logging

Every permission check is logged with:

```typescript
{
  timestamp: "2025-12-31T14:30:00.000Z",
  user: "buyer@example.com (uuid)",
  endpoint: "POST /api/products",
  requiredPermissions: "product.create",
  userHasPermissions: "product.view, order.create, order.view",
  result: "DENIED"
}
```

### Log Levels
- **ALLOWED** - Logged at INFO level (console.log)
- **DENIED** - Logged at WARN level (console.warn)

### Future Enhancement
Currently logs to console. In production, should write to:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50),
  resource VARCHAR(50),
  endpoint VARCHAR(255),
  allowed BOOLEAN,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Error Responses

### 401 Unauthorized
No JWT token or invalid token:
```json
{
  "statusCode": 401,
  "message": "Authentication required to access this resource"
}
```

### 403 Forbidden
User lacks required permissions:
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions. Required: [product.create]"
}
```

---

## Testing Scenarios

### Test 1: Buyer Creates Product (Should Fail)
```bash
# Register as buyer
POST /api/auth/register
{ "email": "buyer@test.com", "password": "password123" }

# Try to create product
POST /api/products
Authorization: Bearer <buyer-token>
{ "name": "New Product", "price": 100 }

# Expected: 403 Forbidden
# Buyer has: [product.view, order.create]
# Required: [product.create]
```

### Test 2: Store Owner Creates Product (Should Succeed)
```bash
# Login as store owner (manually created in DB)
POST /api/auth/login
{ "email": "seller@test.com", "password": "password123" }

# Create product
POST /api/products
Authorization: Bearer <seller-token>
{ "name": "New Product", "price": 100 }

# Expected: 201 Created
```

### Test 3: Buyer Views Products (Should Succeed)
```bash
GET /api/products
Authorization: Bearer <buyer-token>

# Expected: 200 OK
# All authenticated users have product.view
```

### Test 4: Multiple Permissions
```bash
POST /api/products/123/publish
Authorization: Bearer <buyer-token>

# Expected: 403 Forbidden
# Requires BOTH: product.update AND product.view
# Buyer only has: product.view
```

---

## Implementation Files

### Core Authorization
- [src/auth/permission.service.ts](../src/auth/permission.service.ts) - Permission checking logic
- [src/auth/permissions.guard.ts](../src/auth/permissions.guard.ts) - Guard implementation
- [src/auth/decorators/permissions.decorator.ts](../src/auth/decorators/permissions.decorator.ts) - Route decorator
- [src/auth/decorators/current-user.decorator.ts](../src/auth/decorators/current-user.decorator.ts) - User extractor

### Example Implementation
- [src/products/products.controller.ts](../src/products/products.controller.ts) - Demonstrates all permission patterns

---

## Key Design Decisions

### 1. Database-Driven Permissions
✅ All permissions loaded from database  
✅ Changes to roles/permissions take effect immediately  
✅ No code deployment needed to modify access control

### 2. Guard Order Matters
```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
```
- **JwtAuthGuard** runs first - validates token, attaches user
- **PermissionsGuard** runs second - checks user permissions
- Order is critical for correct behavior

### 3. Permission Aggregation
User with multiple roles gets **union** of all permissions:
- Role A: [product.view, product.create]
- Role B: [order.view, order.create]
- User permissions: [product.view, product.create, order.view, order.create]

### 4. Inactive Role Handling
Roles can be disabled without deleting:
```typescript
role.isActive = false // Permissions from this role are ignored
```

### 5. Audit Logging Philosophy
- Log every permission check (not just denials)
- Include full context for compliance
- Structured JSON format for analysis
- Currently console, ready for database migration

---

## Core Principles Compliance

Following [docs/COPILOT_CONTEXT.md](../../docs/COPILOT_CONTEXT.md):

✅ **No hard-coded privileges** - All from database  
✅ **Seller retains control** - Store Owner has override permissions  
✅ **Human-assisted** - Permission checks ensure human approval workflow  
✅ **Extensible** - New permissions/roles without code changes  
✅ **Auditable** - Complete permission check logging

---

## Next Steps

1. Add actual product/order/category implementation
2. Migrate audit logs to database table
3. Add permission management API (admin-only)
4. Implement scope-based permissions (e.g., own products only)
5. Add bulk permission checks for efficiency
6. Create admin UI for role/permission management
