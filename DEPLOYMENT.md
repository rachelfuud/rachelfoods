# Remote Deployment Guide

## Prerequisites

- Node.js 18+ (or 22+ recommended)
- PostgreSQL 16+
- Git

## Quick Deploy

### 1. Clone Repository

```bash
git clone https://github.com/phelmye/RachelFoods.git
cd RachelFoods
```

### 2. Setup PostgreSQL Database

```bash
# Using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE rachelfood;"
psql -U postgres -c "CREATE USER rachelfood WITH PASSWORD 'your-secure-password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rachelfood TO rachelfood;"
```

### 3. Configure Backend

```bash
cd backend

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://rachelfood:your-secure-password@localhost:5432/rachelfood?schema=public"
JWT_SECRET="your-jwt-secret-change-in-production"
JWT_EXPIRATION="7d"
PORT=3001
NODE_ENV=production
EOF

# Install dependencies
npm install

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Build
npm run build

# Start backend (production)
npm run start:prod

# OR start backend (development with hot-reload)
npm run start:dev
```

### 4. Configure Frontend

```bash
cd ../frontend

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF

# Install dependencies
npm install

# Build for production
npm run build

# Start frontend (production)
npm start

# OR start frontend (development)
npm run dev
```

## Using Docker (Alternative - Recommended for Remote)

### 1. Create docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: rachelfood
      POSTGRES_PASSWORD: rachelfood
      POSTGRES_DB: rachelfood
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - rachelfood-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://rachelfood:rachelfood@postgres:5432/rachelfood?schema=public
      JWT_SECRET: your-jwt-secret-change-in-production
      JWT_EXPIRATION: 7d
      PORT: 3001
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    networks:
      - rachelfood-network
    command: sh -c "npx prisma migrate deploy && npm run start:prod"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - rachelfood-network

networks:
  rachelfood-network:
    driver: bridge

volumes:
  postgres_data:
```

### 2. Create Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
COPY prisma ./prisma

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

### 3. Create Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 4. Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Cloud Deployment Options

### Vercel (Frontend) + Railway/Render (Backend)

**Frontend on Vercel:**

1. Connect GitHub repository to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/.next`
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.com/api`

**Backend on Railway:**

1. Connect GitHub repository to Railway
2. Set root directory: `backend`
3. Add PostgreSQL database from Railway services
4. Set environment variables:
   - `DATABASE_URL` (auto-provided by Railway)
   - `JWT_SECRET`
   - `PORT=3001`
5. Set start command: `npx prisma migrate deploy && npm run start:prod`

### AWS EC2 / DigitalOcean / Linode

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Setup database
sudo -u postgres psql -c "CREATE DATABASE rachelfood;"
sudo -u postgres psql -c "CREATE USER rachelfood WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rachelfood TO rachelfood;"

# Clone and deploy
git clone https://github.com/phelmye/RachelFoods.git
cd RachelFoods

# Follow steps 3 and 4 from "Quick Deploy" above

# Setup PM2 for process management
sudo npm install -g pm2

# Start backend with PM2
cd backend
pm2 start npm --name "rachelfood-backend" -- run start:prod

# Start frontend with PM2
cd ../frontend
pm2 start npm --name "rachelfood-frontend" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

## Setup Nginx Reverse Proxy (Optional)

```nginx
# /etc/nginx/sites-available/rachelfood

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/rachelfood /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Verification

After deployment, verify:

1. **Backend Health Check:**

   ```bash
   curl http://localhost:3001/api
   # Should return: {"message": "RachelFoods API is running"}
   ```

2. **Database Connection:**

   ```bash
   curl http://localhost:3001/api/health/db
   # Should return: {"status": "ok", "database": "connected"}
   ```

3. **Frontend:**
   Open browser to `http://localhost:3000` or your domain

## Troubleshooting

**Database connection fails:**

- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify DATABASE_URL is correct
- Check PostgreSQL allows connections in `pg_hba.conf`

**Frontend can't reach backend:**

- Update `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Check backend is running: `curl http://localhost:3001/api`
- Verify CORS is enabled for your domain

**Build fails:**

- Ensure Node.js 18+ is installed: `node --version`
- Clear caches: `rm -rf node_modules package-lock.json && npm install`
- Check logs: `npm run build 2>&1 | tee build.log`

## Production Checklist

- [ ] Change all default passwords and secrets
- [ ] Set `NODE_ENV=production`
- [ ] Setup SSL/TLS certificates (Let's Encrypt)
- [ ] Configure database backups
- [ ] Setup monitoring (PM2, New Relic, DataDog)
- [ ] Configure log rotation
- [ ] Setup firewall rules
- [ ] Enable database SSL connections
- [ ] Setup CDN for static assets (Cloudflare, AWS CloudFront)
- [ ] Configure rate limiting
- [ ] Setup error tracking (Sentry)

## Current Repository

**GitHub:** https://github.com/phelmye/RachelFoods.git

**Latest Commit:** All fixes applied including:

- ✅ Tailwind CSS v4 configuration
- ✅ Next.js 16 async searchParams
- ✅ TypeScript error fixes
- ✅ Theme fallback implementation
- ✅ Database migrations (14 migrations included)
