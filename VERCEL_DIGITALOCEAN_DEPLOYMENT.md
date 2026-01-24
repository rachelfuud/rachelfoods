# Deploy Frontend on Vercel + Backend on DigitalOcean

# Best Value: Frontend FREE + Backend $5-6/month

## Why This Setup?

✅ **Vercel for Frontend:**

- FREE for personal projects
- Optimized for Next.js (your frontend framework)
- Automatic deployments from GitHub
- Global CDN (faster worldwide)
- Free SSL certificates
- No server management

✅ **DigitalOcean for Backend:**

- Simple Node.js hosting
- Full control over backend
- Database included (on Droplet) or separate
- Only $5-6/month

---

## Architecture

```
Frontend (Vercel - FREE)
    ↓
    API Calls
    ↓
Backend (DigitalOcean - $5-6/month)
    ↓
Database (PostgreSQL/MySQL)
```

---

## Two Options for Backend on DigitalOcean

### Option A: Droplet (VPS) - $6/month ⭐ Recommended

- Backend + Database on same server
- More control
- Better value if you need database
- **Choose this if:** You want everything in one place

### Option B: App Platform - $5/month + $15 for DB

- Easier setup (like Heroku)
- Auto-deployments from GitHub
- No server management
- **Choose this if:** You want easiest setup and can afford $20/month total

**I recommend Option A (Droplet) for best value.**

---

# OPTION A: DROPLET DEPLOYMENT ($6/month)

## Step 1: Deploy Backend to DigitalOcean Droplet

### 1.1 Create Droplet

1. Go to https://digitalocean.com
2. Sign up (get $200 free credit)
3. Click "Create" → "Droplets"
4. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic $6/month (1GB RAM)
   - **Datacenter:** New York (or nearest)
   - **Authentication:** SSH key or password
5. Name: `rachelfoods-backend`
6. Click "Create Droplet"
7. Copy your droplet's IP address

### 1.2 Connect to Server

```bash
# Windows PowerShell or use PuTTY
ssh root@YOUR_DROPLET_IP
```

### 1.3 Install Requirements

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (keeps backend running)
npm install -g pm2

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx (web server)
apt install -y nginx

# Install Git
apt install -y git

# Install SSL tool
apt install -y certbot python3-certbot-nginx
```

### 1.4 Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Run these commands:
CREATE DATABASE rachelfoods;
CREATE USER rachelfooduser WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE rachelfoods TO rachelfooduser;
ALTER DATABASE rachelfoods OWNER TO rachelfooduser;
\q
```

### 1.5 Deploy Backend Code

```bash
# Create directory
mkdir -p /var/www/rachelfoods-backend
cd /var/www/rachelfoods-backend

# Clone repository (backend only)
git clone https://github.com/rachelfuud/rachelfoods.git .

# Navigate to backend folder
cd backend

# Install dependencies
npm ci --production

# Build application
npm run build

# Create .env file
nano .env
```

Paste this (update values):

```env
DATABASE_URL="postgresql://rachelfooduser:YourSecurePassword123!@localhost:5432/rachelfoods?schema=public"
JWT_SECRET="your-very-long-random-string-minimum-32-characters-abc123"
JWT_EXPIRATION="7d"
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
EMAIL_PROVIDER="console"
NODE_ENV="production"
PORT=3001
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="SecureAdminPassword123!"
```

Save: Ctrl+X, Y, Enter

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database
npm run prisma:seed

# Start with PM2
pm2 start dist/src/main.js --name rachelfoods-api
pm2 save
pm2 startup
# Run the command it shows
```

### 1.6 Configure Nginx (for API access)

```bash
nano /etc/nginx/sites-available/rachelfoods-api
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;  # or use your IP initially

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

Save and enable:

```bash
ln -s /etc/nginx/sites-available/rachelfoods-api /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 1.7 Setup Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### 1.8 Configure DNS (Optional - or use IP)

**Option 1: Use Subdomain**
In your domain registrar, add:

- Type: `A`
- Name: `api`
- Value: `YOUR_DROPLET_IP`
- TTL: `3600`

Result: `api.yourdomain.com`

**Option 2: Just use IP for now**
Your backend URL: `http://YOUR_DROPLET_IP`

### 1.9 Setup SSL (if using domain)

```bash
# Wait for DNS to propagate (5-60 minutes)
certbot --nginx -d api.yourdomain.com

# Follow prompts, choose redirect HTTP to HTTPS
```

### 1.10 Test Backend

```bash
# Test locally
curl http://localhost:3001/api

# Test via domain (if configured)
curl http://api.yourdomain.com/api

# Or test via IP
curl http://YOUR_DROPLET_IP/api
```

Should return: `{"message":"RachelFoods API is running"}`

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Frontend

Your frontend is already on GitHub, so we just need to configure it.

### 2.2 Sign Up for Vercel

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel

### 2.3 Import Project

1. Click "Add New" → "Project"
2. Find your repository: `rachelfuud/rachelfoods`
3. Click "Import"

### 2.4 Configure Project

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** Click "Edit" and enter: `frontend`

**Build Settings:**

- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**Environment Variables:**
Click "Add" and enter:

- Key: `NEXT_PUBLIC_API_BASE`
- Value: `https://api.yourdomain.com` (or `http://YOUR_DROPLET_IP`)

### 2.5 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Your site will be live at: `https://rachelfoods-xxxxx.vercel.app`

### 2.6 Test Everything

Visit your Vercel URL and:

- ✅ Homepage loads
- ✅ Products display (fetched from DO backend)
- ✅ All features work

### 2.7 Configure Custom Domain (Optional)

**In Vercel:**

1. Go to Project Settings → Domains
2. Add your domain: `yourdomain.com`
3. Follow DNS instructions

**In your domain registrar:**
Add these records:

- Type: `A` Name: `@` Value: `76.76.21.21` (Vercel's IP)
- Type: `CNAME` Name: `www` Value: `cname.vercel-dns.com`

Wait 5-60 minutes for DNS propagation.

---

# OPTION B: APP PLATFORM DEPLOYMENT ($5/month + DB)

## Step 1: Deploy Backend to App Platform

### 1.1 Create Database (Optional - skip if using external DB)

1. In DigitalOcean Dashboard
2. Click "Create" → "Databases"
3. Choose PostgreSQL 16
4. Select $15/month plan (or use free PlanetScale MySQL)
5. Name: `rachelfoods-db`
6. Click "Create"
7. Wait 3-5 minutes
8. Copy connection string

### 1.2 Create App

1. Click "Create" → "Apps"
2. Connect GitHub
3. Select repo: `rachelfuud/rachelfoods`
4. Select branch: `main`
5. Click "Next"

### 1.3 Configure Backend Service

**Edit detected service:**

- Name: `api`
- Source Directory: `/backend`
- Build Command:
  ```
  npm ci && npm run build && npx prisma generate
  ```
- Run Command:
  ```
  npx prisma migrate deploy && node dist/src/main.js
  ```
- HTTP Port: `3001`
- Instance Size: Basic ($5/month)

### 1.4 Add Environment Variables

| Key                     | Value                     | Encrypted |
| ----------------------- | ------------------------- | --------- |
| `NODE_ENV`              | `production`              | No        |
| `PORT`                  | `3001`                    | No        |
| `DATABASE_URL`          | Your DB connection string | Yes       |
| `JWT_SECRET`            | Random 32+ char string    | Yes       |
| `JWT_EXPIRATION`        | `7d`                      | No        |
| `STRIPE_SECRET_KEY`     | Your Stripe key           | Yes       |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret            | Yes       |
| `EMAIL_PROVIDER`        | `console`                 | No        |
| `ADMIN_EMAIL`           | Your email                | No        |
| `ADMIN_PASSWORD`        | Secure password           | Yes       |

### 1.5 Deploy

1. Click "Next" → Review → "Create Resources"
2. Wait 5-10 minutes
3. Backend URL: `https://rachelfoods-api-xxxxx.ondigitalocean.app`

## Step 2: Deploy Frontend to Vercel

Follow same steps as Option A, Step 2.

---

## Cost Comparison

| Setup                                      | Monthly Cost | Pros                                        |
| ------------------------------------------ | ------------ | ------------------------------------------- |
| **Vercel + DO Droplet** ⭐                 | **$6**       | Best value, full control, DB included       |
| **Vercel + DO App Platform + Managed DB**  | **$20**      | Easiest, auto-updates, no server management |
| **Vercel + DO App Platform + PlanetScale** | **$5**       | Cheapest, but free DB has limits            |

---

## Managing Your Setup

### Update Backend Code (Droplet)

```bash
ssh root@YOUR_DROPLET_IP
cd /var/www/rachelfoods-backend/backend
git pull
npm ci --production
npm run build
npx prisma generate
npx prisma migrate deploy
pm2 restart rachelfoods-api
```

### Update Backend Code (App Platform)

Just push to GitHub - auto-deploys!

### Update Frontend Code

Just push to GitHub - Vercel auto-deploys!

### View Logs

**Backend (Droplet):**

```bash
pm2 logs rachelfoods-api
```

**Backend (App Platform):**

- In DO Dashboard → Your App → "Runtime Logs"

**Frontend:**

- In Vercel Dashboard → Your Project → "Deployments" → Click deployment → "Logs"

---

## Environment Variables Management

### Frontend (Vercel)

Add/edit in: Project Settings → Environment Variables

Remember: Changes require redeploy (auto-happens on next git push)

### Backend (Droplet)

Edit `/var/www/rachelfoods-backend/backend/.env`
Then: `pm2 restart rachelfoods-api`

### Backend (App Platform)

Edit in: App → Settings → Environment Variables
Changes trigger auto-redeploy

---

## Connecting Frontend to Backend

Your frontend API calls already use this in `frontend/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://rachelfood-backend.onrender.com/api";
```

Just set `NEXT_PUBLIC_API_BASE` in Vercel environment variables to your DigitalOcean backend URL.

---

## Security Checklist

✅ Use HTTPS for backend (SSL certificate)
✅ Use strong passwords for database
✅ Keep JWT_SECRET secret (32+ characters)
✅ Use Stripe LIVE keys (not test) in production
✅ Enable firewall on Droplet
✅ Regularly update system: `apt update && apt upgrade`
✅ Monitor logs for errors
✅ Setup database backups

---

## Troubleshooting

### Frontend can't connect to backend

**Check:**

1. `NEXT_PUBLIC_API_BASE` set correctly in Vercel?
2. Backend is running? (visit backend URL in browser)
3. CORS configured? (should be - already in backend)
4. Using HTTPS for backend URL?

**Test:**

```bash
curl https://your-backend-url/api
```

### Backend not responding

**Droplet:**

```bash
pm2 status
pm2 logs rachelfoods-api
systemctl status nginx
```

**App Platform:**
Check "Runtime Logs" in DO Dashboard

### Database connection failed

**Check DATABASE_URL:**

- Correct username/password?
- Correct host and port?
- Database created?
- User has permissions?

---

## Recommended Setup Summary

**For Best Value ($6/month):**

1. ✅ Frontend: Vercel (FREE)
2. ✅ Backend: DigitalOcean Droplet ($6/month)
3. ✅ Database: PostgreSQL on same Droplet (included)
4. ✅ SSL: Free (Let's Encrypt)

**Total: $6/month for everything**

**For Easiest Setup ($5/month):**

1. ✅ Frontend: Vercel (FREE)
2. ✅ Backend: DO App Platform ($5/month)
3. ✅ Database: PlanetScale MySQL (FREE tier)
4. ✅ SSL: Free (included)

**Total: $5/month**

---

## Next Steps

1. **Choose your option:**
   - Option A: Droplet ($6/month) - Best value
   - Option B: App Platform ($5-20/month) - Easiest

2. **Deploy backend first** (follow steps above)

3. **Deploy frontend to Vercel** (follow steps above)

4. **Test everything works**

5. **Configure custom domain** (optional)

6. **Done!** 🎉

---

## Getting Help

- **DigitalOcean Docs:** https://docs.digitalocean.com
- **Vercel Docs:** https://vercel.com/docs
- **Need help?** Let me know which step you're stuck on!
