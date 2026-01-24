# Deploy Both Frontend & Backend on Single DigitalOcean Droplet

# Cost: $6/month for everything

## Step 1: Create Droplet

1. Go to DigitalOcean Dashboard
2. Click "Create" → "Droplets"
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic $6/month (1GB RAM, 25GB SSD)
   - **Datacenter:** New York (or nearest to you)
   - **Authentication:** SSH key or password
4. Name: rachelfoods-server
5. Click "Create Droplet"
6. Wait 1 minute for creation
7. Copy your droplet's IP address

---

## Step 2: Connect to Server

# Windows (PowerShell):

ssh root@YOUR_DROPLET_IP

# Enter password when prompted (if using password auth)

---

## Step 3: Install Everything

# Update system

apt update && apt upgrade -y

# Install Node.js 20

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation

node --version # Should show v20.x.x
npm --version

# Install PM2 (keeps backend running)

npm install -g pm2

# Install Nginx (web server)

apt install -y nginx

# Install PostgreSQL

apt install -y postgresql postgresql-contrib

# Or install MySQL instead:

# apt install -y mysql-server

# Install Git

apt install -y git

# Install SSL certificate tool

apt install -y certbot python3-certbot-nginx

---

## Step 4: Setup Database

### For PostgreSQL:

# Switch to postgres user

sudo -u postgres psql

# In PostgreSQL shell, run these commands:

CREATE DATABASE rachelfoods;
CREATE USER rachelfooduser WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE rachelfoods TO rachelfooduser;
ALTER DATABASE rachelfoods OWNER TO rachelfooduser;
\q

### For MySQL (if you chose MySQL):

# sudo mysql

# CREATE DATABASE rachelfoods;

# CREATE USER 'rachelfooduser'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';

# GRANT ALL PRIVILEGES ON rachelfoods.\* TO 'rachelfooduser'@'localhost';

# FLUSH PRIVILEGES;

# EXIT;

---

## Step 5: Deploy Backend

# Create directory

mkdir -p /var/www/rachelfoods
cd /var/www/rachelfoods

# Clone your repository

git clone https://github.com/rachelfuud/rachelfoods.git .

# Navigate to backend

cd backend

# Install dependencies

npm ci --production

# Build the application

npm run build

# Create environment file

nano .env

# Paste this (update values):

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

# Save: Ctrl+X, then Y, then Enter

# Generate Prisma Client

npx prisma generate

# Run database migrations

npx prisma migrate deploy

# Seed the database

npm run prisma:seed

# Start backend with PM2

pm2 start dist/src/main.js --name rachelfoods-api
pm2 save
pm2 startup

# Copy the command it shows and run it

# It will look like: sudo env PATH=$PATH:/usr/bin...

---

## Step 6: Build & Deploy Frontend

# Navigate to frontend directory

cd /var/www/rachelfoods/frontend

# Create environment file

nano .env.production

# Paste:

NEXT_PUBLIC_API_BASE=/api

# Save: Ctrl+X, then Y, then Enter

# Install dependencies

npm ci

# Build for production (this creates optimized static files)

npm run build

# Test the build

npm start &

# Press Ctrl+C after verifying it works

---

## Step 7: Configure Nginx (Serves Both Frontend & Backend)

# Create Nginx configuration

nano /etc/nginx/sites-available/rachelfoods

# Paste this configuration:

server {
listen 80;
server_name yourdomain.com www.yourdomain.com;

    # Frontend - Serve Next.js static files
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API - Proxy to Node.js backend
    location /api {
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

    # Increase upload size for images
    client_max_body_size 10M;

}

# Save: Ctrl+X, then Y, then Enter

# Enable the site

ln -s /etc/nginx/sites-available/rachelfoods /etc/nginx/sites-enabled/

# Remove default site

rm /etc/nginx/sites-enabled/default

# Test configuration

nginx -t

# If test passes, restart Nginx

systemctl restart nginx

---

## Step 8: Start Frontend with PM2

cd /var/www/rachelfoods/frontend

# Start frontend

pm2 start npm --name rachelfoods-web -- start

# Save PM2 configuration

pm2 save

---

## Step 9: Setup Firewall

# Allow SSH, HTTP, and HTTPS

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Type 'y' and press Enter when prompted

---

## Step 10: Configure Domain (Point to Droplet)

### In Your Domain Registrar (GoDaddy, Namecheap, etc.):

Add these DNS records:

| Type | Name | Value           | TTL  |
| ---- | ---- | --------------- | ---- |
| A    | @    | YOUR_DROPLET_IP | 3600 |
| A    | www  | YOUR_DROPLET_IP | 3600 |

Wait 5-60 minutes for DNS propagation.

---

## Step 11: Setup Free SSL Certificate

# Once DNS is pointing to your droplet:

certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:

# - Enter your email

# - Agree to terms (Y)

# - Choose option 2: Redirect HTTP to HTTPS

# Certificate will auto-renew every 90 days

---

## Step 12: Verify Everything Works

# Check if backend is running

curl http://localhost:3001/api

# Should return: {"message":"RachelFoods API is running"}

# Check if frontend is running

curl http://localhost:3000

# Should return HTML

# Check via domain (after DNS propagates)

curl https://yourdomain.com/api

# Should return: {"message":"RachelFoods API is running"}

# Visit in browser:

https://yourdomain.com

---

## Management Commands

### View Running Services:

pm2 status

### View Logs:

# Backend logs

pm2 logs rachelfoods-api

# Frontend logs

pm2 logs rachelfoods-web

# Nginx logs

tail -f /var/log/nginx/error.log

### Restart Services:

# Restart backend

pm2 restart rachelfoods-api

# Restart frontend

pm2 restart rachelfoods-web

# Restart Nginx

systemctl restart nginx

### Update Code (When You Push Changes):

cd /var/www/rachelfoods

# Pull latest changes

git pull

# Update backend

cd backend
npm ci --production
npm run build
npx prisma generate
npx prisma migrate deploy
pm2 restart rachelfoods-api

# Update frontend

cd ../frontend
npm ci
npm run build
pm2 restart rachelfoods-web

---

## Monitoring & Maintenance

### Check Server Resources:

htop # Install: apt install htop

### Check Disk Space:

df -h

### Check PM2 Processes:

pm2 monit

### Database Backup (PostgreSQL):

pg*dump -U rachelfooduser rachelfoods > backup*$(date +%Y%m%d).sql

### Database Backup (MySQL):

mysqldump -u rachelfooduser -p rachelfoods > backup\_$(date +%Y%m%d).sql

---

## Cost Breakdown

| Item                     | Cost         |
| ------------------------ | ------------ |
| Droplet (1GB RAM)        | $6/month     |
| Bandwidth (1TB included) | $0           |
| Backups (optional)       | $1.20/month  |
| **Total**                | **$6/month** |

---

## Upgrading Resources (If Needed)

If your app grows and needs more resources:

1. **Resize Droplet:**
   - In DigitalOcean dashboard
   - Click droplet → "Resize"
   - Choose bigger plan (2GB = $12/month, 4GB = $24/month)
   - Click "Resize"

2. **Add More Droplets:**
   - Create separate database droplet
   - Load balance across multiple app droplets

---

## Troubleshooting

### Backend not responding:

pm2 status
pm2 logs rachelfoods-api

# Check for errors

### Frontend not loading:

pm2 logs rachelfoods-web

# Check for errors

### Nginx errors:

nginx -t
tail -f /var/log/nginx/error.log

### Database connection failed:

# Check database is running

sudo systemctl status postgresql # or mysql

# Test connection

psql -U rachelfooduser -d rachelfoods -h localhost

# Or: mysql -u rachelfooduser -p rachelfoods

### Out of memory:

# Check memory usage

free -h

# Restart services

pm2 restart all

# Consider upgrading to 2GB droplet

---

## Security Best Practices

1. **Change SSH Port:**
   nano /etc/ssh/sshd_config

   # Change Port 22 to Port 2222

   systemctl restart sshd
   ufw allow 2222/tcp

2. **Disable Root Login:**

   # Create new user first

   adduser yourname
   usermod -aG sudo yourname

   # Then disable root

   nano /etc/ssh/sshd_config

   # Set: PermitRootLogin no

3. **Keep System Updated:**
   apt update && apt upgrade -y

4. **Monitor Logs:**
   apt install fail2ban
   systemctl enable fail2ban

---

## Summary

✅ **Single server hosts:**

- Backend Node.js API (port 3001)
- Frontend Next.js app (port 3000)
- PostgreSQL/MySQL database
- Nginx reverse proxy

✅ **All accessible via:**

- https://yourdomain.com → Frontend
- https://yourdomain.com/api → Backend

✅ **Total cost:** $6/month

✅ **Easy updates:** Just git pull and restart PM2
