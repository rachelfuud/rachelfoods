# RachelFoods Backend - Deployment Configuration Guide

## Node.js Hosting Configuration

### Required Information for Your Hosting Provider:

#### 1. **Node.js Version**

```
v18.x or higher (recommended: v20.x)
```

_Check the `@types/node` version in package.json - currently using Node 25 types, but v18+ works fine_

---

#### 2. **Application Mode (NODE_ENV)**

```
production
```

_This sets the `NODE_ENV` environment variable for production optimization_

---

#### 3. **Application Root (Physical Path)**

```
/home/yourusername/rachelfoods-backend
```

_Or wherever your hosting provider stores applications. Upload ALL files from the `backend` folder here, including:_

- `package.json`
- `package-lock.json`
- `dist/` folder (compiled code)
- `prisma/` folder (schema and migrations)
- `node_modules/` (will be installed by hosting)
- `.env` file (create from `.env.example`)

---

#### 4. **Application URL**

```
https://yourdomain.com/api
```

_Or if it's a subdomain:_

```
https://api.yourdomain.com
```

---

#### 5. **Application Startup File**

```
dist/src/main.js
```

_This is the compiled entry point of your NestJS application_

---

## Pre-Deployment Checklist

### Step 1: Build the Application Locally

```bash
cd "c:\Projects\Dev\Rachel Foods\backend"
npm run build
```

_This creates the `dist` folder with compiled JavaScript_

### Step 2: Prepare Environment Variables

Create a `.env` file on the server with:

```env
# Database (REQUIRED - Get from your hosting provider's PostgreSQL service)
DATABASE_URL="postgresql://username:password@host:5432/dbname?schema=public"

# JWT Authentication (REQUIRED - Change these!)
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long"
JWT_EXPIRATION="7d"

# Stripe Payment (REQUIRED for payments)
STRIPE_SECRET_KEY="sk_live_your_actual_stripe_live_key"
STRIPE_WEBHOOK_SECRET="whsec_your_actual_webhook_secret"

# Email Provider (Optional but recommended)
EMAIL_PROVIDER="sendgrid"  # or mailgun, ses
SENDGRID_API_KEY="your_sendgrid_api_key"

# Application Configuration
PORT=3001
NODE_ENV=production

# Admin Account (for initial setup)
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="ChangeThisSecurePassword123!"

# Error Tracking (Optional)
SENTRY_DSN="your_sentry_dsn_for_error_tracking"
```

### Step 3: Upload Files to Server

Upload these files/folders to your Application Root:

- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `dist/` (entire folder with compiled code)
- ✅ `prisma/` (schema and migrations)
- ✅ `.env` (your production environment variables)
- ✅ `node_modules/` (or let hosting provider install)

**DO NOT UPLOAD:**

- ❌ `src/` (source TypeScript - not needed in production)
- ❌ `test/` (tests - not needed in production)
- ❌ `.git/` (git history)
- ❌ `node_modules/` (if hosting provider auto-installs)

### Step 4: Install Dependencies on Server

Your hosting provider should run:

```bash
npm ci --only=production
```

### Step 5: Run Database Migrations

After deployment, run this command on the server:

```bash
npx prisma migrate deploy
```

### Step 6: Seed the Database (First Time Only)

```bash
npm run prisma:seed
```

---

## Alternative: Package Everything for Upload

If you need to create a complete package:

### Create Deployment Package

```bash
# 1. Build the application
npm run build

# 2. Create a deployment folder
mkdir deploy
xcopy /E /I dist deploy\dist
xcopy /E /I prisma deploy\prisma
copy package.json deploy\
copy package-lock.json deploy\
copy .env.example deploy\.env.example

# 3. Zip the deploy folder
# (Use Windows compression or 7-Zip)

# 4. Upload deploy.zip to your server
# 5. Unzip on server
# 6. Create .env file with production values
# 7. Run: npm ci --only=production
# 8. Run: npx prisma migrate deploy
# 9. Run: npm run prisma:seed (first time)
# 10. Start: node dist/src/main.js
```

---

## Hosting Provider Specific Instructions

### For cPanel with Node.js Selector:

1. **Setup Application:**
   - Node.js Version: `18` or `20`
   - Application mode: `production`
   - Application root: `/home/username/rachelfoods-backend`
   - Application URL: `https://yourdomain.com`
   - Application startup file: `dist/src/main.js`

2. **Upload files via File Manager or FTP**

3. **Install dependencies:** Click "Run NPM Install" in cPanel

4. **Configure Environment Variables:** Add in cPanel's Node.js app settings

5. **Run migrations:** Use Terminal in cPanel:

   ```bash
   cd ~/rachelfoods-backend
   npx prisma migrate deploy
   npm run prisma:seed
   ```

6. **Start/Restart Application:** Click "Restart" in Node.js app manager

### For VPS (DigitalOcean, Linode, etc.):

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Upload files
scp -r backend/ user@server:/var/www/rachelfoods-backend/

# On server
cd /var/www/rachelfoods-backend
npm ci --only=production
npx prisma migrate deploy
npm run prisma:seed

# Use PM2 to keep it running
sudo npm install -g pm2
pm2 start dist/src/main.js --name rachelfoods-backend
pm2 startup
pm2 save
```

---

## Testing After Deployment

1. **Check if server is running:**

   ```bash
   curl https://yourdomain.com/api
   ```

   Should return: `{"message":"RachelFoods API is running"}`

2. **Test products endpoint:**

   ```bash
   curl https://yourdomain.com/api/products
   ```

   Should return array of products

3. **Test health check:**
   ```bash
   curl https://yourdomain.com/api/health/db
   ```

---

## Common Issues & Solutions

### Issue: "Cannot find module 'dist/src/main'"

**Solution:** Make sure you ran `npm run build` before uploading

### Issue: "Database connection failed"

**Solution:** Check DATABASE_URL in .env file matches your PostgreSQL credentials

### Issue: "Port 3001 already in use"

**Solution:** Change PORT in .env file or free up port 3001

### Issue: "Prisma Client not generated"

**Solution:** Run `npx prisma generate` after deployment

---

## Quick Reference

| Setting       | Value                     |
| ------------- | ------------------------- |
| Node Version  | `18.x+` or `20.x`         |
| App Mode      | `production`              |
| Startup File  | `dist/src/main.js`        |
| Port          | `3001` (or as configured) |
| Build Command | `npm run build`           |
| Start Command | `node dist/src/main.js`   |

---

## Need Help?

- Check logs on your hosting provider's dashboard
- Ensure `.env` file has correct DATABASE_URL
- Verify all dependencies installed: `npm list`
- Test locally first: `npm run start:prod`
