# Seed Railway Database

This script seeds your Railway PostgreSQL database with sample data including:

- Admin user
- Sample products
- Categories
- Roles & permissions

## Quick Setup

### 1. Get Your Railway Database URL

In Railway dashboard:

1. Click **Postgres** service
2. Go to **Variables** tab
3. Copy the `DATABASE_URL` value

It looks like: `postgresql://postgres:password@postgres.railway.internal:5432/railway`

### 2. Run the Seed Script

```powershell
# Navigate to backend directory
cd backend

# Set DATABASE_URL (replace with your actual URL from Railway)
$env:DATABASE_URL="your-railway-database-url-here"

# Run the seed
npm run prisma:seed
```

### Alternative: One-Line Command

```powershell
cd backend ; $env:DATABASE_URL="your-railway-database-url" ; npm run prisma:seed
```

## What Gets Seeded

### ✅ Admin User

- **Email**: admin@rachelfoods.com
- **Password**: Admin123!
- **Role**: Platform Admin

### ✅ Sample Products

- Various food categories
- Product images
- Pricing
- Stock quantities

### ✅ Roles & Permissions

- Platform Admin
- Store Owner
- Buyer
- Delivery Agent

### ✅ System Configuration

- Default settings
- Payment options
- Shipping configurations

## After Seeding

1. Visit: https://frontend-production-1660.up.railway.app/login
2. Login with:
   - Email: `admin@rachelfoods.com`
   - Password: `Admin123!`
3. Go to Admin Panel to manage products

## Troubleshooting

### Error: "Can't reach database server"

Your DATABASE_URL might be using the internal Railway address. Replace `postgres.railway.internal` with the **public host**.

**Get public URL:**

1. Railway → Postgres service → **Connect** tab
2. Copy **Public URL** instead
3. Use that in the command above

### Error: "Environment variable not loaded"

Make sure you're running the command in PowerShell and the DATABASE_URL is properly set:

```powershell
# Check if it's set
echo $env:DATABASE_URL

# If empty, set it again
$env:DATABASE_URL="postgresql://..."
```

## Quick Seed (Copy-Paste)

Replace `YOUR_DATABASE_URL` and run:

```powershell
cd "c:\Projects\Dev\Rachel Foods\backend" ; $env:DATABASE_URL="YOUR_DATABASE_URL" ; npm run prisma:seed
```

---

**Need the public DATABASE_URL?**

In Railway → Postgres → Connect tab → look for "External Connection" or "Public URL"
