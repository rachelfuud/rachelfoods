# Catalog & Category Management – RachelFoods

## Purpose
The Catalog Module manages all products and categories available on the RachelFoods platform.

It must support:
- Flexible food categorization
- Seller-controlled product lifecycle
- Temporary disablement (not only deletion)
- Compatibility with Kitchen Refill and Custom Requests

---

## Core Principles

- Seller owns and controls their catalog
- Categories are editable and hierarchical
- Products can exist in disabled state
- No hard delete without explicit permission
- Catalog changes must not break historical orders

---

## Category Management

### Category Capabilities
- Create category
- Edit category
- Disable category
- Delete category (soft delete)
- Reorder categories
- Nest categories (parent/child)

### Category Rules
- Disabled categories hide products from buyers
- Deleting a category does NOT delete historical data
- Categories must support future expansion

Example Categories:
- Grains & Staples
- Proteins
- Spices & Ingredients
- Ready Mixes
- Frozen & Fresh
- Custom Requests

---

## Product Management

### Product Capabilities
- Create product
- Edit product
- Disable product (out of stock / seasonal)
- Delete product (soft delete)
- Assign categories
- Set price and unit
- Set weight (for shipping calculation)
- Mark perishability

---

## Product Attributes (Minimum)

- Name
- Description
- Category
- Price
- Unit (kg, pack, pcs)
- Weight (numeric)
- Perishable (boolean)
- Status (active / disabled)
- Images
- Created by (seller)

---

## Product Status Lifecycle

Draft  
→ Active  
→ Disabled  
→ Archived  

- Draft: not visible
- Active: visible
- Disabled: hidden but retained
- Archived: historical reference only

---

## Seller Controls

- Seller can override pricing
- Seller can disable products temporarily
- Seller can control visibility
- Seller can approve custom requested items

---

## Compatibility Rules

- Catalog must support:
  - Kitchen Refill
  - Custom product requests
  - Event-based orders
- Requested items may become catalog items later
