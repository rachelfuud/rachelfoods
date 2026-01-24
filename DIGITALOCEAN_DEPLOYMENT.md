# DigitalOcean Deployment Guide - RachelFoods

## Overview

This guide covers deploying RachelFoods to DigitalOcean using two methods:

1. **App Platform** (Recommended - Easy, PaaS like Heroku)
2. **Droplet** (VPS - More control, requires Linux knowledge)

---

## Method 1: App Platform (Recommended)

### Prerequisites

- ✅ DigitalOcean account (sign up at digitalocean.com)
- ✅ GitHub repository pushed
- ✅ Credit card for billing (free $200 credit for new users)

### Step-by-Step Deployment

#### **Step 1: Create DigitalOcean Account**

1. Go to https://digitalocean.com
2. Click "Sign Up"
3. Complete registration
4. Add payment method (get $200 free credit with promo)

---

#### **Step 2: Create Database**

1. **In DigitalOcean Dashboard:**
   - Click "Create" → "Databases"
   - Choose **PostgreSQL** (or MySQL if you switched)
   - Select version: **16** (PostgreSQL) or **8** (MySQL)
   - Choose datacenter: **New York** (or closest to you)
   - Select plan: **Basic ($15/month)** or **Development ($7/month)**
   - Name: `rachelfoods-db`
   - Click "Create Database Cluster"

2. **Wait 3-5 minutes** for database to provision

3. **Get Connection String:**
   - Click on your database
   - Go to "Connection Details"
   - Copy the connection string (looks like):
     ```
     postgresql://doadmin:password@db-postgresql-nyc-xxxxx.ondigitalocean.com:25060/defaultdb?sslmode=require
     ```
   - **Save this** - you'll need it!

---

#### **Step 3: Deploy Backend**

1. **Create App:**
   - Click "Create" → "Apps"
   - Connect GitHub account
   - Select repository: `rachelfuud/rachelfoods`
   - Select branch: `main`
   - Click "Next"

2. **Configure Backend Service:**
   - DigitalOcean will auto-detect Node.js
   - **Edit the detected service:**
     - Name: `api`
     - Source Directory: `/backend`
     - Build Command:
       ```bash
       npm ci && npm run build && npx prisma generate
       ```
     - Run Command:
       ```bash
       npx prisma migrate deploy && node dist/src/main.js
       ```
     - HTTP Port: `3001`
     - Instance Size: **Basic ($5/month)**
     - Instance Count: `1`

3. **Add Environment Variables:**
   Click "Environment Variables" and add:

   | Key                     | Value                              | Encrypted |
   | ----------------------- | ---------------------------------- | --------- |
   | `NODE_ENV`              | `production`                       | No        |
   | `PORT`                  | `3001`                             | No        |
   | `DATABASE_URL`          | Your connection string from Step 2 | ✅ Yes    |
   | `JWT_SECRET`            | Generate random 32+ char string    | ✅ Yes    |
   | `JWT_EXPIRATION`        | `7d`                               | No        |
   | `STRIPE_SECRET_KEY`     | Your Stripe live key               | ✅ Yes    |
   | `STRIPE_WEBHOOK_SECRET` | Your webhook secret                | ✅ Yes    |
   | `EMAIL_PROVIDER`        | `console` (or `sendgrid`)          | No        |
   | `ADMIN_EMAIL`           | `admin@yourdomain.com`             | No        |
   | `ADMIN_PASSWORD`        | Strong password                    | ✅ Yes    |

   **Generate JWT_SECRET:**

   ```bash
   # In PowerShell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```

4. **Click "Next"** → Review → **"Create Resources"**

5. **Wait for deployment** (5-10 minutes first time)

6. **Your backend URL will be:**
   ```
   https://rachelfoods-api-xxxxx.ondigitalocean.app/api
   ```

---

#### **Step 4: Deploy Frontend (Option A: DigitalOcean)**

1. **In same app, add component:**
   - Click "Create" → "Component"
   - Type: "Web Service"
   - Source Directory: `/frontend`
   - Build Command:
     ```bash
     npm ci && npm run build
     ```
   - Run Command:
     ```bash
     npm start
     ```
   - HTTP Port: `3000`
   - Instance Size: **Basic ($5/month)**

2. **Add Environment Variable:**
   - `NEXT_PUBLIC_API_BASE` = Your backend URL from Step 3

3. **Your frontend URL:**
   ```
   https://rachelfoods-web-xxxxx.ondigitalocean.app
   ```

---

#### **Step 4: Deploy Frontend (Option B: Vercel - Free)**

**Better option:** Keep frontend on Vercel (free, faster, better for Next.js)

1. In Vercel, update environment variable:
   - `NEXT_PUBLIC_API_BASE` = Your DigitalOcean backend URL
2. Redeploy

---

#### **Step 5: Configure Custom Domain (Optional)**

1. **In DigitalOcean App:**
   - Go to "Settings" → "Domains"
   - Click "Add Domain"
   - Enter: `api.yourdomain.com` (backend)
   - Follow DNS instructions

2. **Add DNS Records:**
   - In your domain registrar (GoDaddy, Namecheap, etc.)
   - Add CNAME record:
     ```
     api.yourdomain.com → rachelfoods-api-xxxxx.ondigitalocean.app
     ```
   - SSL certificate auto-generated

---

#### **Step 6: Verify Deployment**

1. **Test backend:**

   ```bash
   curl https://your-backend-url.ondigitalocean.app/api
   ```

   Should return: `{"message":"RachelFoods API is running"}`

2. **Test products:**

   ```bash
   curl https://your-backend-url.ondigitalocean.app/api/products
   ```

   Should return array of products

3. **Check logs:**
   - In DigitalOcean dashboard
   - Click your app → "Runtime Logs"
   - Verify no errors

---

## Method 2: Droplet (VPS) - Advanced

### When to Use:

- Need more control
- Want to manage everything yourself
- Lower cost for multiple apps
- Comfortable with Linux commands

### Cost:

- **Droplet:** $6/month (1GB RAM)
- **Managed Database:** $15/month
- **OR install database on droplet:** $6/month total

### Quick Setup:

#### **Step 1: Create Droplet**

1. Click "Create" → "Droplets"
2. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic $6/month (1GB RAM)
   - **Datacenter:** New York (or nearest)
   - **Authentication:** SSH key (recommended) or password
3. Name: `rachelfoods-server`
4. Click "Create Droplet"

#### **Step 2: Connect via SSH**

```bash
# Get your droplet IP from DigitalOcean dashboard
ssh root@your.droplet.ip.address
```

#### **Step 3: Install Dependencies**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PostgreSQL (or MySQL)
apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Install certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx
```

#### **Step 4: Setup Database**

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE rachelfoods;
CREATE USER rachelfooduser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE rachelfoods TO rachelfooduser;
\q
```

#### **Step 5: Deploy Application**

```bash
# Create app directory
mkdir -p /var/www/rachelfoods-backend
cd /var/www/rachelfoods-backend

# Clone from GitHub (or upload via SFTP)
git clone https://github.com/rachelfuud/rachelfoods.git .

# Navigate to backend
cd backend

# Install dependencies
npm ci --production

# Build application
npm run build

# Create .env file
nano .env
```

Paste:

```env
DATABASE_URL="postgresql://rachelfooduser:your_secure_password@localhost:5432/rachelfoods?schema=public"
JWT_SECRET="your-long-random-string"
STRIPE_SECRET_KEY="sk_live_your_key"
NODE_ENV=production
PORT=3001
```

Save (Ctrl+X, Y, Enter)

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database
npm run prisma:seed

# Start with PM2
pm2 start dist/src/main.js --name rachelfoods-api
pm2 save
pm2 startup
```

#### **Step 6: Configure Nginx**

```bash
nano /etc/nginx/sites-available/rachelfoods
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

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
}
```

Save and enable:

```bash
ln -s /etc/nginx/sites-available/rachelfoods /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### **Step 7: Setup SSL**

```bash
certbot --nginx -d api.yourdomain.com
```

Follow prompts. SSL will auto-renew.

---

## Comparison: App Platform vs Droplet

| Feature                 | App Platform                | Droplet                       |
| ----------------------- | --------------------------- | ----------------------------- |
| **Ease of Setup**       | ⭐⭐⭐⭐⭐ Very Easy        | ⭐⭐ Requires Linux knowledge |
| **Maintenance**         | Auto-updates                | Manual updates                |
| **Scaling**             | One-click                   | Manual configuration          |
| **Cost (Backend only)** | $5-20/month                 | $6/month                      |
| **SSL Certificate**     | Auto                        | Manual (certbot)              |
| **GitHub Integration**  | ✅ Built-in                 | ❌ Manual setup               |
| **Auto-deploy**         | ✅ Yes                      | ❌ Need CI/CD                 |
| **Monitoring**          | ✅ Built-in                 | ❌ Install separately         |
| **Backups**             | ✅ Automatic                | ❌ Manual setup               |
| **Best For**            | Quick deployment, beginners | Control, multiple apps, cost  |

---

## Recommended Setup

### **For Most Users:**

- ✅ **Backend:** DigitalOcean App Platform ($5/month)
- ✅ **Frontend:** Vercel (free)
- ✅ **Database:** DigitalOcean Managed Database ($15/month) OR PlanetScale (free tier)
- **Total:** $5-20/month

### **For Advanced Users:**

- ✅ **Everything:** DigitalOcean Droplet ($6/month)
- Install PostgreSQL/MySQL on droplet
- Host backend + database on same server
- Use PM2 + Nginx
- **Total:** $6/month

---

## Database Alternatives (Save Money)

### **Free/Cheap Options:**

1. **PlanetScale (MySQL)** - Free tier
   - 1 database, 5GB storage
   - Perfect for development/small apps
   - https://planetscale.com

2. **Supabase (PostgreSQL)** - Free tier
   - 500MB database
   - Good for getting started
   - https://supabase.com

3. **Railway** - $5/month
   - Includes PostgreSQL
   - Host backend + database
   - https://railway.app

---

## Next Steps

1. **Choose your method:**
   - App Platform (recommended for beginners)
   - Droplet (for advanced users)

2. **Follow the steps** in order

3. **Test your deployment**

4. **Update your frontend** to point to new backend URL

5. **Setup custom domain** (optional)

---

## Need Help?

Let me know which method you want to use and I can help with:

- Specific configuration issues
- Environment variable setup
- Database connection problems
- SSL certificate setup
- Custom domain configuration
