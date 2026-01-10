# Product Variants Migration Guide

## Overview
This guide explains how to deploy the product variants feature to production.

## What Changed

### Database Schema
- New `product_variants` table with fields: id, productId, name, sku, price, stock, isDefault, isActive, timestamps
- Updated `order_items` table with `variantId` and `variantName` fields
- Relation: One product has many variants, one variant belongs to one product

### Backend Changes
- Added `ProductVariant` model to Prisma schema
- Created DTOs: `CreateProductVariantDto` and `UpdateProductVariantDto`
- Updated `ProductService` to include variants in all product queries
- Modified seed script to create default variant for each product
- Updated transform method to expose variants in API responses

### Frontend Changes
- Added `ProductVariant` interface to types
- Updated `Product` interface to include optional `variants` array
- Updated `CartItem` interface to include `variantId` and `variant`
- Created `VariantSelector` component for product detail pages
- Created `ProductDetailClient` component with variant selection logic
- Updated cart page to display and handle variants correctly

## Deployment Steps

### Step 1: Apply Database Migration

Connect to your production PostgreSQL database and run:

\`\`\`bash
psql -h <your-render-host> -U <your-username> -d rachelfood -f backend/migrations/add_product_variants.sql
\`\`\`

Or use Render's dashboard to execute the SQL from `backend/migrations/add_product_variants.sql`

### Step 2: Deploy Backend

1. Commit all changes:
\`\`\`bash
git add .
git commit -m "feat: Add product variants system"
git push origin main
\`\`\`

2. Render will automatically deploy the backend
3. Wait for deployment to complete

### Step 3: Regenerate Prisma Client (if needed)

If not automatically done during build:
\`\`\`bash
cd backend
npx prisma generate
\`\`\`

### Step 4: Seed Default Variants

After backend is deployed, trigger the seed endpoint to create default variants for existing products:

\`\`\`bash
curl -X POST https://rachelfood-backend.onrender.com/api/catalog/seed
\`\`\`

### Step 5: Deploy Frontend

1. Frontend should auto-deploy from the same git push
2. Verify on Vercel dashboard that build succeeded
3. Test the live site

## Verification Checklist

After deployment, verify:

- [ ] Products API returns variants array: `GET /api/products`
- [ ] Product detail page shows variant selector (if multiple variants exist)
- [ ] Selecting a variant updates price and stock display
- [ ] Adding variant to cart stores variantId
- [ ] Cart displays variant name and correct price
- [ ] Checkout creates order with correct variant information

## Rollback Plan

If issues occur:

### Database Rollback
\`\`\`sql
-- Remove variant columns from order_items
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "variantId";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "variantName";

-- Drop product_variants table
DROP TABLE IF EXISTS "product_variants";
\`\`\`

### Code Rollback
\`\`\`bash
git revert HEAD
git push origin main
\`\`\`

## Testing Locally

To test locally (requires database permissions):

1. Apply migration:
\`\`\`bash
cd backend
npx prisma db push
\`\`\`

2. Generate Prisma Client:
\`\`\`bash
npx prisma generate
\`\`\`

3. Run seed:
\`\`\`bash
npm run start:dev
# Then: curl -X POST http://localhost:3000/api/catalog/seed
\`\`\`

4. Start frontend:
\`\`\`bash
cd frontend
npm run dev
\`\`\`

## Architecture Notes

### Default Variant
- Every product must have at least one variant
- The seed script creates a default variant matching the product's base price
- Default variant is named "1 {unit}" (e.g., "1 kg", "1 bottle")
- isDefault flag ensures backward compatibility

### Cart Behavior
- Cart items now reference variantId instead of just productId
- Price is pulled from variant if available, otherwise from product
- Stock is checked against variant stock, not product stock
- Existing cart items (without variantId) still work for backward compatibility

### Future Enhancements
- Admin UI for managing variants
- Bulk variant creation
- Variant-specific images
- Variant attributes (size, color, etc.)
- Inventory management per variant
