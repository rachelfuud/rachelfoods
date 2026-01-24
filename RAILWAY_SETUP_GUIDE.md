# Railway Deployment Guide - Complete Setup

## Overview

This guide will walk you through deploying your RachelFoods application on Railway with:

- PostgreSQL Database
- NestJS Backend API
- Next.js Frontend

**Estimated Cost**: $5-7/month total

---

## Step 1: Create Railway Account & Project

### 1.1 Sign Up

1. Go to https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 1.2 Create New Project

1. Once logged in, click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. If this is your first time, click **"Configure GitHub App"**
4. Select your repository: `rachelfuud/rachelfoods`
5. Railway will create a new project

---

## Step 2: Add PostgreSQL Database

### 2.1 Create Database Service

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway will automatically create the database
5. You'll see a new service called **"Postgres"** in your project

### 2.2 Note Database Connection

- Railway automatically creates a `DATABASE_URL` variable
- This will be shared with other services automatically
- No need to copy/paste connection strings!

---

## Step 3: Deploy Backend Service

### 3.1 Create Backend Service

1. Click **"+ New"** in your project
2. Select **"GitHub Repo"**
3. Choose your repository: `rachelfuud/rachelfoods`
4. Railway creates a new service

### 3.2 Configure Backend Service

#### Set Service Name

1. Click the service (it might say "rachelfoods" or similar)
2. Click **"Settings"** tab at the top
3. Under **"General"**, change the name to: `backend`
4. Click **"Update"** or save

#### Set Root Directory (CRITICAL!)

1. Still in **Settings** tab
2. Scroll down to **"Source"** section
3. Find **"Root Directory"** field
4. Type: `backend` (exactly as shown, no slashes)
5. Click outside the field to save

#### Configure Build & Deploy

1. Still in **Settings** tab
2. Scroll to **"Deploy"** section
3. **Watch for PORT** - Railway assigns a PORT environment variable
4. Your app will use this automatically

### 3.3 Add Environment Variables

1. Click the **"Variables"** tab at the top
2. Click **"+ New Variable"** for each of these:

```bash
NODE_ENV=production
PORT=${{PORT}}
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRATION=7d
ADMIN_EMAIL=admin@rachelfoods.com
ADMIN_PASSWORD=ChangeThisSecurePassword123!
EMAIL_PROVIDER=console
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=${{frontend.PUBLIC_URL}}
```

**Important Notes:**

- `${{Postgres.DATABASE_URL}}` - Railway auto-fills this from your database
- `${{PORT}}` - Railway auto-assigns the port
- `${{frontend.PUBLIC_URL}}` - Will work after you create frontend service
- Generate a strong JWT_SECRET (32+ random characters)
- Use Stripe TEST keys for now (they start with `sk_test_`)

### 3.4 Deploy Backend

1. Go back to **"Deployments"** tab
2. Railway should auto-deploy after saving settings
3. If not, click **"Deploy"** or **"Redeploy"**
4. Watch the build logs - should take 3-5 minutes
5. Look for: **"Build successful"** and service should show "Active"

### 3.5 Get Backend URL

1. Once deployed, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** under **"Public Networking"**
4. Copy the URL (e.g., `backend-production-xxxx.up.railway.app`)
5. Your API will be at: `https://your-backend-url.railway.app/api`

---

## Step 4: Deploy Frontend Service

### 4.1 Create Frontend Service

1. Click **"+ New"** in your main project view
2. Select **"GitHub Repo"**
3. Choose the same repository: `rachelfuud/rachelfoods`
4. Railway creates another service

### 4.2 Configure Frontend Service

#### Set Service Name

1. Click the new service
2. Click **"Settings"** tab
3. Under **"General"**, change name to: `frontend`
4. Save

#### Set Root Directory

1. Still in **Settings** tab
2. Under **"Source"** section
3. Set **"Root Directory"** to: `frontend`
4. Save

### 4.3 Add Frontend Environment Variables

1. Click **"Variables"** tab
2. Add these variables:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

**Replace `your-backend-url.railway.app`** with the actual backend URL from Step 3.5!

### 4.4 Deploy Frontend

1. Go to **"Deployments"** tab
2. Railway auto-deploys
3. Wait for build to complete (3-5 minutes)
4. Look for "Build successful" and "Active" status

### 4.5 Generate Frontend Domain

1. Go to **"Settings"** tab
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `frontend-production-xxxx.up.railway.app`)
5. This is your live application URL!

---

## Step 5: Update Backend with Frontend URL

### 5.1 Add CORS Configuration

1. Go back to **backend** service
2. Click **"Variables"** tab
3. Add or update:

```bash
FRONTEND_URL=https://your-frontend-url.railway.app
```

**Replace with your actual frontend URL from Step 4.5!**

### 5.2 Redeploy Backend

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** to pick up the new variable

---

## Step 6: Run Database Migrations

### 6.1 Check Backend Logs

1. Go to **backend** service
2. Click **"Deployments"** tab
3. Click the most recent deployment
4. Check logs - should see Prisma migrations running automatically
5. Look for: `"Database migrations completed"`

### 6.2 If Migrations Didn't Run

Your Dockerfile should handle this automatically, but if needed:

1. Click backend service → **"Settings"**
2. Scroll to **"Deploy"**
3. Check **"Custom Start Command"** - it should be empty (let Dockerfile handle it)

---

## Step 7: Test Your Deployment

### 7.1 Test Backend API

1. Open your backend URL in browser: `https://your-backend-url.railway.app/api`
2. You should see: `{"message":"RachelFoods API is running","version":"1.0.0"}`
3. Try: `https://your-backend-url.railway.app/api/health`

### 7.2 Test Frontend

1. Open your frontend URL: `https://your-frontend-url.railway.app`
2. The homepage should load
3. Try logging in or browsing products

### 7.3 Check Database Connection

1. Go to **Postgres** service in Railway
2. Click **"Data"** tab
3. You should see tables created by Prisma migrations

---

## Step 8: Set Up Stripe Webhooks (Optional - For Payments)

### 8.1 Configure Stripe Webhook

1. Go to https://dashboard.stripe.com
2. Navigate to **"Developers"** → **"Webhooks"**
3. Click **"Add endpoint"**
4. Enter URL: `https://your-backend-url.railway.app/api/payments/webhook`
5. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Copy the **"Signing secret"** (starts with `whsec_`)

### 8.2 Update Backend Variable

1. Go to backend service in Railway
2. Click **"Variables"** tab
3. Update `STRIPE_WEBHOOK_SECRET` with the signing secret from Stripe
4. Redeploy backend

---

## Step 9: Custom Domain (Optional)

### 9.1 Add Custom Domain to Frontend

1. Go to frontend service → **"Settings"**
2. Under **"Networking"** → **"Custom Domain"**
3. Click **"Add Domain"**
4. Enter your domain: `www.rachelfoods.com`
5. Railway provides DNS instructions
6. Add CNAME record in your domain registrar pointing to Railway

### 9.2 Add Custom Domain to Backend

1. Go to backend service → **"Settings"**
2. Add custom domain: `api.rachelfoods.com`
3. Follow same DNS setup
4. Update frontend `NEXT_PUBLIC_API_URL` variable to use new domain

---

## Troubleshooting

### Backend Won't Start

**Check logs for errors:**

1. Go to backend service → **"Deployments"**
2. Click latest deployment
3. Look for error messages

**Common issues:**

- **"Root directory set as ''"** → Root Directory not set correctly (must be `backend`)
- **"Prisma schema not found"** → Root Directory issue
- **"Port already in use"** → Make sure PORT variable is `${{PORT}}`
- **"Database connection failed"** → Check DATABASE_URL is set to `${{Postgres.DATABASE_URL}}`

### Frontend Shows API Errors

**Check environment variables:**

1. Frontend variables → Verify `NEXT_PUBLIC_API_URL` matches backend URL exactly
2. Make sure URL has `/api` at the end
3. Check backend CORS settings allow frontend domain

### Database Connection Issues

1. Verify Postgres service is "Active"
2. Check backend has DATABASE_URL variable
3. Ensure variable value is `${{Postgres.DATABASE_URL}}` (Railway reference, not hardcoded)

### Build Failures

1. Check Root Directory is set correctly (`backend` or `frontend`)
2. Verify no conflicting railway.json or railway.toml files
3. Look at build logs for specific error messages

---

## Your Services Should Look Like This

### Project Structure in Railway:

```
Your Project Name
├── Postgres (database)
├── backend (NestJS API)
└── frontend (Next.js app)
```

### Service Details:

**Postgres:**

- Type: Database
- Status: Active
- Variables: Auto-generated

**backend:**

- Root Directory: `backend`
- Build: Dockerfile
- Public URL: Generated
- Variables: See Step 3.3

**frontend:**

- Root Directory: `frontend`
- Build: Dockerfile
- Public URL: Generated
- Variables: See Step 4.3

---

## Cost Breakdown

- **PostgreSQL**: ~$5/month (500MB included)
- **Backend Service**: ~$1-2/month (small traffic)
- **Frontend Service**: ~$1-2/month (small traffic)
- **Total**: ~$7-9/month for all services

Railway gives you $5 in free credits each month, so small projects might be free!

---

## Next Steps After Deployment

1. ✅ Test all functionality (authentication, products, orders, payments)
2. ✅ Switch to Stripe LIVE keys for production
3. ✅ Set up monitoring and alerts
4. ✅ Configure custom domain
5. ✅ Set up backups (Railway has automatic backups)
6. ✅ Update admin password from default

---

## Need Help?

**Railway Community:**

- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app

**Check Logs:**

- Always check deployment logs first
- Look for specific error messages
- Most issues are configuration-related

**Common Commands:**
You can run commands in Railway's terminal:

1. Click service → **"Settings"** → Scroll to bottom
2. Some plans allow terminal access for debugging
