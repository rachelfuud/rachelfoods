# Database Seeding Guide - RachelFoods

**Last Updated:** January 27, 2026

## Quick Fix - Seed Railway Database

Your Railway database needs to be populated with admin user, categories, and products. Follow these steps:

### Step 1: Get Your Railway Database URL

1. Go to https://railway.app
2. Open your Rachel Foods backend project
3. Click on the PostgreSQL service
4. Go to "Variables" tab
5. Copy the `DATABASE_URL` value (should look like: `postgresql://postgres:password@host.railway.app:5432/railway`)

### Step 2: Set Environment Variable Temporarily

In PowerShell, run:

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"

# Set the DATABASE_URL to your Railway database
$env:DATABASE_URL="<paste-your-railway-database-url-here>"

# Verify it's set
echo $env:DATABASE_URL
```

### Step 3: Run the Seed Script

```powershell
npx ts-node seed-railway.ts
```

Expected output:

```
🌱 Starting Railway database seed with correct products...

👤 Creating admin user...
✓ Admin created: admin@rachelfoods.com

📁 Creating categories...
  ✓ Grains & Staples
  ✓ Proteins & Fish
  ✓ Spices & Ingredients
  ✓ Ready Mixes

🍲 Creating products...
  ✓ Fresh Ogi
  ✓ Fufu
  ✓ Tapioca
  ... (all 14 products)

✅ Seeding complete!

📊 Summary:
   Categories: 4
   Products: 14
   Users: 1

🔑 Admin Login:
   Email: admin@rachelfoods.com
   Password: Admin123!
```

### Step 4: Verify Data

1. Open your Railway PostgreSQL service
2. Go to "Data" tab
3. Check these tables:
   - `users` - Should have 1 admin user
   - `categories` - Should have 4 categories
   - `products` - Should have 14 products with **stock = 150** each

## What Changed

### ✅ Stock Quantities Updated

All products now have **150 units** in stock (increased from 30-90):

| Product                | Old Stock | New Stock |
| ---------------------- | --------- | --------- |
| Fresh Ogi              | 80        | **150**   |
| Fufu                   | 60        | **150**   |
| Tapioca                | 70        | **150**   |
| Cat Fish               | 30        | **150**   |
| Panla                  | 50        | **150**   |
| Pomo                   | 40        | **150**   |
| Kilishi                | 35        | **150**   |
| Cray Fish              | 90        | **150**   |
| Egusi                  | 75        | **150**   |
| Iru / Locust Beans     | 60        | **150**   |
| Pepper Soup Ingredient | 85        | **150**   |
| Ayamase Mix            | 40        | **150**   |
| Ofada Mix              | 45        | **150**   |
| Ewa Aganyin Mix        | 50        | **150**   |

### ✅ No More "Out of Stock" Messages

With 150 units per product, customers can:

- Add items to cart without stock issues
- Test Kitchen Refill feature fully
- Experience checkout without interruptions
- See all products available for purchase

## Alternative: Seed via Railway CLI

If the above doesn't work, use Railway CLI:

```powershell
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run seed against Railway database
railway run npx ts-node seed-railway.ts
```

## Troubleshooting

### Error: Can't reach database server

**Problem:** The seed script is trying to connect to local database (127.0.0.1:5433)

**Solution:** Make sure you set the `DATABASE_URL` environment variable to your Railway database URL (Step 2 above)

### Error: Admin user already exists

**Solution:** This is fine! The seed script uses `upsert` so it won't duplicate data. Your admin is already seeded.

### Error: Prisma schema not found

**Solution:** Make sure you're running the command from the `backend` directory:

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend"
```

## Verify Login Works

After seeding:

1. Go to https://frontend-production-1660.up.railway.app/login
2. Use credentials:
   - **Email:** admin@rachelfoods.com
   - **Password:** Admin123!
3. You should see all 14 products in the catalog
4. All products should show "In Stock" (150 available)

## Next Steps

Once seeding is complete:

- ✅ Login with admin credentials
- ✅ Browse catalog - all products should be visible
- ✅ Check stock levels - should show "In Stock"
- ✅ Test Kitchen Refill page
- ✅ Test checkout flow
- ✅ Test admin dashboard

---

**File Modified:** `backend/seed-railway.ts` (all stock quantities set to 150)
**Tables Populated:** users, categories, products
**Admin Ready:** admin@rachelfoods.com / Admin123!
