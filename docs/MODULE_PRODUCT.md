# MODULE: PRODUCT

## Responsibility

Manages product catalog, pricing, availability, and metadata.

## Core Entities

- Product
- Price
- ProductStatus (ACTIVE, INACTIVE, OUT_OF_STOCK)
- ProductVariant (if applicable)

## Public Interfaces

- ProductService.getProduct()
- ProductService.listProducts()
- Admin product management APIs

## Invariants & Rules

- Product price must be >= 0
- Inactive products cannot be ordered
- Product identity is immutable once created

## Dependencies

- None for core reads
- Read by Order module

## Explicit Non-Responsibilities

- Does NOT manage stock deduction logic
- Does NOT apply promotions or discounts
- Does NOT calculate order totals

## Audit & Risk Notes

- Pricing changes should be auditable
- Soft deletes preferred over hard deletes
