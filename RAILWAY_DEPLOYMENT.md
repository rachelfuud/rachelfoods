# Deploy Both Frontend & Backend on Railway.app

# Alternative to Vercel that supports full-stack apps

# Cost: $5/month for everything

## Why Railway.app?

✅ Supports both Next.js frontend AND NestJS backend
✅ GitHub integration (like Vercel)
✅ Auto-deployments
✅ PostgreSQL/MySQL included
✅ No code changes needed
✅ Simple pricing: $5/month per service

---

## Step-by-Step Deployment

### Step 1: Sign Up for Railway

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway
4. Get $5 free credit (lasts 1 month)

---

### Step 2: Deploy Backend

#### 2.1 Create New Project

1. Click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select: `rachelfuud/rachelfoods`
4. Click on repository

#### 2.2 Configure Backend Service

Railway will auto-detect the backend. Configure:

**Service Settings:**

- Name: `backend`
- Root Directory: `/backend`
- Build Command: `npm ci && npm run build && npx prisma generate`
- Start Command: `npx prisma migrate deploy && node dist/src/main.js`

**Environment Variables:**
Click "Variables" tab and add:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your-very-long-random-string-minimum-32-characters
JWT_EXPIRATION=7d
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
EMAIL_PROVIDER=console
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=SecurePassword123!
```

**Don't add DATABASE_URL yet** - we'll add database first.

#### 2.3 Add Database

1. Click "New" in your project
2. Choose "Database" → "PostgreSQL"
3. Wait 30 seconds for provisioning
4. Database URL is **automatically** added to backend service

#### 2.4 Deploy Backend

1. Click "Deploy"
2. Wait 3-5 minutes for build
3. Railway will provide a URL like: `https://rachelfoods-backend-production.up.railway.app`
4. Click "Settings" → "Generate Domain" to get public URL

**Test it:**

```bash
curl https://your-backend-url.railway.app/api
```

Should return: `{"message":"RachelFoods API is running"}`

---

### Step 3: Deploy Frontend

#### 3.1 Add Frontend Service

1. In same project, click "New"
2. Choose "GitHub Repo"
3. Select same repo: `rachelfuud/rachelfoods`
4. This time, configure for frontend

#### 3.2 Configure Frontend Service

**Service Settings:**

- Name: `frontend`
- Root Directory: `/frontend`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`

**Environment Variables:**

```env
NEXT_PUBLIC_API_BASE=${{backend.PUBLIC_URL}}/api
```

Note: `${{backend.PUBLIC_URL}}` auto-references your backend service!

#### 3.3 Generate Domain

1. Click "Settings" → "Generate Domain"
2. You'll get: `https://rachelfoods-frontend-production.up.railway.app`
3. Visit URL to test!

---

### Step 4: Configure Custom Domain (Optional)

#### In Railway:

**For Frontend:**

1. Go to frontend service
2. Click "Settings" → "Custom Domain"
3. Add: `yourdomain.com` and `www.yourdomain.com`
4. Railway will show DNS records to add

**For Backend:**

1. Go to backend service
2. Click "Settings" → "Custom Domain"
3. Add: `api.yourdomain.com`
4. Railway will show DNS records

#### In Your Domain Registrar:

Add the CNAME records Railway provides:

- `yourdomain.com` → `your-frontend.railway.app`
- `www.yourdomain.com` → `your-frontend.railway.app`
- `api.yourdomain.com` → `your-backend.railway.app`

SSL certificates are **automatic**!

---

## Cost Breakdown

| Resource            | Cost            |
| ------------------- | --------------- |
| Backend Service     | ~$2-3/month     |
| Frontend Service    | ~$2-3/month     |
| PostgreSQL Database | ~$1/month       |
| **Total**           | **~$5-7/month** |

Railway charges by usage (vCPU + RAM), not fixed prices.

**Free Tier:**

- $5 credit per month
- Good for development/testing
- Covers small production apps

---

## Managing Your App

### View Logs

**Backend:**

- Click backend service → "Logs" tab

**Frontend:**

- Click frontend service → "Logs" tab

### Update Code

**Just push to GitHub!**

```bash
git add .
git commit -m "updates"
git push
```

Railway auto-deploys both services.

### View Metrics

Click any service → "Metrics" tab to see:

- CPU usage
- Memory usage
- Network traffic
- Deployment history

---

## Environment Variables

### Add/Edit Variables

1. Click service
2. Go to "Variables" tab
3. Click "+ New Variable"
4. Changes trigger auto-redeploy

### Reference Between Services

```env
# In frontend, reference backend URL:
NEXT_PUBLIC_API_BASE=${{backend.PUBLIC_URL}}/api

# In backend, reference database:
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Railway automatically connects services!

---

## Comparison: Railway vs Others

| Feature                | Railway    | Vercel + DO   | All on Vercel           |
| ---------------------- | ---------- | ------------- | ----------------------- |
| **Ease of Setup**      | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐      | ⭐⭐ (requires rewrite) |
| **Cost**               | $5-7/month | $6/month      | FREE-$20/month          |
| **Backend Support**    | ✅ Full    | ✅ Full       | ⚠️ Serverless only      |
| **Database Included**  | ✅ Yes     | Depends       | ❌ External             |
| **Auto Deploy**        | ✅ Yes     | ✅ Vercel yes | ✅ Yes                  |
| **Code Changes**       | ❌ None    | ❌ None       | ⚠️ Major rewrite        |
| **GitHub Integration** | ✅ Yes     | ✅ Yes        | ✅ Yes                  |

---

## Alternative: Render.com (Similar to Railway)

### Pros:

- Free tier (with limitations)
- Similar to Railway
- PostgreSQL included free

### Cons:

- Free tier spins down after 15 min of inactivity (slow first request)
- Limited free hours per month

### Quick Setup:

1. Go to https://render.com
2. "New" → "Web Service"
3. Connect GitHub → Select repo
4. Configure backend (like Railway)
5. Add PostgreSQL database (free)
6. Add frontend service
7. Done!

---

## My Recommendation

**For Your Use Case:**

### Best Overall: Vercel + Railway Backend

- Frontend: Vercel (FREE, best for Next.js)
- Backend: Railway ($5/month, includes DB)
- **Total: $5/month**
- **Best performance + Easy management**

### All-in-One: Railway

- Everything on Railway
- **Total: $5-7/month**
- **Simplest management (one platform)**

### Budget: Vercel + Render

- Frontend: Vercel (FREE)
- Backend: Render (FREE with cold starts)
- **Total: FREE (with slow first requests)**
- **Good for development/testing**

---

## Deployment Decision Tree

```
Do you want everything on ONE platform?
├─ YES → Use Railway.app ($5-7/month)
│   └─ Pros: Simple, auto-deploys, DB included
│
└─ NO → Use Vercel + Railway Backend ($5/month)
    ├─ Vercel: Frontend (FREE)
    └─ Railway: Backend + DB ($5/month)
    └─ Pros: Best performance, still simple
```

---

## Next Steps

**Choose your platform:**

1. **Railway (all-in-one):**
   - Sign up at railway.app
   - Follow steps above
   - Deploy in 15 minutes

2. **Vercel + Railway:**
   - Deploy backend on Railway (steps above)
   - Deploy frontend on Vercel (2 minutes)
   - Connect via environment variable

Need help with either option? Let me know!
