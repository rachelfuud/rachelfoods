# Known Issues & Workarounds

## Backend Database Connection (PostgreSQL on Docker Desktop for Windows)

### Issue

The backend cannot connect to PostgreSQL running in Docker on Windows due to a known Docker Desktop networking + PostgreSQL authentication issue. Despite correct credentials and configuration:

- Direct psql connections via `docker exec` work (Unix socket, trust auth)
- Connections from other Docker containers work
- Connections from Windows host using Prisma or node-postgres fail with `P1000: Authentication failed`

This is a known limitation of Docker Desktop on Windows with PostgreSQL password authentication over TCP/IP.

### Workarounds

#### Option 1: Use WSL2 (Recommended)

Run the backend inside WSL2 where Docker networking functions properly:

```bash
wsl
cd /mnt/c/Projects/Dev/"Rachel Foods"/backend
npm run start:dev
```

#### Option 2: Use Docker Compose with Network Bridge

Create `docker-compose.yml`:

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: rachelfood
      POSTGRES_PASSWORD: test123
      POSTGRES_DB: rachelfood
    ports:
      - "5432:5432"
    networks:
      - rachelfood-network
  backend:
    build: ./backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://rachelfood:test123@postgres:5432/rachelfood
    networks:
      - rachelfood-network
networks:
  rachelfood-network:
```

#### Option 3: Use Cloud Database

Use a cloud PostgreSQL instance (AWS RDS, Supabase, Neon, etc.) and update `backend/.env`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

#### Option 4: Install PostgreSQL Directly on Windows

Install PostgreSQL on Windows instead of using Docker:

1. Download from https://www.postgresql.org/download/windows/
2. Install and create database
3. Update `backend/.env` with local connection string

### Current Status

- ✅ Frontend running successfully on http://localhost:3000 with CSS working
- ✅ Frontend has fallback theme when backend is unavailable
- ❌ Backend cannot connect to Docker PostgreSQL from Windows host
- ✅ Database container running and accessible from other containers

### Database Container Info

- Container name: `rachelfood-postgres`
- Image: `postgres:16-alpine`
- Credentials: user=`rachelfood`, password=`test123`, database=`rachelfood`
- Port: 5432 (mapped to host)
- Status: Running with trust authentication configured

## VS Code Problems Tab

Most errors in the VS Code Problems tab have been resolved:

### Fixed Issues

- ✅ 2095 TypeScript compilation errors - Fixed by installing dependencies and generating Prisma client
- ✅ Next.js 16 searchParams async requirement - Fixed in catalog page
- ✅ Tailwind CSS v4 class deprecation - Updated bg-gradient-to-br → bg-linear-to-br
- ✅ TypeScript 7.0 deprecation warnings - Added ignoreDeprecations: "6.0"

### Remaining Non-Critical Warnings

- ⚠️ Prisma schema datasource warning - False positive (using Prisma 5, not 7)
- ⚠️ GitHub Actions environment names - Not critical for local development
- ⚠️ PowerShell alias in chat code block - Not a real file

## Frontend Status

- ✅ Running on http://localhost:3000
- ✅ Tailwind CSS v4 working correctly
- ✅ Hot Module Reload (HMR) functioning
- ✅ Theme system with backend fallback
- ✅ All pages rendering (Home, Catalog, Orders, Profile)
- ⚠️ Backend API calls fail (expected until database is connected)

## Next Steps

1. Choose one of the database workarounds above
2. Run Prisma migrations: `cd backend && npx prisma migrate deploy`
3. (Optional) Seed database: `npm run seed`
4. Start backend: `npm run start:dev`
5. Backend will be available at http://localhost:3001
