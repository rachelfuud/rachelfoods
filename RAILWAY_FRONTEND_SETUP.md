# Railway Frontend Deployment - Environment Variables Setup

## Issue

Production frontend at `https://frontend-production-1660.up.railway.app` shows "Product Not Found" because it's missing the backend API URL configuration.

## Solution: Configure Environment Variables in Railway

### Step 1: Access Railway Dashboard

1. Go to https://railway.app
2. Login to your account
3. Select your frontend project: **frontend-production-1660**

### Step 2: Add Environment Variables

1. Click on your frontend service
2. Go to the **Variables** tab
3. Click **+ New Variable**
4. Add the following variables:

```bash
NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
NODE_ENV=production
```

### Step 3: Redeploy

1. After adding the variables, Railway will automatically trigger a new deployment
2. Wait for the deployment to complete (usually 2-3 minutes)
3. Test the frontend: https://frontend-production-1660.up.railway.app

### Verification Checklist

- [ ] Environment variable `NEXT_PUBLIC_API_URL` is set
- [ ] Frontend redeployed successfully
- [ ] Product pages load correctly (test: /products/fufu)
- [ ] Catalog page shows all 14 products
- [ ] Categories filter works

---

## Alternative: Deploy Frontend Using Railway CLI

If you prefer using the command line:

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to frontend project
railway link

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL=https://backend-production-3b87.up.railway.app
railway variables set NODE_ENV=production

# Trigger redeploy
railway up
```

---

## Expected Result

After configuration, your production frontend should:

- ✅ Connect to Railway backend
- ✅ Display all 14 products
- ✅ Show product details when clicked
- ✅ Display loading indicators during navigation
- ✅ Process orders and payments correctly

---

## Current Environment Status

| Environment              | URL                                             | Backend Connection                                 | Status            |
| ------------------------ | ----------------------------------------------- | -------------------------------------------------- | ----------------- |
| **Local Development**    | http://localhost:3000                           | https://backend-production-3b87.up.railway.app/api | ✅ Working        |
| **Production (Railway)** | https://frontend-production-1660.up.railway.app | ❌ Not configured                                  | ⚠️ Needs env vars |

---

## Next Steps

1. ✅ Set environment variables in Railway dashboard
2. ⏳ Wait for automatic redeploy
3. ✅ Test product pages
4. ✅ Test checkout flow
5. ✅ Configure Stripe webhook (if not done)

---

**Last Updated:** January 26, 2026
