# User Access & Role Management – RachelFoods

## Purpose
This module defines a complete, multi-level access control system that governs who can do what on the RachelFoods platform.

The system must support:
- Multiple user types
- Role-based access control (RBAC)
- Fine-grained permissions
- Extensibility for future roles

This module is foundational and must be implemented before other modules.

---

## Core Principles

- Every user must have at least one role
- Roles define permissions
- Permissions define actions
- No hard-coded privileges
- Seller retains ultimate control over their store
- Admin retains platform-level control

---

## User Types

### 1. Platform Admin
- Full system access
- Manages platform configuration
- Manages global settings (shipping rules, referral rules, themes)

### 2. Store Owner (Seller)
- Manages their own store
- Confirms orders
- Controls products, pricing, shipping overrides
- Decides payment methods (pay now / pay on delivery)

### 3. Store Manager (Optional Role)
- Acts on behalf of seller
- Limited administrative powers
- Cannot change ownership or global policies

### 4. Delivery Agent (Internal)
- Access only to assigned deliveries
- Updates shipping status
- Cannot see pricing or payment data

### 5. Buyer (Customer)
- Places orders
- Requests kitchen refill
- Tracks orders
- Submits reviews and referrals

### 6. Guest (Unauthenticated)
- Browses products
- Downloads mobile app
- Initiates signup

---

## Roles vs Permissions Model

Roles are collections of permissions.

Permissions are atomic actions such as:
- product.create
- product.update
- order.confirm
- shipping.override
- referral.view

---

## Permission Categories

### User & Identity
- user.create
- user.update
- user.disable
- role.assign

### Catalog
- category.create
- category.update
- category.delete
- product.create
- product.update
- product.disable
- product.delete

### Orders
- order.view
- order.confirm
- order.cancel
- order.update_status

### Shipping
- shipping.assign_provider
- shipping.override_cost
- shipping.update_status

### Payments
- payment.enable_cod
- payment.enable_prepaid
- payment.confirm

### Reviews & Referrals
- review.request
- review.moderate
- referral.configure
- referral.view

### System
- system.configure
- theme.manage
- notification.configure

---

## Role Definitions (Initial)

### Platform Admin
- All permissions

### Store Owner
- Full permissions within their store scope

### Store Manager
- All seller permissions except:
  - system.configure
  - referral.configure
  - theme.manage

### Delivery Agent
- shipping.update_status
- order.view (limited)

### Buyer
- order.create
- order.view
- review.create
- referral.create

---

## Constraints & Rules

- Permissions are checked at API level
- UI must hide unauthorized actions
- Role changes take effect immediately
- All permission checks must be auditable

---

## Extensibility

- New roles can be added without code changes
- Permissions are data-driven
- Future roles (e.g. accountant, support) supported
