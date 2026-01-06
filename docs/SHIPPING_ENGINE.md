# Shipping Engine – RachelFoods (Authoritative)

## Overview
The Shipping Engine is the single, mandatory abstraction layer governing all shipping and delivery operations on the RachelFoods platform.

NO shipping logic, provider, or workflow may bypass the Shipping Engine.

This ensures:
- Seller control
- Consistent order lifecycle
- Provider independence
- Platform rule enforcement

---

## Core Requirements (NON-NEGOTIABLE)

The Shipping Engine MUST:

- Ensure all shipping passes through the engine
- Support multiple shipping providers:
  - Internal (RachelFoods delivery agents)
  - Third-party logistics providers (3PL)
  - Custom/manual providers
- Require all providers to implement a standard interface
- Enforce platform rules regardless of provider
- Normalize all provider data into internal fields
- Support provider enable/disable
- Support seller/admin manual overrides

---

## Responsibilities

The Shipping Engine is responsible for:

- Calculating base shipping cost using:
  - Distance
  - Total order weight
- Applying seller-defined delivery rules
- Validating provider capabilities
- Selecting default or fallback providers
- Normalizing provider responses
- Enforcing delivery windows
- Preventing payment until shipping is confirmed
- Logging overrides and exceptions

---

## Inputs

- Order details (items, weights, perishability)
- Delivery address (distance calculation)
- Seller configuration
- Selected or default shipping provider

---

## Outputs

- Final shipping cost
- Selected shipping provider
- Estimated delivery window
- Internal tracking identifier
- Normalized shipping status

---

## Platform Rules Enforced by the Engine

- Seller must confirm shipping before payment
- Providers cannot confirm orders
- Providers cannot trigger payments
- Perishable items require priority handling
- Manual overrides must be logged

---

## Provider Independence

Shipping providers:
- Do NOT control order lifecycle
- Do NOT define business rules
- Do NOT bypass the engine

The engine adapts providers — not the other way around.

---

## Error & Edge Case Handling

- Provider failure → fallback provider
- Invalid provider response → block fulfillment
- Seller can intervene manually
- All failures are logged and auditable

---

## Deliverables (IMPLEMENTATION EXPECTATIONS)

The Shipping Engine implementation MUST include:

- Shipping provider interface
- Engine core logic
- Field mapping system
- Provider configuration management
- Admin enable/disable controls
- Manual override handling
- Comprehensive edge-case handling

---

## Audit & Logging

- All shipping decisions are logged
- All overrides are traceable
- Provider responses are stored
